# Data Models

<!--
Topia SDK apps store data using "data objects" attached to SDK entities.
Each entity type has different scope and lifetime:

- **World**: Shared across all visitors in a world. Good for global game state, configuration, leaderboards.
- **Visitor**: Scoped to a single visitor's session in a world. Good for per-user progress, inventory, preferences.
- **DroppedAsset**: Attached to a specific asset instance in the world. Good for per-asset state, content, configuration.
- **User**: Tied to a Topia user account across worlds. Good for cross-world progress, account-level data.
- **Ecosystem**: Shared across all worlds in an ecosystem. Good for global leaderboards, shared configuration.

Choose the narrowest scope that fits each piece of data.
-->

## Data Object Scope Decisions

<!-- For each piece of data your app stores, document which entity holds it and why. -->

| Data | Entity | Rationale |
|------|--------|-----------|
| [DATA_DESCRIPTION] | [World / Visitor / DroppedAsset / User / Ecosystem] | [WHY_THIS_ENTITY] |
| [DATA_DESCRIPTION] | [World / Visitor / DroppedAsset / User / Ecosystem] | [WHY_THIS_ENTITY] |
| [DATA_DESCRIPTION] | [World / Visitor / DroppedAsset / User / Ecosystem] | [WHY_THIS_ENTITY] |

<!-- Example:
| Game configuration (theme, rules) | World | Shared across all visitors, set by admin |
| Player's current score | Visitor | Per-session, resets when visitor leaves |
| Player's lifetime stats | User | Persists across worlds and sessions |
| Bulletin post content | DroppedAsset | Tied to the specific posted asset |
| Global leaderboard | Ecosystem | Shared across all worlds |
-->

## World Data Object

<!-- Data stored on the World entity. Accessed via `world.fetchDataObject()` / `world.setDataObject()` / `world.updateDataObject()`. Keyed by sceneDropId if the app supports multiple instances per world. -->

```typescript
interface WorldDataObject {
  [sceneDropId: string]: {
    [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
    [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
    [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  };
}
```

### Default Values

```typescript
const worldDataObjectDefaults: WorldDataObject[string] = {
  [PROPERTY_NAME]: [DEFAULT_VALUE],
  [PROPERTY_NAME]: [DEFAULT_VALUE],
  [PROPERTY_NAME]: [DEFAULT_VALUE],
};
```

<!-- Example:
```typescript
interface WorldDataObject {
  [sceneDropId: string]: {
    theme: string;               // Visual theme identifier
    totalTrades: number;         // Running count of completed trades
    activeOffers: Offer[];       // Currently open trade offers
    createdAt: string;           // ISO timestamp of initialization
  };
}

const worldDataObjectDefaults: WorldDataObject[string] = {
  theme: "default",
  totalTrades: 0,
  activeOffers: [],
  createdAt: new Date().toISOString(),
};
```
-->

## Visitor Data Object

<!-- Data stored on the Visitor entity. Accessed via `visitor.fetchDataObject()` / `visitor.setDataObject()` / `visitor.updateDataObject()`. Scoped to a single visitor's session in a world. -->

```typescript
interface VisitorDataObject {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

### Default Values

```typescript
const visitorDataObjectDefaults: VisitorDataObject = {
  [PROPERTY_NAME]: [DEFAULT_VALUE],
  [PROPERTY_NAME]: [DEFAULT_VALUE],
  [PROPERTY_NAME]: [DEFAULT_VALUE],
};
```

<!-- Example:
```typescript
interface VisitorDataObject {
  score: number;                   // Current session score
  completedTrades: string[];       // IDs of completed trades
  lastActiveAt: string;            // ISO timestamp of last action
}

const visitorDataObjectDefaults: VisitorDataObject = {
  score: 0,
  completedTrades: [],
  lastActiveAt: new Date().toISOString(),
};
```
-->

## DroppedAsset Data Object

<!-- Data stored on DroppedAsset entities. There are typically two types:
1. Key asset (the main interactive asset that launches the app)
2. Spawned assets (assets created dynamically by the app)
-->

### Key Asset Data Object

<!-- The key asset is the pre-placed interactive asset in the world that opens the app iframe when clicked. -->

```typescript
interface KeyAssetDataObject {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

### Default Values

```typescript
const keyAssetDataObjectDefaults: KeyAssetDataObject = {
  [PROPERTY_NAME]: [DEFAULT_VALUE],
  [PROPERTY_NAME]: [DEFAULT_VALUE],
};
```

### Spawned Asset Data Object (if applicable)

<!-- If the app dynamically drops assets into the world, define their data object shape here. -->

```typescript
interface SpawnedAssetDataObject {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

<!-- Example:
```typescript
interface KeyAssetDataObject {
  theme: string;          // Theme identifier, read during world data init
  version: number;        // Schema version for migration support
}

const keyAssetDataObjectDefaults: KeyAssetDataObject = {
  theme: "default",
  version: 1,
};

interface SpawnedAssetDataObject {
  createdBy: string;      // profileId of the creator
  content: string;        // User-generated content
  createdAt: string;      // ISO timestamp
}
```
-->

## User Data Object (if applicable)

<!-- Data stored on the User entity. Persists across worlds and sessions. Only use if you need cross-world or account-level persistence. -->

```typescript
interface UserDataObject {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

## Ecosystem Data Object (if applicable)

<!-- Data stored on the Ecosystem entity. Shared across all worlds in the ecosystem. Only use for truly global data like cross-world leaderboards. -->

```typescript
interface EcosystemDataObject {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

## Shared Types

<!-- Any TypeScript types or interfaces shared across multiple data objects or between client and server. Place these in `shared/types/`. -->

```typescript
// shared/types/[TYPE_FILE_NAME].ts

[SHARED_TYPE_DEFINITIONS]
```

<!-- Example:
```typescript
// shared/types/Offer.ts

export interface Offer {
  id: string;
  creatorProfileId: string;
  creatorDisplayName: string;
  itemOffered: string;
  itemWanted: string;
  status: "open" | "accepted" | "cancelled";
  createdAt: string;
  acceptedBy?: string;
  acceptedAt?: string;
}
```
-->

## Locking Strategy

<!--
Data objects support locking to prevent race conditions when multiple users write concurrently. Document your locking approach for each entity that has concurrent writes.

Lock ID pattern: Use a combination of a unique identifier and a rounded timestamp to create time-bucketed locks. The timestamp rounding determines the lock window duration.

Common patterns:
- 1-minute lock: `Math.round(new Date().getTime() / 60000) * 60000`
- 5-minute lock: `Math.round(new Date().getTime() / 300000) * 300000`
-->

| Entity | Lock ID Pattern | Lock Window | When Used |
|--------|----------------|-------------|-----------|
| [ENTITY] | `[LOCK_ID_TEMPLATE]` | [DURATION] | [SCENARIO] |
| [ENTITY] | `[LOCK_ID_TEMPLATE]` | [DURATION] | [SCENARIO] |

<!-- Example:
| Entity | Lock ID Pattern | Lock Window | When Used |
|--------|----------------|-------------|-----------|
| World | `${sceneDropId}-${roundedTimestamp}` | 5 minutes | Initialization, updating active offers |
| Visitor | `${visitorId}-${roundedTimestamp}` | 1 minute | Updating score, completing trades |
-->

### Lock Usage Example

```typescript
// [DESCRIBE_WHEN_THIS_LOCK_IS_USED]
const lockId = `[LOCK_ID_TEMPLATE]`;
await [ENTITY].setDataObject(
  [DEFAULT_DATA],
  { lock: { lockId, releaseLock: true } }
);
```
