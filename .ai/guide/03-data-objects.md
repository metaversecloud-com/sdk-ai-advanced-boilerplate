# Phase 3: Data Objects

## Prerequisites

- Phase 1 completed (boilerplate, credentials flow)
- Phase 2 completed (controller pattern, key asset)

## What You Will Build

- Data object initialization pattern (setDataObject before updateDataObject)
- Locking strategies to prevent race conditions
- Visitor data objects for per-player state
- World data objects for shared state
- Per-player tracking with profileId keys
- Dot-notation partial updates

## Core Concept

Data objects are arbitrary JSON stored on SDK entities (DroppedAsset, Visitor, World, User, Ecosystem). They are the primary mechanism for persisting app state.

Four methods are available on all entities:

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `fetchDataObject()` | Read current data into `instance.dataObject` | Before reading state |
| `setDataObject(data, opts?)` | Replace entire data object | Initialization only |
| `updateDataObject(data, opts?)` | Partial merge (supports dot-notation) | Most updates |
| `incrementDataObjectValue(path, amount, opts?)` | Atomic increment | Counters, scores |

## The Initialization Pattern (CRITICAL)

**Always ensure defaults exist before calling `updateDataObject`.** If the data object has never been set, `updateDataObject` will fail or produce unexpected results.

The pattern: fetch -> check -> initialize if missing -> then update.

### Step 1: Create an Initialization Utility

```typescript
// server/utils/initializeDroppedAssetDataObject.ts
import { DroppedAsset } from "./topiaInit.js";
import { Credentials } from "../types.js";

// Define the default shape of your data object
const DEFAULT_DATA = {
  leaderboard: {},
  gameConfig: {
    maxPlayers: 10,
    timeLimit: 300,
  },
  createdAt: new Date().toISOString(),
};

export const initializeDroppedAssetDataObject = async ({
  droppedAsset,
  credentials,
}: {
  droppedAsset: any;
  credentials: Credentials;
}) => {
  const { sceneDropId } = credentials;

  await droppedAsset.fetchDataObject();

  // Check if data object needs initialization
  const dataObject = droppedAsset.dataObject as typeof DEFAULT_DATA | null;

  if (!dataObject || !dataObject.gameConfig) {
    // Create a lock to prevent concurrent initialization
    const lockId = `${sceneDropId}-init-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

    await droppedAsset.setDataObject(DEFAULT_DATA, {
      lock: { lockId, releaseLock: true },
    });

    // Re-fetch to get the initialized data
    await droppedAsset.fetchDataObject();
  }

  return droppedAsset;
};
```

### Step 2: Use in a "Get" Utility

```typescript
// server/utils/getDroppedAsset.ts
import { DroppedAsset } from "./topiaInit.js";
import { initializeDroppedAssetDataObject } from "./initializeDroppedAssetDataObject.js";
import { Credentials } from "../types.js";

export const getDroppedAsset = async ({ credentials }: { credentials: Credentials }) => {
  try {
    const { assetId, urlSlug } = credentials;

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    // Initialize data object if needed
    await initializeDroppedAssetDataObject({ droppedAsset, credentials });

    return droppedAsset;
  } catch (error: any) {
    throw new Error(`Error getting dropped asset: ${error.message}`);
  }
};
```

### Step 3: Use in Controllers

```typescript
// Now safe to use updateDataObject in any controller
const droppedAsset = await getDroppedAsset({ credentials });

// This is safe because initialization has been guaranteed
await droppedAsset.updateDataObject({
  "gameConfig.maxPlayers": 20,
});
```

## Locking Strategies

Locks prevent race conditions when multiple visitors interact simultaneously. The lock ID determines the granularity.

### Time-Based Lock (Most Common)

Round the current timestamp to create time windows. Any request within the same window gets the same lock ID, preventing concurrent writes.

```typescript
// 1-minute window lock
const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

await droppedAsset.setDataObject(defaults, {
  lock: { lockId, releaseLock: true },
});
```

### Granularity Options

| Window | Divisor | Use Case |
|--------|---------|----------|
| 10 seconds | `10000` | High-frequency updates (race checkpoints) |
| 1 minute | `60000` | Standard initialization |
| 5 minutes | `300000` | Configuration changes |

### Lock Parameters

```typescript
{
  lock: {
    lockId: string;       // Unique identifier for the lock
    releaseLock?: boolean; // If true, releases lock after operation (usually true)
  }
}
```

## World Data Objects

Store shared state that all visitors access (configuration, themes, scene data).

### Pattern: Namespace by sceneDropId

```typescript
// server/utils/getWorldAndDataObject.ts
import { World, DroppedAsset } from "./topiaInit.js";
import { Credentials } from "../types.js";

type WorldDataObject = {
  [sceneDropId: string]: {
    theme: string;
    leaderboard: Record<string, string>;
  };
};

export const getWorldAndDataObject = async ({ credentials }: { credentials: Credentials }) => {
  const { assetId, urlSlug, sceneDropId } = credentials;

  const world = World.create(urlSlug, { credentials });
  await world.fetchDataObject();

  let dataObject = world.dataObject as WorldDataObject;

  // Initialize scene data if missing
  if (!dataObject?.[sceneDropId]) {
    const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

    if (!world.dataObject) {
      await world.setDataObject(
        { [sceneDropId]: { theme: "default", leaderboard: {} } },
        { lock: { lockId, releaseLock: true } },
      );
    } else {
      await world.updateDataObject(
        { [sceneDropId]: { theme: "default", leaderboard: {} } },
        { lock: { lockId, releaseLock: true } },
      );
    }

    await world.fetchDataObject();
    dataObject = world.dataObject as WorldDataObject;
  }

  return { dataObject: dataObject[sceneDropId], world };
};
```

## Visitor Data Objects

Store per-player state (progress, scores, settings). Visitor data persists across sessions.

### Pattern: Namespace by urlSlug and sceneDropId

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
await visitor.fetchDataObject();

const visitorKey = `${urlSlug}-${sceneDropId}`;
const visitorData = (visitor.dataObject as Record<string, any>)?.[visitorKey];

if (!visitorData) {
  const lockId = `${visitorId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

  if (!visitor.dataObject) {
    await visitor.setDataObject(
      {
        [visitorKey]: {
          totalCollected: 0,
          currentStreak: 0,
          lastCollectedDate: null,
        },
      },
      { lock: { lockId, releaseLock: true } },
    );
  } else {
    await visitor.updateDataObject(
      {
        [visitorKey]: {
          totalCollected: 0,
          currentStreak: 0,
          lastCollectedDate: null,
        },
      },
      { lock: { lockId, releaseLock: true } },
    );
  }
}
```

## Dot-Notation Updates

`updateDataObject` supports dot-notation paths for nested updates without overwriting sibling keys:

```typescript
// Update a single nested field
await droppedAsset.updateDataObject({
  "gameConfig.maxPlayers": 20,
});

// Update per-player data using profileId
await droppedAsset.updateDataObject({
  [`leaderboard.${profileId}`]: "Alice|42|5",
});

// Update multiple nested fields at once
await droppedAsset.updateDataObject({
  [`players.${profileId}.score`]: 100,
  [`players.${profileId}.lastPlayed`]: new Date().toISOString(),
});
```

## Atomic Increments

Use `incrementDataObjectValue` for counters to avoid read-modify-write race conditions:

```typescript
// Increment a counter
await visitor.incrementDataObjectValue(
  `${urlSlug}-${sceneDropId}.totalCollected`,
  1,
);

// Increment with analytics (see Phase 5)
await visitor.incrementDataObjectValue(
  `${urlSlug}-${sceneDropId}.totalCollected`,
  1,
  {
    analytics: [{ analyticName: "itemsCollected", profileId, uniqueKey: profileId, urlSlug }],
  },
);
```

## Per-Player Tracking with profileId Keys

Store player-specific data under their `profileId` in a shared data object:

```typescript
// On key asset data object
type GameData = {
  leaderboard: {
    [profileId: string]: string;  // pipe-delimited: "name|score|streak"
  };
  players: {
    [profileId: string]: {
      joinedAt: string;
      lastActive: string;
    };
  };
};

// Update a specific player's data
await droppedAsset.updateDataObject({
  [`players.${profileId}.lastActive`]: new Date().toISOString(),
});
```

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `entity.fetchDataObject()` | Load data object into `entity.dataObject` |
| `entity.setDataObject(data, opts?)` | Replace entire data object (initialization) |
| `entity.updateDataObject(data, opts?)` | Partial merge with dot-notation support |
| `entity.incrementDataObjectValue(path, amt, opts?)` | Atomic counter increment |
| `World.create(urlSlug, opts)` | Create lightweight world controller |
| `Visitor.get(id, urlSlug, opts)` | Get visitor with full details |

## Related Examples

- `../examples/handleGetConfiguration.md` -- world data object initialization with locking
- `../examples/handleResetGameState.md` -- resetting data objects with admin guard
- `../examples/leaderboard.md` -- per-player data with profileId keys

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Calling `updateDataObject` before `setDataObject` | Always check if data exists and initialize first |
| Missing locking on `setDataObject` | Use time-based locks to prevent concurrent initialization |
| Not namespacing by `sceneDropId` | Multiple scenes in one world will collide without namespacing |
| Using `setDataObject` for updates | `setDataObject` replaces everything; use `updateDataObject` for changes |
| Forgetting `releaseLock: true` | Without this, the lock persists and blocks future writes |
| Reading stale data | Call `fetchDataObject()` before reading `entity.dataObject` |
| Using read-modify-write for counters | Use `incrementDataObjectValue` for atomic increments |
