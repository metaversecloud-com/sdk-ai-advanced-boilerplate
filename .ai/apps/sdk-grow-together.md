# SDK Grow Together

**Repo**: [metaversecloud-com/sdk-grow-together](https://github.com/metaversecloud-com/sdk-grow-together)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-grow-together/`
**Quality**: High — most feature-rich app, production economy, inventory system, shared module, 100-level XP, but minimal tests, some bugs
**SDK Version**: `@rtsdk/topia@^0.19.4`

## What It Does

A relaxing, loop-based gardening game. Players claim garden plots, plant seeds, water crops in real-time, harvest for coins, and purchase rare seeds/decorations/tools from an in-game store. Features a deep economy, XP leveling system with 100 levels and ranked progression, social watering mechanics, and decorative customization.

### Core Game Mechanics

1. **Plot Claiming**: 4x4 grid (16 squares). Squares 1-4 reserved for decorations; 5-16 for crops. One plot per world per player.
2. **Seed System**: Seeds from ecosystem inventory with growth times, harvest levels (# of waterings), rarity, coin rewards.
3. **Growth Cycle**: Plant -> Wait (real-time timer) -> Water (+1 grow level) -> Repeat until harvest level -> Harvest for coins + XP.
4. **Tool System**:
   - **Watering Cans** (Wooden/Metal/Gold) — Water friends' crops for random coin/XP rewards
   - **Mulch** (Basic/Super/Ultra) — Reduces growth time by 10%/25%/33%
   - **Compost** (Basic/Super/Ultra) — Chance at 2x/3x coin harvest multiplier
   - **Sprinkler** — Plot-wide water all ready crops
   - **Harvest Basket** — Plot-wide harvest all ready crops
5. **Decorations**: Cosmetic items placed in reserved decoration squares.
6. **XP & Leveling**: 100 levels with 20+ named ranks. Level-ups grant coin bonuses. Quadratic XP curve.
7. **Social**: Visit friends' gardens, water their crops with watering cans (earning rewards).

### User Flow

1. Click interactive asset -> iframe opens
2. **Home** (`/`): Instructions, teleport-to-garden
3. **Teleport** (`/teleport`): Find open gardens, teleport to own
4. **Plot** (`/plot`): Main 4x4 grid, plant/water/harvest, store/backpack modals
5. **Crop** (`/crop`): Individual crop detail with countdown timer, tool usage
6. **Decoration** (`/decoration`): Decoration detail view

## API Endpoints (22 controllers)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Full game state + inventory + ecosystem items |
| POST | `/api/teleport` | Teleport to open plot |
| POST | `/api/admin/clear-plot` | Admin: clear a single plot |
| POST | `/api/admin/clear-all-plots` | Admin: clear all/inactive plots |
| POST | `/api/plot/claim` | Claim a plot, grant starter items |
| POST | `/api/plot/teleport` | Teleport to own plot |
| POST | `/api/plot/view` | Open plot iframe |
| POST | `/api/plot/use-tool` | Use plot-wide tool (Sprinkler/Harvest Basket) |
| POST | `/api/square/view` | Open square detail iframe |
| GET | `/api/square` | Get square info + inventory |
| POST | `/api/seed/purchase` | Buy seed from store |
| POST | `/api/crop/drop` | Plant a seed |
| POST | `/api/crop/water` | Water a crop |
| POST | `/api/crop/harvest` | Harvest a crop |
| POST | `/api/crop/use-tool` | Use tool on crop (mulch/compost/water can) |
| POST | `/api/crop/remove` | Remove a crop |
| POST | `/api/decoration/purchase` | Buy decoration |
| POST | `/api/decoration/drop` | Place decoration |
| POST | `/api/decoration/remove` | Remove decoration |
| POST | `/api/tool/purchase` | Buy tool |

## Data Structures

### World Data Object
```typescript
{ plots: { [plotAssetId: string]: string | null } } // profileId of owner or null
```

### Visitor Data Object (cross-world, ecosystem-scoped)
```typescript
type VisitorDataObjectType = {
  lastDateCoinsEarned: string;
  totalCoinsEarned: number;
  inventoryLastUpdated: string;
  placedDecorations: {
    [decorationName: string]: { [urlSlug: string]: string[] } // droppedAssetIds
  };
  worlds: {
    [urlSlug: string]: {
      plotAssetId: string | null;
      plotSignAssetId?: string | null;
      claimedDate: string;
      lastInteractionDate: string;
      plotSquares: { [squareId: number]: string | null }; // droppedAssetId or null
      crops: { [droppedAssetId: string]: CropDataObjectType };
      decorations: { [droppedAssetId: string]: PlacedDecorationDataObjectType };
    }
  }
};
```

### Crop Data Object (on each crop DroppedAsset)
```typescript
type CropDataObjectType = {
  plotAssetId?: string;
  ownerId?: string;
  ownerName?: string;
  squareId: number;
  seedId: string;
  name: string;
  dateDropped: string;
  lastWatered: string;
  growLevel: number;
  appliedTools: string[];
};
```

### Ecosystem Inventory Item Metadata
```typescript
{
  type?: "seed" | "decoration" | "tool";
  cost?: number;
  rarity?: number;      // 0-4
  reward?: number;
  xp?: number;
  growthTime?: number;
  harvestLevel?: number;
  canBeUsedOnPlot?: boolean;
  actionType?: "Water" | "Harvest" | "Mulch" | "Compost";
  sortOrder?: number;
  quantity?: number;
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.create/get/drop` | Asset lifecycle |
| `droppedAsset.fetchDataObject/setDataObject/updateDataObject` | Crop/decoration data |
| `droppedAsset.updateClickType({ clickType, clickableLink, ... })` | Configure click behavior |
| `droppedAsset.updateWebImageLayers(layer0, layer1)` | Update crop/decoration visuals |
| `droppedAsset.deleteDroppedAsset()` | Remove from world |
| `Visitor.create/get` | Visitor lifecycle |
| `visitor.fetchDataObject/setDataObject/updateDataObject` | Player state |
| `visitor.fetchInventoryItems()` | Get player's inventory |
| `visitor.modifyInventoryItemQuantity(item, quantity)` | Grant/deduct items |
| `visitor.fireToast({ groupId, title, text })` | Toast notifications |
| `visitor.openIframe({ droppedAssetId, link, shouldOpenInDrawer, title })` | Open drawer |
| `visitor.closeIframe(assetId)` | Close drawer |
| `visitor.moveVisitor({ shouldTeleportVisitor, x, y })` | Teleport to garden |
| `User.create({ credentials, profileId })` | Cross-visitor data access (watering friends) |
| `user.fetchDataObject/updateDataObject` | Modify another player's data |
| `user.fetchInventoryItems()` | Read another player's inventory |
| `Ecosystem.create({ credentials })` | Ecosystem instance |
| `ecosystem.fetchInventoryItems()` | All ecosystem items (seeds, tools, decorations) |
| `World.create/fetchDataObject/setDataObject/updateDataObject` | World state (plot ownership) |
| `world.fetchDroppedAssetsWithUniqueName({ uniqueName, isPartial })` | Find assets |
| `world.triggerParticle({ name, duration, position })` | Particle effects |
| `world.triggerActivity({ type, assetId })` | GAME_HIGH_SCORE on rank-up |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete |

**Notable new SDK methods**: `visitor.modifyInventoryItemQuantity`, `visitor.openIframe`, `visitor.moveVisitor`, `world.triggerActivity(GAME_HIGH_SCORE)`, `droppedAsset.updateClickType`

## Key Patterns

### Inventory Cache with Background Refresh (CRITICAL PATTERN)
```typescript
class InventoryCache {
  private cache: Map<string, InventoryCacheEntry> = new Map();
  private readonly TTL_MS = 24 * 60 * 60 * 1000;
  private readonly REFRESH_THRESHOLD_MS = this.TTL_MS * 0.8;

  async get(credentials: Credentials) {
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && !this.isExpired(cachedEntry)) {
      if (this.shouldRefresh(cachedEntry) && !cachedEntry.isRefreshing) {
        this.refreshInBackground(cacheKey, credentials);
      }
      return cachedEntry.data;
    }
    // Fetch fresh, fallback to stale on error
  }
}
export const inventoryCache = new InventoryCache();
```

### Cross-Visitor Tool Usage via User Factory
```typescript
if (profileId === ownerId) {
  owner = visitor;
} else {
  owner = await User.create({ credentials, profileId: ownerId });
  ownerData = (await owner.fetchDataObject()) as VisitorDataObjectType;
}
```

### Probability-Based Coin Multipliers (Compost)
```typescript
const composts = [
  { name: "Ultra Compost", doubleChance: 0.5, tripleChance: 0.25 },
  { name: "Super Compost", doubleChance: 0.33, tripleChance: 0.1 },
  { name: "Basic Compost", doubleChance: 0.25, tripleChance: 0.05 },
];
```

### Tiered Random Rewards (Watering Cans)
```typescript
if (name === "Wooden Watering Can") {
  xpReward = Math.floor(Math.random() * 2) + 1; // 1-2 XP
  if (Math.random() < 0.25) coinReward = Math.floor(Math.random() * 3) + 1; // 25% chance, 1-3 coins
} else if (name === "Gold Watering Can") {
  xpReward = Math.floor(Math.random() * 8) + 7; // 7-14 XP
  if (Math.random() < 0.8) coinReward = Math.floor(Math.random() * 11) + 10; // 80% chance, 10-20 coins
}
```

### Shared Module Between Client and Server
```typescript
// shared/ directory with path aliases: @shared/types, @shared/constants
// Contains growth calculations, image URL builders, XP/rank tables, plot configuration
```

### Sound Effects via Global State
```typescript
useEffect(() => {
  if (soundEffect === "sprinkler") {
    audio = new Audio("https://sdk-grow-together.s3.us-east-1.amazonaws.com/sprinkler.mp3");
  } // also: water, plant, harvest, mulch, compost, placeDecoration, newLevel
}, [soundEffect]);
```

### Inactive Plot Clearing (14-day threshold)
```typescript
if (clearInactiveOnly &&
  (!plotAssetData.lastInteractionDate ||
    new Date(plotAssetData.lastInteractionDate) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)))
```

## RPG Relevance (CRITICAL)

This is the **most feature-rich app** and closest to the lunch-swap RPG:

- **Full inventory system**: Seeds, tools, decorations with ecosystem integration — directly reusable for lunch items, ingredients, accessories
- **Economy (coins + XP)**: Earning, spending, rewards — applicable for RPG currency
- **100-level XP system**: Quadratic curve with named ranks — character progression
- **Social mechanics**: Water friends' crops for rewards — trading/gifting pattern
- **Tool system**: Items that modify gameplay (mulch reduces time, compost multiplies rewards) — RPG item effects
- **Probability-based rewards**: Compost multipliers, watering can random rewards — loot system
- **Real-time growth timers**: Countdown-based mechanics — quest/mission timers
- **Plot claiming & ownership**: Personal space in world — RPG territory
- **Shared module pattern**: Code sharing between client/server — architecture best practice
- **Decoration system**: Cosmetic unlocks placed in world — accessory/badge display

## Weaknesses

- Bug in `handleUsePlotTool`: returns `success: false` even on success
- Stale test file: mocks functions that no longer exist
- `@googleapis/sheets` dependency unused
- Duplicate export in `server/controllers/index.ts`
- Minimal test coverage (3 outdated tests)
