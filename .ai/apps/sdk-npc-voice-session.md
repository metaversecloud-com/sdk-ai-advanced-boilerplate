# SDK NPC Voice Session

**Repo**: `metaversecloud-com/sdk-npc-voice-session`
**SDK Version**: `@rtsdk/topia@^0.17.7`
**Quality**: Low — minimal/demo app with clean boilerplate structure but placeholder functionality, no actual NPC voice features implemented, no tests
**Last Analyzed**: 2026-02-07

## What It Does

A boilerplate-style app with a single game state endpoint, time-bucketed locking, and an external leaderboard service integration via HTTP POST. Despite the name, no NPC voice or session features are implemented — the app serves primarily as a clean starting point showing how to wire up SDK calls with external service integrations and world-level messaging.

### Implemented Features

- Game state fetch with locking
- External leaderboard service submission via HTTP POST
- World-level toast and particle effects
- Admin permission check

## Architecture

```
server/
├── controllers/
│   ├── handleGetGameState.ts       Fetch asset + data object with lock
│   └── handleIsAdmin.ts            Admin permission check
├── utils/
│   ├── topiaInit.ts                SDK factory exports
│   ├── getCredentials.ts           Credential extraction
│   └── errorHandler.ts             Standardized error handling
└── routes.ts                       3 endpoints
client/
└── (standard React boilerplate)
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/` | Health check |
| GET | `/api/game-state` | Fetch game state with locking |
| GET | `/api/is-admin` | Check admin permissions |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(id, urlSlug, { credentials })` | Fetch the interactive asset |
| `droppedAsset.setDataObject(data, { lock })` | Initialize data object with time-bucketed lock |
| `droppedAsset.updateDataObject(data, { lock, analytics })` | Update game state |
| `World.create(urlSlug, { credentials })` | World instance for messaging |
| `world.triggerParticle({ name, duration })` | Visual effects |
| `world.fireToast({ groupId, title, text })` | World-level notifications |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Fetch visitor for admin check |

## Key Patterns

### 1. Time-Bucketed Locking (60-Second Windows)

Uses `Math.round(Date.now() / 60000)` as lockId to auto-expire locks after ~60 seconds. Prevents stale locks from blocking state updates:

```ts
const lockId = `${visitorId}-${visitorId}-${Math.round(Date.now() / 60000)}`;

await droppedAsset.setDataObject(
  { ...initialState },
  { lock: { lockId, releaseLock: false } }
);
```

### 2. External Leaderboard Service Integration (UNIQUE)

Posts scores to an external HTTP leaderboard service rather than managing leaderboard state in data objects:

```ts
const postLeaderboardEntry = async (entry: LeaderboardEntry) => {
  const response = await fetch(LEADERBOARD_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LEADERBOARD_API_KEY}`,
    },
    body: JSON.stringify({
      visitorId: entry.visitorId,
      displayName: entry.displayName,
      score: entry.score,
      worldSlug: entry.urlSlug,
    }),
  });
  return response.json();
};
```

### 3. World-Level Toast Messaging

Broadcasts notifications to all visitors in the world:

```ts
const world = World.create(urlSlug, { credentials });
await world.fireToast({
  groupId: "game-notification",
  title: "Game Update",
  text: `${playerName} scored ${points} points!`,
});
```

### 4. Clean Controller Boilerplate

Follows the standard controller template with try/catch, credentials extraction, and errorHandler:

```ts
export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, assetId, urlSlug } = credentials;

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    await droppedAsset.fetchDataObject();

    return res.json({ success: true, gameState: droppedAsset.dataObject });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error fetching game state",
      req,
      res,
    });
  }
};
```

## Data Structure

```ts
// Placeholder — minimal data shape
type GameState = {
  score: number;
  playerName: string;
  lastUpdated: string;
  isActive: boolean;
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Quick Prototypes** | Clean boilerplate, minimal setup, fast starting point |
| **Single-Action / Trigger-Based** | One-endpoint game state pattern, toast notifications |
| **External Integrations** | HTTP POST to external services (leaderboards, analytics, webhooks) |
| **Any game type** | Time-bucketed locking, controller template, world messaging |

## Weaknesses

- No actual NPC voice or session features despite the name
- Placeholder data types with minimal fields
- No tests
- Only 3 endpoints — minimal functionality
- External leaderboard service URL is hardcoded/env-dependent with no fallback
- No retry logic on external service calls
- No input validation

## Unique Examples Worth Extracting

1. **External Service Integration** — HTTP POST to external leaderboard service with auth headers. Reusable pattern for any app that needs to integrate with third-party APIs.
2. **Time-Bucketed Locking** — 60-second auto-expiring locks via `Math.round(Date.now() / 60000)`. Already documented in examples but this is a clean, minimal implementation.
3. **World Toast Broadcasting** — `world.fireToast` for game-wide notifications. Simple pattern for any multiplayer experience.
