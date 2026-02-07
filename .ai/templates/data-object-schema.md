# Data Object Schema Design Template

Use this template when designing data object schemas for Topia SDK apps. Data objects are JSON blobs stored on SDK entities (World, DroppedAsset, Visitor, User, Ecosystem) and serve as the primary persistence mechanism for interactive apps.

## Entity Selection: Where Should Your Data Live?

### Decision Matrix

| Factor | World | DroppedAsset | Visitor | User | Ecosystem |
|--------|-------|-------------|---------|------|-----------|
| **Scope** | Shared across all visitors in a world | Tied to a specific placed asset | Per-visitor per-world session | Per-user across all worlds | Across all worlds in ecosystem |
| **Persistence** | Until world is deleted | Until asset is removed | Duration of visit (ephemeral) | Permanent across sessions | Permanent across worlds |
| **Best for** | Game state, leaderboards, configuration | Asset-specific state, per-asset counters | Active session data, temp progress | Cross-world profile, lifetime stats | Shared config, global inventory |
| **Accessed by** | All visitors in the world | Any visitor interacting with the asset | Only the visiting user | Only the user themselves | Any app in the ecosystem |
| **Size limit** | Large (world-level) | Medium (per-asset) | Small (session-scoped) | Medium (per-user) | Large (ecosystem-level) |
| **Race condition risk** | High (many writers) | Medium (multiple clickers) | Low (single writer) | Low (single writer) | Low (admin-only writes) |

### When to Use Each Entity

**World data object** -- Use when:
- Data must be shared across all visitors (leaderboards, game config, shared state)
- You need scene-scoped configuration keyed by `sceneDropId`
- Multiple assets in the same world need to read the same data

**DroppedAsset data object** -- Use when:
- Data is specific to one interactive asset instance
- Each placed copy of an asset needs its own state
- You need per-asset counters, settings, or content
- This is the "key asset" pattern for storing game state

**Visitor data object** -- Use when:
- Data is per-visitor and only needed during the active session
- Tracking temporary progress (current quiz answers, active selections)
- Data can be lost when the visitor leaves and returns

**User data object** -- Use when:
- Data must persist across visits and worlds
- Lifetime stats, cross-world achievements, user preferences
- Data is private to the individual user

**Ecosystem data object** -- Use when:
- Configuration shared across all worlds in the ecosystem
- Global settings managed by admins only

## TypeScript Interface Template

Define your data object shape with JSDoc comments explaining each field:

```ts
// server/types/MyFeatureDataObject.ts

/**
 * Data object schema for [Feature Name]
 *
 * Stored on: [World | DroppedAsset | Visitor | User]
 * Scope: [per-world | per-asset | per-visitor | per-user]
 * Key pattern: [describe keying strategy, e.g., "keyed by sceneDropId at top level"]
 */

/** Individual player entry in the leaderboard */
interface PlayerEntry {
  /** Display name of the player at time of entry */
  displayName: string;
  /** Total score accumulated */
  score: number;
  /** ISO timestamp of last activity */
  lastUpdated: string;
  /** Whether the player has completed the challenge */
  isComplete: boolean;
}

/** Configuration for a single scene instance */
interface SceneConfig {
  /** Visual theme identifier */
  theme: string;
  /** Maximum number of rounds */
  maxRounds: number;
  /** Whether the game is currently active */
  isActive: boolean;
}

/** Top-level data object stored on the World entity */
export interface MyFeatureWorldDataObject {
  [sceneDropId: string]: {
    /** Scene-specific configuration */
    config: SceneConfig;
    /** Leaderboard entries keyed by profileId */
    leaderboard: Record<string, string>;
    /** Total number of games played in this scene */
    totalGames: number;
  };
}

/** Data object stored on the DroppedAsset (key asset) */
export interface MyFeatureAssetDataObject {
  /** Number of times this asset has been interacted with */
  interactionCount: number;
  /** Per-player state keyed by profileId */
  profiles: Record<string, PlayerEntry>;
  /** Timestamp of last reset */
  lastResetAt: string;
}

/** Data object stored on the Visitor entity */
export interface MyFeatureVisitorDataObject {
  /** Current round the visitor is on */
  currentRound: number;
  /** Answers selected in the current session */
  selectedAnswers: string[];
  /** Session start timestamp */
  sessionStartedAt: string;
}
```

## Default Values Object Template

Every data object needs a defaults object that defines the initial shape. This is used during initialization to prevent `updateDataObject` from failing on missing paths.

```ts
// server/utils/defaults.ts

/** Default world data object for a new scene */
export const defaultSceneData = {
  config: {
    theme: "default",
    maxRounds: 5,
    isActive: true,
  },
  leaderboard: {},
  totalGames: 0,
};

/** Default dropped asset data object */
export const defaultAssetData = {
  interactionCount: 0,
  profiles: {},
  lastResetAt: "",
};

/** Default visitor data object */
export const defaultVisitorData = {
  currentRound: 0,
  selectedAnswers: [],
  sessionStartedAt: "",
};
```

## Initialization Function Template

Follow the pattern from `initializeDroppedAssetDataObject.ts`. Always check for existing data before overwriting.

### DroppedAsset Initialization

```ts
// server/utils/droppedAssets/initializeMyFeatureDataObject.ts
import { IDroppedAsset } from "../../types/index.js";
import { standardizeError } from "../index.js";

const defaultAssetData = {
  interactionCount: 0,
  profiles: {},
  lastResetAt: "",
};

/**
 * Initialize the data object for a dropped asset if it doesn't already exist.
 * Uses a lock to prevent race conditions when multiple visitors interact simultaneously.
 */
export const initializeMyFeatureDataObject = async (droppedAsset: IDroppedAsset) => {
  try {
    // Check if the data object already has the expected structure
    if (!droppedAsset?.dataObject?.interactionCount && droppedAsset?.dataObject?.interactionCount !== 0) {
      // Generate a lock ID that rounds to the nearest minute to prevent duplicate initialization
      const lockId = `${droppedAsset.id}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

      await droppedAsset
        .setDataObject(defaultAssetData, { lock: { lockId, releaseLock: true } })
        .catch(() => console.warn("Unable to acquire lock, another process may be updating the data object"));
    }

    return;
  } catch (error: any) {
    return standardizeError(error);
  }
};
```

### World Data Object Initialization (Scene-Scoped)

```ts
// server/utils/initializeWorldDataObject.ts
import { Credentials } from "../types/index.js";
import { World, standardizeError } from "./index.js";

const defaultSceneData = {
  config: { theme: "default", maxRounds: 5, isActive: true },
  leaderboard: {},
  totalGames: 0,
};

/**
 * Initialize world data object for a specific scene if it doesn't exist.
 * World data objects are keyed by sceneDropId to support multiple scenes.
 */
export const initializeWorldDataObject = async (credentials: Credentials) => {
  try {
    const { sceneDropId, urlSlug } = credentials;

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();

    const dataObject = world.dataObject as Record<string, any>;

    // Check if this scene already has data
    if (!dataObject?.[sceneDropId]) {
      const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

      if (!world.dataObject) {
        // No data object at all — set from scratch
        await world.setDataObject(
          { [sceneDropId]: defaultSceneData },
          { lock: { lockId, releaseLock: true } },
        );
      } else {
        // Data object exists but missing this scene
        await world.updateDataObject(
          { [sceneDropId]: defaultSceneData },
          { lock: { lockId, releaseLock: true } },
        );
      }

      // Re-fetch after initialization
      await world.fetchDataObject();
    }

    return {
      world,
      sceneData: (world.dataObject as Record<string, any>)[sceneDropId],
    };
  } catch (error) {
    throw standardizeError(error);
  }
};
```

## Locking Strategy Selection Guide

Choose your lock duration based on the update frequency and contention level:

| Lock Duration | Rounding Divisor | Use When | Example |
|---------------|-----------------|----------|---------|
| ~10 seconds | `10000` | High-frequency updates (rapid clicks, counters) | Incrementing a click counter |
| ~1 minute | `60000` | Standard operations (most common) | Initializing data objects, updating player state |
| ~5 minutes | `300000` | Slow or infrequent operations | First-time world setup, schema migration |

```ts
// Lock ID formula: `${uniqueScope}-${roundedTimestamp}`
// The uniqueScope should identify WHAT is being locked (asset, scene, etc.)
// The rounded timestamp determines how long before the lock naturally expires

// Asset-scoped lock (prevents concurrent updates to the same asset)
const lockId = `${assetId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

// Scene-scoped lock (prevents concurrent updates to the same scene data)
const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

// Player-scoped lock (prevents concurrent updates to the same player's data)
const lockId = `${profileId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
```

## Naming Conventions for Data Keys

Follow these conventions for consistency across the codebase:

| Convention | Example | When to Use |
|-----------|---------|-------------|
| **camelCase** | `interactionCount`, `lastUpdated` | All data object property names |
| **sceneDropId as top key** | `{ [sceneDropId]: { ... } }` | World data objects with per-scene data |
| **profileId as nested key** | `{ profiles: { [profileId]: ... } }` | Per-player data within a shared object |
| **Dot notation for updates** | `"leaderboard.${profileId}"` | Partial updates via `updateDataObject` |
| **Pipe-delimited strings** | `"Alice\|42\|true"` | Leaderboard entries (compact storage) |

### Naming Rules

- Use descriptive, domain-specific names: `leaderboard` not `data`, `interactionCount` not `count`
- Prefix boolean fields with `is` or `has`: `isActive`, `hasCompleted`
- Use past tense for timestamps: `lastUpdated`, `createdAt`, `sessionStartedAt`
- Use singular for single values, plural for collections: `theme` vs `profiles`

## Scope Patterns

### Per-Scene Keying (World Data Objects)

Use `sceneDropId` as the top-level key when the same world may have multiple instances of your interactive app:

```ts
// World data object structure
{
  "scene-drop-id-abc": {
    config: { theme: "beach", maxRounds: 5 },
    leaderboard: { "profile-123": "Alice|42|true" },
    totalGames: 15,
  },
  "scene-drop-id-xyz": {
    config: { theme: "space", maxRounds: 10 },
    leaderboard: {},
    totalGames: 0,
  },
}

// Reading scene data
const sceneData = (world.dataObject as Record<string, any>)?.[sceneDropId];

// Updating scene data (dot notation)
await world.updateDataObject({
  [`${sceneDropId}.totalGames`]: newTotal,
  [`${sceneDropId}.leaderboard.${profileId}`]: resultString,
});
```

### Per-Player Keying (DroppedAsset or World Data Objects)

Use `profileId` to store per-player data within a shared object:

```ts
// DroppedAsset data object with per-player entries
{
  interactionCount: 42,
  profiles: {
    "profile-123": {
      displayName: "Alice",
      score: 42,
      isComplete: true,
    },
    "profile-456": {
      displayName: "Bob",
      score: 28,
      isComplete: false,
    },
  },
}

// Updating a specific player's data (dot notation)
await droppedAsset.updateDataObject({
  [`profiles.${profileId}.score`]: newScore,
  [`profiles.${profileId}.isComplete`]: true,
});
```

### Combined Scene + Player Keying

For world data objects that need both scene isolation and per-player tracking:

```ts
// World data object with scene and player scoping
{
  "scene-drop-id-abc": {
    leaderboard: {
      "profile-123": "Alice|42|true",
      "profile-456": "Bob|28|false",
    },
    config: { theme: "beach" },
  },
}

// Update a player's leaderboard entry within a scene
await world.updateDataObject({
  [`${sceneDropId}.leaderboard.${profileId}`]: `${displayName}|${score}|${isComplete}`,
});
```

## Migration Strategy for Schema Changes

When you need to change the shape of an existing data object:

### 1. Backward-Compatible Addition (Preferred)

Add new fields with defaults. Existing data continues to work.

```ts
// Old schema
interface AssetDataV1 {
  interactionCount: number;
}

// New schema — added score field with backward compatibility
interface AssetDataV2 {
  interactionCount: number;
  score: number; // New field
}

// In your initialization function, check and add missing fields
const initializeData = async (droppedAsset: IDroppedAsset) => {
  await droppedAsset.fetchDataObject();
  const data = droppedAsset.dataObject as Partial<AssetDataV2>;

  if (data && data.score === undefined) {
    // Add the new field without overwriting existing data
    await droppedAsset.updateDataObject({ score: 0 });
  }
};
```

### 2. Format Migration (When Structure Changes)

When changing the shape of existing data (e.g., object to pipe-delimited string):

```ts
// Migration function — run once during data object fetch
const migrateDataObject = async (droppedAsset: IDroppedAsset) => {
  await droppedAsset.fetchDataObject();
  const data = droppedAsset.dataObject as Record<string, any>;

  // Check if migration is needed by looking for old format
  if (data?.profiles && !data?.leaderboard) {
    // Convert old object format to new pipe-delimited format
    const leaderboard: Record<string, string> = {};
    for (const profileId in data.profiles) {
      const { displayName, score } = data.profiles[profileId];
      leaderboard[profileId] = `${displayName}|${score}`;
    }

    // Write new format and remove old
    const lockId = `migrate-${droppedAsset.id}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;
    await droppedAsset.setDataObject(
      { ...data, leaderboard, profiles: undefined },
      { lock: { lockId, releaseLock: true } },
    );
  }
};
```

### 3. Version-Stamped Schema

For major changes, add a version field to enable future migrations:

```ts
interface VersionedDataObject {
  /** Schema version for migration tracking */
  _schemaVersion: number;
  // ... rest of your fields
}

const CURRENT_SCHEMA_VERSION = 2;

const defaultData: VersionedDataObject = {
  _schemaVersion: CURRENT_SCHEMA_VERSION,
  // ... defaults
};

const migrateIfNeeded = async (droppedAsset: IDroppedAsset) => {
  await droppedAsset.fetchDataObject();
  const data = droppedAsset.dataObject as Partial<VersionedDataObject>;

  const version = data?._schemaVersion ?? 1;

  if (version < 2) {
    // Apply v1 -> v2 migration
    // ...
    await droppedAsset.updateDataObject({ _schemaVersion: 2 });
  }

  // Add more version checks as schema evolves
};
```

### Migration Best Practices

- Always migrate forward, never backward
- Run migration checks inside initialization functions (lazy migration)
- Use locks during migration to prevent concurrent migrations
- Log migrations: `console.log("Migrating data object from v1 to v2 for asset:", assetId)`
- Keep old data as a fallback during the migration period if possible
- Test migration with both empty and populated data objects

## Checklist

Before finalizing a data object schema, verify:

- [ ] Correct entity chosen (World vs DroppedAsset vs Visitor vs User)
- [ ] TypeScript interface defined with JSDoc comments
- [ ] Default values object created
- [ ] Initialization function follows the lock-and-check pattern
- [ ] Locking strategy chosen based on update frequency
- [ ] Key naming follows camelCase conventions
- [ ] Scope pattern documented (per-scene, per-player, or combined)
- [ ] Migration strategy defined for future schema changes
- [ ] `updateDataObject` calls use dot notation for nested updates
- [ ] Data object type added to `server/types/` and exported from index
