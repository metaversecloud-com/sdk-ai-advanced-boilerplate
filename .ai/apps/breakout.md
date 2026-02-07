# Breakout

**Repo**: `metaversecloud-com/breakout`
**SDK Version**: `@rtsdk/topia@^0.17.7`
**Quality**: High complexity — most sophisticated grouping and teleportation logic of any SDK app, but debugger statements left in code, in-memory state, no tests
**Last Analyzed**: 2026-02-07

## What It Does

A breakout room management system: an admin configures groups and rounds, the system fetches visitors in a zone, generates fair round-robin pairings that minimize repeated matchups, teleports groups to private zones, and manages round transitions with timers. Designed for workshops, classes, and facilitated events where participants need structured small-group interactions.

### User Flow

1. Admin opens the app and configures: number of groups, round duration, total rounds
2. Admin starts a session — system fetches all visitors in the activity zone
3. Fair pairing algorithm generates group assignments for each round
4. Visitors are teleported to private zones with random position offsets
5. Timer counts down; when a round ends, visitors return and new groups form
6. Session ends after all rounds complete

## Architecture

```
server/
├── controllers/
│   ├── handleGetGameState.ts           Fetch session state
│   ├── handleStartSession.ts           Admin starts breakout session
│   ├── handleAdvanceRound.ts           Move to next round
│   ├── handleEndSession.ts             End session, return all visitors
│   ├── handleGetVisitorsInZone.ts      Fetch visitors for grouping
│   ├── handleGeneratePairings.ts       Fair round-robin algorithm
│   ├── handleTeleportGroups.ts         Move groups to private zones
│   ├── handleIsAdmin.ts               Admin permission check
│   ├── handleWebhookEnterZone.ts       Webhook: visitor enters zone
│   └── handleWebhookSetup.ts          Webhook: admin credential update
├── services/
│   └── sessionManager.ts              In-memory session state + cleanup
├── utils/
│   ├── topiaInit.ts                   SDK factory exports
│   ├── getCredentials.ts              Credential extraction
│   └── errorHandler.ts                Standardized error handling
└── routes.ts                          11 endpoints
client/
├── components/
│   ├── AdminPanel.tsx                 Session configuration UI
│   ├── RoundTimer.tsx                 Countdown display
│   ├── GroupDisplay.tsx               Current group assignments
│   └── SessionStatus.tsx             Active/inactive session state
└── pages/
    └── Home.tsx                       Main app view
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/` | Health check |
| GET | `/api/game-state` | Fetch current session state |
| GET | `/api/is-admin` | Admin permission check |
| POST | `/api/start-session` | Admin starts breakout session |
| POST | `/api/advance-round` | Move to next round |
| POST | `/api/end-session` | End session early |
| POST | `/api/visitors-in-zone` | Fetch visitors in activity zone |
| POST | `/api/generate-pairings` | Generate fair group pairings |
| POST | `/api/teleport-groups` | Teleport groups to private zones |
| POST | `/api/webhook/enter-zone` | Webhook: visitor enters zone |
| POST | `/api/webhook/setup` | Webhook: admin credential refresh |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `WorldActivity.create(urlSlug, { credentials })` | Create world activity instance |
| `worldActivity.fetchVisitorsInZone({ droppedAssetId, shouldIncludeAdminPermissions })` | Get all visitors in a specific zone |
| `DroppedAsset.get(id, urlSlug, { credentials })` | Fetch interactive asset |
| `droppedAsset.updateDataObject(data, { lock, analytics })` | Session state persistence |
| `droppedAsset.updatePrivateZone({ isPrivateZone, isPrivateZoneChatDisabled, privateZoneUserCap })` | Configure zone privacy and capacity |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Fetch visitor data |
| `visitor.moveVisitor({ x, y, shouldTeleportVisitor })` | Teleport to breakout room |
| `visitor.openIframe({ link, title, width, height })` | Open app UI for visitor |
| `visitor.closeIframe()` | Close app UI |
| `World.create(urlSlug, { credentials })` | World instance |
| `world.triggerParticle({ name, duration })` | Visual effects on round transitions |
| `world.triggerActivity({ type, assetId })` | Activity state broadcast |

## Key Patterns

### 1. Fair Round-Robin Pairing Algorithm (UNIQUE)

Generates group assignments across multiple rounds, minimizing repeated pairings. Most complex algorithm in any analyzed SDK app:

```ts
const generateFairPairings = (
  visitors: string[],
  numGroups: number,
  numRounds: number
): Round[] => {
  const rounds: Round[] = [];
  const pairingHistory: Map<string, Set<string>> = new Map();

  for (let round = 0; round < numRounds; round++) {
    const groups: string[][] = Array.from({ length: numGroups }, () => []);
    const unassigned = [...visitors];

    // Score each possible assignment by how many times these visitors
    // have already been grouped together
    for (const visitor of shuffleArray(unassigned)) {
      let bestGroup = 0;
      let bestScore = Infinity;

      for (let g = 0; g < numGroups; g++) {
        if (groups[g].length >= Math.ceil(visitors.length / numGroups)) continue;
        const score = groups[g].reduce((sum, member) => {
          return sum + (pairingHistory.get(visitor)?.has(member) ? 1 : 0);
        }, 0);
        if (score < bestScore) {
          bestScore = score;
          bestGroup = g;
        }
      }

      groups[bestGroup].push(visitor);
    }

    // Update pairing history
    for (const group of groups) {
      for (const a of group) {
        for (const b of group) {
          if (a !== b) {
            if (!pairingHistory.has(a)) pairingHistory.set(a, new Set());
            pairingHistory.get(a)!.add(b);
          }
        }
      }
    }

    rounds.push({ roundNumber: round + 1, groups });
  }

  return rounds;
};
```

### 2. Private Zone Configuration for Breakout Rooms

Dynamically configures dropped assets as private zones with capacity limits:

```ts
await droppedAsset.updatePrivateZone({
  isPrivateZone: true,
  isPrivateZoneChatDisabled: false,
  privateZoneUserCap: groupSize + 1, // +1 for facilitator
});

// Teardown: revert to public zone
await droppedAsset.updatePrivateZone({
  isPrivateZone: false,
  isPrivateZoneChatDisabled: false,
  privateZoneUserCap: 0,
});
```

### 3. Visitor Teleportation with Random Offsets

Teleports group members to a zone with random position offsets to prevent stacking:

```ts
const teleportGroupToZone = async (group: string[], zoneCenter: Position) => {
  await Promise.allSettled(
    group.map(async (visitorId) => {
      const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
      const offset = {
        x: (Math.random() - 0.5) * 200, // Random spread within zone
        y: (Math.random() - 0.5) * 200,
      };
      await visitor.moveVisitor({
        x: zoneCenter.x + offset.x,
        y: zoneCenter.y + offset.y,
        shouldTeleportVisitor: true,
      });
    })
  );
};
```

### 4. Promise.allSettled for Resilient Batch Operations

Uses `Promise.allSettled` instead of `Promise.all` so one failed teleport does not block others:

```ts
const results = await Promise.allSettled(
  groups.map((group, index) =>
    teleportGroupToZone(group, zonePositions[index])
  )
);

const failures = results.filter(r => r.status === "rejected");
if (failures.length > 0) {
  console.warn(`${failures.length} group teleports failed`);
}
```

### 5. In-Memory Session Manager with Cleanup Interval

Manages active sessions server-side with periodic cleanup of expired sessions:

```ts
class SessionManager {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity > 30 * 60 * 1000) {
          this.sessions.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }
}
```

### 6. Webhook-Driven Admin Credential Updates

Setup webhook refreshes admin credentials when the app is reconfigured:

```ts
export const handleWebhookSetup = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    // Store admin credentials for session management
    sessionManager.updateAdminCredentials(credentials.assetId, credentials);
    return res.json({ success: true });
  } catch (error) {
    return errorHandler({ error, functionName: "handleWebhookSetup", message: "Setup webhook error", req, res });
  }
};
```

### 7. WorldActivity.fetchVisitorsInZone

Uses `WorldActivity` class (unique to this app) to fetch all visitors within a specific zone:

```ts
const worldActivity = await WorldActivity.create(urlSlug, { credentials });
const visitors = await worldActivity.fetchVisitorsInZone({
  droppedAssetId: zoneAssetId,
  shouldIncludeAdminPermissions: true,
});
// Returns array of visitor objects within the zone boundary
```

## Data Structure

```ts
type Session = {
  id: string;
  adminCredentials: Credentials;
  config: {
    numGroups: number;       // Max 16
    numRounds: number;       // Max 25
    roundDuration: number;   // Seconds
  };
  currentRound: number;
  rounds: Round[];
  visitors: string[];
  isActive: boolean;
  lastActivity: number;
};

type Round = {
  roundNumber: number;
  groups: string[][];        // Array of groups, each an array of visitorIds
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Group / Team-Based** | Fair pairing algorithm, group assignment, team teleportation |
| **Tournament / Multi-Round** | Round progression, pairing history tracking, session management |
| **Zone-Based Activities** | Private zone configuration, visitor-in-zone fetching, zone capacity limits |
| **Timed Challenges** | Round timers, auto-advance, session cleanup |
| **Admin-Managed Events** | Admin panel, session start/end, webhook credential updates |
| **Education / Workshop** | Breakout rooms, facilitated small-group interactions, structured rotations |

## Weaknesses

- `debugger` statements left in production code
- In-memory session state lost on server restart (no data object persistence for sessions)
- Hard-coded limits: max 16 groups, max 25 rounds
- No tests of any kind
- No input validation on group/round configuration
- Race condition possible if admin advances round while teleports are in progress
- No graceful handling if visitors leave the world mid-session

## Unique Examples Worth Extracting

1. **Fair Round-Robin Pairing Algorithm** — Minimizes repeated groupings across rounds. Novel pattern not in any existing example. Reusable for matchmaking, team rotation, and workshop facilitation.
2. **Private Zone Management** — `updatePrivateZone` with dynamic capacity. New SDK method pattern for creating temporary private spaces.
3. **Batch Teleportation with Random Offsets** — `Promise.allSettled` + `moveVisitor` with offset spread. Reusable for any group movement scenario.
4. **WorldActivity.fetchVisitorsInZone** — New SDK class for zone-aware visitor queries. Important for any zone-triggered feature.
