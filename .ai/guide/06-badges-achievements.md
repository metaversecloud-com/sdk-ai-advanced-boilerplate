# Phase 6: Badges and Achievements

## Prerequisites

- Phase 1 completed (boilerplate, credentials flow)
- Phase 2 completed (controller pattern)
- Phase 3 completed (data objects)

## What You Will Build

- Ecosystem inventory access via `EcosystemFactory`
- Inventory cache with 24-hour TTL for performance
- Badge retrieval and filtering
- Awarding badges to visitors (idempotent)
- Visitor inventory checking
- Expression (emote) unlocking
- Client-side badge display with owned/unowned states

## Architecture Overview

The badge system has three layers:

```
Ecosystem Inventory (all available badges)
  --> Inventory Cache (24h in-memory cache)
    --> Visitor Inventory (badges owned by a player)
```

1. **Ecosystem Inventory**: All badges defined for your app in the Topia ecosystem
2. **Inventory Cache**: Server-side in-memory cache to avoid repeated API calls
3. **Visitor Inventory**: Badges a specific player has earned

## Step 1: Add EcosystemFactory to topiaInit.ts

Ensure `server/utils/topiaInit.ts` exports the Ecosystem factory:

```typescript
import {
  AssetFactory,
  DroppedAssetFactory,
  EcosystemFactory,
  Topia,
  UserFactory,
  VisitorFactory,
  WorldFactory,
} from "@rtsdk/topia";

const topia = new Topia({
  apiDomain: process.env.INSTANCE_DOMAIN,
  apiProtocol: process.env.INSTANCE_PROTOCOL,
  interactiveKey: process.env.INTERACTIVE_KEY,
  interactiveSecret: process.env.INTERACTIVE_SECRET,
});

const Asset = new AssetFactory(topia);
const DroppedAsset = new DroppedAssetFactory(topia);
const Ecosystem = new EcosystemFactory(topia);
const User = new UserFactory(topia);
const Visitor = new VisitorFactory(topia);
const World = new WorldFactory(topia);

export { Asset, DroppedAsset, Ecosystem, User, Visitor, World };
```

## Step 2: Implement Inventory Cache

Create `server/utils/inventoryCache.ts`:

```typescript
import { Credentials } from "../types.js";
import { Ecosystem } from "./topiaInit.js";
import { InventoryItemInterface } from "@rtsdk/topia";

interface CachedInventory {
  items: InventoryItemInterface[];
  timestamp: number;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let inventoryCache: CachedInventory | null = null;

export const getCachedInventoryItems = async ({
  credentials,
  forceRefresh = false,
}: {
  credentials: Credentials;
  forceRefresh?: boolean;
}): Promise<InventoryItemInterface[]> => {
  try {
    const now = Date.now();
    const isCacheValid =
      inventoryCache !== null &&
      !forceRefresh &&
      now - inventoryCache.timestamp < CACHE_DURATION_MS;

    if (isCacheValid) {
      return inventoryCache!.items;
    }

    // Fetch fresh inventory
    const ecosystem = Ecosystem.create({ credentials });
    await ecosystem.fetchInventoryItems();

    inventoryCache = {
      items: (ecosystem.inventoryItems as InventoryItemInterface[])
        .map((item) => ({
          ...item,
          metadata: {
            ...(item.metadata || {}),
            sortOrder: typeof item.metadata?.sortOrder === "number" ? item.metadata.sortOrder : 0,
          },
        }))
        .sort((a, b) => (a.metadata?.sortOrder ?? 0) - (b.metadata?.sortOrder ?? 0)),
      timestamp: now,
    };

    return inventoryCache.items;
  } catch (error) {
    // Fall back to stale cache if available
    if (inventoryCache !== null) {
      console.warn("Failed to fetch fresh inventory, using stale cache");
      return inventoryCache.items;
    }
    throw error;
  }
};

export const clearInventoryCache = (): void => {
  inventoryCache = null;
};
```

### Cache Behavior

| Scenario | Result |
|----------|--------|
| First request | Fetches from API, caches result |
| Within 24 hours | Returns cached data |
| After 24 hours | Fetches fresh data, updates cache |
| `forceRefresh: true` | Always fetches fresh data |
| API failure with cache | Returns stale cache |
| API failure without cache | Throws error |

## Step 3: Get Ecosystem Badges

Create `server/utils/getBadges.ts`:

```typescript
import { Credentials } from "../types.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

export type BadgeRecord = {
  [name: string]: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
};

export const getBadges = async (credentials: Credentials): Promise<BadgeRecord> => {
  const inventoryItems = await getCachedInventoryItems({ credentials });
  const badges: BadgeRecord = {};

  for (const item of inventoryItems) {
    const { id, name, image_path, description, type, status } = item;
    if (name && type === "BADGE" && status === "ACTIVE") {
      badges[name] = {
        id,
        name,
        icon: image_path || "",
        description: description || "",
      };
    }
  }

  return badges;
};
```

## Step 4: Get Visitor Badges

Create `server/utils/getVisitorBadges.ts`:

```typescript
export type VisitorBadgeRecord = {
  [name: string]: {
    id: string;
    name: string;
    icon: string;
  };
};

export type VisitorInventory = {
  badges: VisitorBadgeRecord;
};

export const getVisitorBadges = (visitorInventoryItems: any[]): VisitorInventory => {
  const visitorInventory: VisitorInventory = { badges: {} };

  for (const visitorItem of visitorInventoryItems) {
    const { id, status, item } = visitorItem;
    const { name, type, image_url = "" } = item || {};

    if (status === "ACTIVE" && type === "BADGE" && name) {
      visitorInventory.badges[name] = {
        id,
        name,
        icon: image_url,
      };
    }
  }

  return visitorInventory;
};
```

## Step 5: Award a Badge (Idempotent)

Create `server/utils/awardBadge.ts`:

```typescript
import { Credentials } from "../types.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

export const awardBadge = async ({
  credentials,
  visitor,
  visitorInventory,
  badgeName,
}: {
  credentials: Credentials;
  visitor: any;
  visitorInventory: any;
  badgeName: string;
}) => {
  try {
    // Idempotent: skip if visitor already has this badge
    if (visitorInventory.badges[badgeName]) {
      return { success: true };
    }

    // Find the badge in ecosystem inventory
    const inventoryItems = await getCachedInventoryItems({ credentials });
    const inventoryItem = inventoryItems?.find(
      (item) => item.name === badgeName && item.type === "BADGE",
    );

    if (!inventoryItem) {
      throw new Error(`Badge "${badgeName}" not found in ecosystem inventory`);
    }

    // Grant the badge
    await visitor.grantInventoryItem(inventoryItem, 1);

    // Notify the visitor
    await visitor
      .fireToast({
        groupId: "badgeAwarded",
        title: "Badge Awarded!",
        text: `You have earned the ${badgeName} badge!`,
      })
      .catch(() => console.error(`Failed to fire toast for ${badgeName} badge`));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
```

### Idempotent Badge Grants

Always check the visitor's inventory before granting. This prevents:
- Duplicate badges
- Unnecessary API calls
- Duplicate toast notifications

```typescript
// CORRECT: Check first, then grant
if (visitorInventory.badges[badgeName]) return { success: true };
await visitor.grantInventoryItem(badge, 1);

// WRONG: Grant without checking
await visitor.grantInventoryItem(badge, 1); // May fail or duplicate
```

## Step 6: Expression (Emote) Unlocking

Unlock emotes as rewards. Returns 200 for new unlock, 409 if already owned:

```typescript
// Get available expressions
const availableExpressions = await visitor.getExpressions({
  getUnlockablesOnly: true,
});

// Grant an expression by name
try {
  await visitor.grantExpression({ name: "dance_celebration" });
  await visitor.fireToast({
    groupId: "emoteUnlocked",
    title: "New Emote!",
    text: "You unlocked the Celebration Dance emote!",
  });
} catch (error: any) {
  if (error?.response?.status === 409) {
    // Already owned -- this is fine, not an error
  } else {
    throw error;
  }
}
```

## Step 7: Controller Integration

```typescript
// server/controllers/handleGetConfiguration.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { getBadges } from "../utils/getBadges.js";
import { getVisitorBadges } from "../utils/getVisitorBadges.js";

export const handleGetConfiguration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, urlSlug } = credentials;

    // Fetch badges and visitor data in parallel
    const [badges, visitor] = await Promise.all([
      getBadges(credentials),
      Visitor.get(visitorId, urlSlug, { credentials }),
    ]);

    // Get visitor's owned badges
    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorBadges(visitor.inventoryItems);

    return res.json({
      success: true,
      badges,
      visitorInventory,
      isAdmin: visitor.isAdmin,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetConfiguration",
      message: "Error loading configuration",
      req,
      res,
    });
  }
};
```

## Step 8: Client Badge Display

### Types

```typescript
// client/src/context/types.ts
export type BadgeType = {
  id: string;
  name: string;
  icon: string;
  description?: string;
};

export type VisitorInventoryType = {
  badges: { [name: string]: BadgeType };
};
```

### Badge Grid Component

Display all badges with owned badges in color and unowned badges grayed out:

```tsx
const { badges, visitorInventory } = useContext(GlobalStateContext);

const getBadgesContent = () => {
  if (!badges || Object.keys(badges).length === 0) {
    return <p className="p2">No badges available yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-6 pt-4">
      {Object.values(badges).map((badge) => {
        const { name, description, icon } = badge;
        const hasBadge = visitorInventory?.badges && name in visitorInventory.badges;
        const style = {
          width: "90px",
          filter: hasBadge ? "none" : "grayscale(1)",
        };

        return (
          <div className="tooltip" key={name}>
            <span className="tooltip-content" style={{ width: "115px" }}>
              {name} {description && `- ${description}`}
            </span>
            <img src={icon} alt={name} style={style} />
          </div>
        );
      })}
    </div>
  );
};
```

### Tabbed Interface

```tsx
const [activeTab, setActiveTab] = useState("main");

return (
  <div>
    <div className="tab-container mb-4">
      <button
        className={activeTab === "main" ? "btn" : "btn btn-text"}
        onClick={() => setActiveTab("main")}
      >
        Main
      </button>
      <button
        className={activeTab === "badges" ? "btn" : "btn btn-text"}
        onClick={() => setActiveTab("badges")}
      >
        Badges
      </button>
    </div>

    {activeTab === "main" ? getMainContent() : getBadgesContent()}
  </div>
);
```

## Badge Achievement Patterns from Production Apps

Production apps commonly use milestone-based badge tiers:

| Pattern | Badges | Example App |
|---------|--------|-------------|
| First action | "First Find", "First Race" | sdk-quest, sdk-race |
| Tiered milestones | Bronze/Silver/Gold/Diamond (25/50/75/100) | sdk-quest |
| Streak-based | "3-Day Streak", "5-Day Streak", "7-Day Streak" | sdk-quest |
| Completion | "Challenge Complete", "Race Finished" | sdk-scavenger-hunt |
| Special conditions | "Wrong checkpoint entered" | sdk-race |

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `Ecosystem.create({ credentials })` | Create ecosystem controller |
| `ecosystem.fetchInventoryItems()` | Get all ecosystem items |
| `visitor.fetchInventoryItems()` | Get visitor's owned items |
| `visitor.grantInventoryItem(item, qty)` | Award a badge |
| `visitor.grantExpression({ name })` | Unlock an emote |
| `visitor.getExpressions(opts)` | List available expressions |
| `visitor.fireToast(opts)` | Show badge notification |

## Related Examples

- `../examples/badges.md` -- complete badge system implementation
- `../examples/inventoryCache.md` -- inventory cache with full API reference
- `../examples/awardBadge.md` -- idempotent badge grant utility

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not caching ecosystem inventory | Use the 24h inventory cache to avoid repeated API calls |
| Granting badges without checking inventory | Always check `visitorInventory.badges[name]` first |
| Forgetting to call `visitor.fetchInventoryItems()` | Required before reading `visitor.inventoryItems` |
| Not handling 409 on `grantExpression` | 409 means "already owned" -- catch and ignore |
| Hardcoding badge IDs | Look up badges by name from the ecosystem inventory |
| Missing `EcosystemFactory` in `topiaInit.ts` | Must export `Ecosystem` for inventory access |
