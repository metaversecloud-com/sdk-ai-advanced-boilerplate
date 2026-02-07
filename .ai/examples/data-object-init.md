# Data Object Initialization

> **Source**: All apps (consolidated)
> **SDK Methods**: `fetchDataObject()`, `setDataObject()`, `updateDataObject()`
> **Guide Phase**: Phase 3
> **Difficulty**: Starter

## When to Use

Use this pattern whenever you need to read or write data on any SDK entity (DroppedAsset, Visitor, World). The critical rule is that `updateDataObject()` performs a partial merge on an existing object -- it will fail or produce unexpected results if the data object has never been initialized. You must always check whether the data object exists and call `setDataObject()` first if it does not.

## Server Implementation

### The Core Pattern: Fetch, Check, Init, Update

Every data object interaction follows this sequence:

1. **Fetch** the current data object
2. **Check** if it exists and has the expected shape
3. **Init** with `setDataObject()` if missing (with locking to prevent race conditions)
4. **Update** safely with `updateDataObject()` for partial changes

### TypeScript Interface for Default Data

```ts
/**
 * Define a typed interface for your data object so defaults are always consistent.
 */
export interface GameDataObject {
  score: number;
  itemsCollected: string[];
  lastVisited: string;
  completedChallenges: Record<string, boolean>;
}

export const DEFAULT_GAME_DATA: GameDataObject = {
  score: 0,
  itemsCollected: [],
  lastVisited: "",
  completedChallenges: {},
};
```

### DroppedAsset Data Object Initialization

```ts
/**
 * Initializes the data object on a dropped asset if it does not already have one.
 * Uses locking to prevent race conditions when multiple visitors trigger initialization.
 *
 * @param credentials - Topia credentials for API authentication
 * @returns The dropped asset instance with an initialized data object
 */
import { Credentials } from "../types.js";
import { DroppedAsset } from "./topiaInit.js";

export interface DroppedAssetDataObject {
  leaderboard: Record<string, string>;
  totalPlays: number;
  isActive: boolean;
}

const DEFAULT_DROPPED_ASSET_DATA: DroppedAssetDataObject = {
  leaderboard: {},
  totalPlays: 0,
  isActive: true,
};

export const initializeDroppedAssetDataObject = async ({
  credentials,
}: {
  credentials: Credentials;
}) => {
  const { assetId, urlSlug, sceneDropId } = credentials;

  // Step 1: Get the dropped asset and fetch its current data object
  const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
  await droppedAsset.fetchDataObject();

  const dataObject = droppedAsset.dataObject as DroppedAssetDataObject | undefined;

  // Step 2: Check if the data object already has the expected shape
  if (dataObject && typeof dataObject.totalPlays === "number") {
    // Data object already initialized, return as-is
    return droppedAsset;
  }

  // Step 3: Initialize with defaults using a lock to prevent race conditions.
  // The lockId uses a rounded timestamp so concurrent requests within the same
  // time window share the same lock and only one initialization succeeds.
  const lockId = `${assetId}-init-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

  await droppedAsset.setDataObject(DEFAULT_DROPPED_ASSET_DATA, {
    lock: { lockId, releaseLock: true },
  });

  // Re-fetch to confirm the initialization
  await droppedAsset.fetchDataObject();

  return droppedAsset;
};
```

### Visitor Data Object Initialization

```ts
/**
 * Initializes a visitor's data object with default game progress.
 * Called when a visitor first interacts with the app.
 *
 * @param credentials - Topia credentials for API authentication
 * @returns The visitor instance with an initialized data object
 */
import { Credentials } from "../types.js";
import { Visitor } from "./topiaInit.js";

export interface VisitorDataObject {
  score: number;
  itemsCollected: string[];
  startedAt: string;
}

const DEFAULT_VISITOR_DATA: VisitorDataObject = {
  score: 0,
  itemsCollected: [],
  startedAt: "",
};

export const initializeVisitorDataObject = async ({
  credentials,
}: {
  credentials: Credentials;
}) => {
  const { urlSlug, visitorId, profileId } = credentials;

  // Step 1: Get the visitor and fetch their data object
  const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
  await visitor.fetchDataObject();

  const dataObject = visitor.dataObject as VisitorDataObject | undefined;

  // Step 2: Check if already initialized
  if (dataObject && Array.isArray(dataObject.itemsCollected)) {
    return visitor;
  }

  // Step 3: Initialize with defaults and lock
  const lockId = `${visitorId}-init-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

  await visitor.setDataObject(
    {
      ...DEFAULT_VISITOR_DATA,
      startedAt: new Date().toISOString(),
    },
    { lock: { lockId, releaseLock: true } },
  );

  await visitor.fetchDataObject();

  return visitor;
};
```

### World Data Object Initialization

```ts
/**
 * Initializes the world data object with scene-scoped configuration.
 * Uses sceneDropId as the key so multiple app instances in the same world
 * do not overwrite each other's data.
 *
 * @param credentials - Topia credentials for API authentication
 * @returns The world instance and its scene-scoped data
 */
import { Credentials } from "../types.js";
import { World } from "./topiaInit.js";

export interface SceneDataObject {
  numberOfCheckpoints: number;
  leaderboard: Record<string, string>;
  config: Record<string, any>;
}

const DEFAULT_SCENE_DATA: SceneDataObject = {
  numberOfCheckpoints: 0,
  leaderboard: {},
  config: {},
};

export const initializeWorldDataObject = async ({
  credentials,
}: {
  credentials: Credentials;
}) => {
  const { urlSlug, sceneDropId } = credentials;

  // Step 1: Create world instance and fetch data
  const world = World.create(urlSlug, { credentials });
  await world.fetchDataObject();

  const worldData = world.dataObject as Record<string, SceneDataObject> | undefined;

  // Step 2: Check if this scene's data already exists
  if (worldData?.[sceneDropId] && typeof worldData[sceneDropId].numberOfCheckpoints === "number") {
    return { world, dataObject: worldData[sceneDropId] };
  }

  // Step 3: Initialize scene data within the world data object
  const lockId = `${sceneDropId}-init-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

  if (!world.dataObject) {
    // World has no data object at all - use setDataObject to create it
    await world.setDataObject(
      { [sceneDropId]: DEFAULT_SCENE_DATA },
      { lock: { lockId, releaseLock: true } },
    );
  } else {
    // World has a data object but is missing this scene - use updateDataObject
    await world.updateDataObject(
      { [sceneDropId]: DEFAULT_SCENE_DATA },
      { lock: { lockId, releaseLock: true } },
    );
  }

  // Re-fetch the updated data
  await world.fetchDataObject();
  const updatedData = world.dataObject as Record<string, SceneDataObject>;

  return { world, dataObject: updatedData[sceneDropId] };
};
```

### Complete Controller Example: Fetch, Init, Update

```ts
/**
 * Controller demonstrating the full data object lifecycle:
 * fetch existing data, initialize if missing, then update with new values.
 *
 * @returns JSON response with the updated game state
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset } from "../utils/index.js";

interface KeyAssetData {
  leaderboard: Record<string, string>;
  totalPlays: number;
  isActive: boolean;
}

const DEFAULTS: KeyAssetData = {
  leaderboard: {},
  totalPlays: 0,
  isActive: true,
};

export const handleRecordPlay = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, profileId, displayName } = credentials;

    // Step 1: Fetch
    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    await droppedAsset.fetchDataObject();

    const dataObject = droppedAsset.dataObject as KeyAssetData | undefined;

    // Step 2: Check and Init if needed
    if (!dataObject || typeof dataObject.totalPlays !== "number") {
      const lockId = `${assetId}-init-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
      await droppedAsset.setDataObject(DEFAULTS, {
        lock: { lockId, releaseLock: true },
      });
    }

    // Step 3: Now safe to use updateDataObject for partial updates
    await droppedAsset.updateDataObject({
      [`leaderboard.${profileId}`]: `${displayName}|1`,
    });

    // Step 4: Use incrementDataObjectValue for numeric counters
    await droppedAsset.incrementDataObjectValue("totalPlays", 1, {
      analytics: [{ analyticName: "plays", profileId, uniqueKey: profileId, urlSlug }],
    });

    // Re-fetch to return current state
    await droppedAsset.fetchDataObject();

    return res.json({
      success: true,
      gameState: droppedAsset.dataObject,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleRecordPlay",
      message: "Error recording play",
      req,
      res,
    });
  }
};
```

## Why `setDataObject` Before `updateDataObject`

| Method | Behavior | When to Use |
|--------|----------|-------------|
| `setDataObject(data)` | **Replaces** the entire data object with `data` | First-time initialization; resetting data to a known state |
| `updateDataObject(data)` | **Merges** `data` into the existing object (shallow merge at dot-notation paths) | Updating specific fields on an already-initialized object |
| `incrementDataObjectValue(path, n)` | **Increments** a numeric value at the given path | Counters, scores, play counts |

If you call `updateDataObject` on an entity that has never had `setDataObject` called, the SDK may throw an error or silently produce a malformed object. Always ensure the base shape exists first.

## Locking Strategy

Locks prevent race conditions when multiple visitors trigger initialization simultaneously.

```ts
// 1-minute lock window: concurrent requests within the same minute share one lock
const lockId = `${entityId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

// 5-minute lock window: for less frequent operations like world config
const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

// Always release the lock after the operation
await entity.setDataObject(defaults, { lock: { lockId, releaseLock: true } });
```

**How it works**: The `lockId` is rounded to a time window so that multiple concurrent requests produce the same lock string. The first request acquires the lock and initializes the data. Subsequent requests within the same window either wait or skip initialization because the lock is already held. Setting `releaseLock: true` ensures the lock is freed after the operation completes.

## Variations

| Entity | Typical Default Shape | Lock Window | Scope Key |
|--------|----------------------|-------------|-----------|
| DroppedAsset | `{ leaderboard: {}, totalPlays: 0 }` | 1 minute | `assetId` |
| Visitor | `{ score: 0, itemsCollected: [], startedAt: "" }` | 1 minute | `visitorId` |
| World | `{ [sceneDropId]: { leaderboard: {}, config: {} } }` | 5 minutes | `sceneDropId` |

## Common Mistakes

- **Calling `updateDataObject` without initialization**: This is the most common bug. Always check and call `setDataObject` first if the data object is missing or malformed.
- **Using the wrong lock window**: Too short a window (e.g., 1 second) may allow duplicate initialization. Too long (e.g., 1 hour) may block legitimate updates. Use 1 minute for frequent operations and 5 minutes for infrequent ones.
- **Forgetting `releaseLock: true`**: If you omit this, the lock will remain held until it expires naturally, blocking subsequent writes.
- **Not re-fetching after `setDataObject`**: The local object in memory is not automatically updated after a set/update call. Always call `fetchDataObject()` again if you need to read the current state.
- **Overwriting with `setDataObject` instead of `updateDataObject`**: Once initialized, always use `updateDataObject` for partial changes. Calling `setDataObject` again will replace all existing data.

## Related Examples

- [get-configuration.md](./get-configuration.md) - World data object initialization with theme configuration
- [reset-game-state.md](./reset-game-state.md) - Resetting data objects with admin verification
- [leaderboard.md](./leaderboard.md) - Storing and updating leaderboard data in data objects
