# SDK Race

**Repo**: [metaversecloud-com/sdk-race](https://github.com/metaversecloud-com/sdk-race)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-race/`
**Quality**: Medium-High — real-time SSE/Redis multiplayer, comprehensive badge system, sound effects, but JavaScript (no TypeScript), several bugs, no tests
**SDK Version**: `@rtsdk/topia@^0.19.3`
**Language**: JavaScript (not TypeScript)

## What It Does

A real-time multiplayer racing game. Players navigate through numbered checkpoints in sequential order, competing for fastest completion time. Uses Server-Sent Events (SSE) via Redis pub/sub for real-time checkpoint updates. Features 8+ badges, audio feedback, track switching, and a 3-minute race timeout.

### Game Mechanics

- Race course with start/finish line + N numbered checkpoints
- Checkpoints must be hit in order (1, 2, 3, ... N, back to start)
- Wrong checkpoint order triggers error toast + "Never Give Up" badge eligibility
- Live client-side timer at 50ms intervals (MM:SS:CC centiseconds)
- 3-minute auto-expiry
- Track switching with 30-minute cooldown (scene replacement)

### User Flow

1. Home screen -> "Start Race" button
2. Countdown "3... 2... 1... Go!" with audio beeps
3. Race in progress -> live timer, checkpoint checklist updating via SSE
4. Race completed -> final time, badge modal popup, "Play Again"
5. Leaderboard (top 20) + Badges tabs

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/race/game-state` | Full game state + tracks + inventory |
| POST | `/api/race/start-race` | Start race, teleport to start, reset checkpoints |
| POST | `/api/race/checkpoint-entered` | Webhook: checkpoint validation |
| GET | `/api/leaderboard` | Latest leaderboard |
| POST | `/api/race/cancel-race` | Cancel active race |
| POST | `/api/race/reset-game` | Admin: reset all data |
| POST | `/api/race/switch-track` | Switch race track scene |
| GET | `/api/visitor-inventory` | Badge inventory |
| GET | `/api/events` | SSE endpoint for real-time updates |

## Data Structures

### World Data Object
```typescript
{
  [sceneDropId]: {
    numberOfCheckpoints: number;
    leaderboard: {
      [profileId]: "displayName|MM:SS:CC";
    };
    trackName?: string;
    position?: { x: number; y: number };
    trackLastSwitchedDate?: number;
  };
}
```

### Visitor Data Object
```typescript
{
  racesCompleted: number;
  ["{urlSlug}-{sceneDropId}"]: {
    checkpoints: { [index: number]: boolean };
    elapsedTime: string | null;
    highScore: string | null;
    startTimestamp: number | null;
  };
}
```

### Redis Cached State (per profileId)
```typescript
{
  checkpoints: { [index: number]: boolean };
  wasWrongCheckpointEntered: boolean;
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `visitor.moveVisitor({ shouldTeleportVisitor, x, y })` | Teleport to start line |
| `visitor.triggerParticle({ name: "trophy_float", duration: 3 })` | Completion effect |
| `visitor.grantInventoryItem(inventoryItem, 1)` | Award badges |
| `visitor.fireToast({ groupId, title, text })` | Checkpoint/badge notifications |
| `visitor.closeIframe(assetId)` | Close on track switch |
| `world.triggerActivity({ type: GAME_ON, assetId })` | Race start activity |
| `world.triggerActivity({ type: GAME_HIGH_SCORE, assetId })` | New high score |
| `world.dropScene({ allowNonAdmins, sceneId, position, sceneDropId })` | Drop new track |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Remove old track |

## Key Patterns

### Real-Time SSE via Redis Pub/Sub (UNIQUE PATTERN)
```javascript
// Server: Redis subscriber forwards events to matching SSE connections
subscribe: async function (channel) {
  await this.subscriber.subscribe(channel, (message) => {
    const data = JSON.parse(message);
    this.connections.forEach(({ res }) => {
      const { profileId } = res.req.query;
      if (data.profileId === profileId) {
        res.write(`retry: 5000\ndata: ${JSON.stringify(data)}\n\n`);
      }
    });
  });
}

// Client: EventSource consumer
const eventSource = new EventSource(`/api/events?profileId=${profileId}`);
eventSource.onmessage = function (event) {
  const data = JSON.parse(event.data);
  if (data.checkpointsCompleted) { /* wrong checkpoint */ }
  else { /* correct checkpoint */ }
};
```

### Sequential Checkpoint Validation
```javascript
// Non-zero checkpoints: check previous was completed
if (checkpointNumber > 1 && !cachedCheckpoints[checkpointNumber - 2]) {
  // Wrong order -> publish wrong-checkpoint event, set wasWrongCheckpointEntered
}
// Checkpoint 0 (finish): verify all checkpoints completed
```

### 8+ Badge Achievement System
| Badge | Condition |
|-------|-----------|
| Race Rookie | First race completion |
| Top 3 Racer | High score in top 3 |
| Speed Demon | Finish < 30 seconds |
| Slow & Steady | Finish > 2 minutes |
| Race Pro | 100 total races |
| Race Expert | 1000 total races |
| Never Give Up | Complete after wrong checkpoint |
| [Track Name] | Complete specific track (dynamic) |

### Audio Queue System
```javascript
// Client maintains audio queue processed sequentially
// positive beep (correct checkpoint), negative (wrong), success fanfare (completion)
// Each audio's onended triggers next in queue
```

### Track Switching (Scene Replacement)
```javascript
// 1. Find container asset for position reference
// 2. Delete all existing race assets
// 3. Close iframe
// 4. Drop new scene at same position
// 5. Update world data with new checkpoint count + empty leaderboard
// 6. Delete triggering asset
await World.deleteDroppedAssets(urlSlug, droppedAssetIds, secret, credentials);
await world.dropScene({ allowNonAdmins: true, sceneId, position, sceneDropId });
```

### Screen Manager Pattern (State Machine)
```javascript
// 7 screens managed via reducer dispatch instead of URL routing:
// NEW_GAME, ON_YOUR_MARK, RACE_IN_PROGRESS, RACE_COMPLETED,
// LEADERBOARD, BADGES, SWITCH_TRACK
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Racing / Competition** | Real-time SSE/Redis, sequential checkpoint validation, 3-minute timeout |
| **Collection / Scavenger Hunt** | Ordered step validation, dynamic badge system (track + milestone) |
| **Trivia / Quiz** | Timed mechanics, audio feedback system, competitive leaderboard |
| **Social / Collaborative** | Real-time event streaming for live multiplayer updates |
| **Any game type** | Scene replacement (swap environments), Redis caching for performance |

## Weaknesses

- Bug: track switch cooldown divides by `100 * 60` instead of `1000 * 60` (actual cooldown ~3 min not 30)
- Missing `errorHandler` import in `checkpointEntered.js`
- Missing `standardizeError` import in `getInventoryItems.js`
- Undefined `keyAssetId` in `getVisitor.js`
- All JavaScript (no TypeScript)
- Leaderboard `.slice(0, 20)` result not reassigned (bug)
- No tests
