# SDK Wiggle

**Repo**: `metaversecloud-com/sdk-wiggle`
**SDK Version**: `@rtsdk/topia@^0.15.8`
**Quality**: Medium — real-time multiplayer snake game with Lance.gg game engine, but ES5/Babel (no TypeScript), no persistence, no tests
**Last Analyzed**: 2026-02-07

## What It Does

A real-time multiplayer snake game powered by the Lance.gg networked physics engine and Socket.io. Players grow a snake by collecting food while avoiding collisions with other players. The game uses Topia's landmark zones to split the experience: visitors in a "play" zone join as active players, while those outside spectate. AI bots fill empty slots with random movement patterns.

### Game Mechanics

- Real-time snake movement on a canvas renderer (Lance.gg game loop)
- Collect food to grow body segments (dynamic body-part array)
- Collide with other snakes to eliminate them
- AI bots with randomized directional changes fill the arena
- Zone-based join: enter the landmark zone to play, leave to spectate

### User Flow

1. Visitor enters the Topia world and lands in spectator area
2. Moving into the landmark play zone triggers active player join via Socket.io
3. Player controls snake in real-time alongside other human players and AI bots
4. Leaving the zone returns player to spectator mode

## Architecture

```
src/
├── main.js                         Express + Socket.io server entry
├── common/
│   ├── WiggleGameEngine.js         Shared game logic (Lance GameEngine)
│   └── Wiggle.js                   Snake entity (DynamicObject subclass)
├── server/
│   └── WiggleServerEngine.js       Server-side physics, bot spawning, food gen
├── client/
│   ├── WiggleClientEngine.js       Client engine, input handling, zone check
│   └── WiggleRenderer.js           Canvas rendering (body segments, food, grid)
└── webpack configs                 Babel/ES5 bundling
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `Visitor.get(visitorId, urlSlug, { credentials })` | Check visitor zone on connection |
| `visitor.landmarkZonesString` | Determine if visitor is in play vs spectate zone |
| `visitor.privateZoneId` | Check private zone membership |
| `visitor.updatePublicKeyAnalytics(analytics)` | Track player join/leave events |

Minimal SDK usage — the game engine (Lance.gg) handles nearly all gameplay logic.

## Key Patterns

### 1. Lance.gg + Socket.io Real-Time Multiplayer (UNIQUE)

Only Topia app using a dedicated networked game engine. Lance.gg handles client prediction, server reconciliation, and entity interpolation:

```js
// main.js — Server setup with Lance.gg + Socket.io
const gameEngine = new WiggleGameEngine({ traceLevel: 0 });
const serverEngine = new WiggleServerEngine(io, gameEngine, {
  updateRate: 6,
  stepRate: 60,
  fullSyncRate: 20,
});
serverEngine.start();
```

### 2. Zone-Based Spectate vs Play Split

Uses `visitor.landmarkZonesString` to gate active gameplay — visitors must physically move into a zone to join:

```js
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
const landmarkZones = visitor?.landmarkZonesString?.split(",") || [];

if (landmarkZones.includes(PLAY_ZONE_NAME)) {
  // Add as active player
  serverEngine.addPlayer(socket);
} else {
  // Spectator — receive game state but no input
  socket.emit("spectate", gameEngine.getState());
}
```

### 3. Socket.io Handshake Credential Extraction

Extracts Topia credentials from the Socket.io connection referer URL rather than standard query params:

```js
io.on("connection", (socket) => {
  const referer = socket.handshake.headers.referer;
  const url = new URL(referer);
  const visitorId = url.searchParams.get("visitorId");
  const interactiveNonce = url.searchParams.get("interactiveNonce");
  const urlSlug = url.searchParams.get("urlSlug");
  // ... authenticate and join
});
```

### 4. AI Bot Generation with Random Movement

Spawns AI-controlled snakes with periodic random direction changes to populate the arena:

```js
spawnBot() {
  const bot = this.gameEngine.addBot();
  setInterval(() => {
    const directions = ["up", "down", "left", "right"];
    bot.direction = directions[Math.floor(Math.random() * 4)];
  }, 500 + Math.random() * 2000);
}
```

### 5. Dynamic Body-Part Array for Movement Trails

Snake body is an array of position history. Each frame, the head position is pushed and the tail is popped (unless growing):

```js
// Each game step
snake.body.unshift({ x: snake.position.x, y: snake.position.y });
if (!snake.isGrowing) {
  snake.body.pop(); // Remove tail segment
} else {
  snake.isGrowing = false;
}
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Realtime Multiplayer** | Lance.gg engine integration, Socket.io transport, client prediction |
| **Physics-Based** | Server-authoritative physics loop, entity interpolation |
| **Player vs AI** | Bot spawning, random movement AI, mixed human/AI arena |
| **Spectator Mode** | Zone-based play/spectate split, read-only game state broadcast |
| **Zone-Based Activities** | `landmarkZonesString` gating, enter-zone triggers |

## Weaknesses

- ES5/Babel codebase — no TypeScript, no modern module syntax
- No data persistence — game state lost on server restart, no leaderboard or history
- No rate limiting on Socket.io connections
- Query string auth extracted from referer (fragile, not standard)
- No input sanitization or validation on client messages
- No tests of any kind
- Lance.gg is a niche dependency with limited maintenance

## Unique Examples Worth Extracting

1. **Real-Time Game Engine Integration** — Lance.gg + Socket.io + Topia SDK credential bridge. Template for any app needing sub-second multiplayer.
2. **Zone-Based Game Gating** — Using `landmarkZonesString` to split spectators from players. Reusable for any zone-triggered experience.
3. **AI Bot Pattern** — Simple random-movement bot generation for filling multiplayer arenas.
