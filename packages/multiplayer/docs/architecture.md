# Architecture

@topia/multiplayer uses a three-layer architecture that separates game logic from networking and platform integration.

## Three Layers

```
┌─────────────────────────────────────────────┐
│               Game Layer                     │
│  TopiaGame · Entity · @schema · BotBehavior │
│  Your game logic lives here                  │
├─────────────────────────────────────────────┤
│             Network Layer                    │
│  Colyseus Rooms · WebSocket Transport        │
│  Interpolator · Predictor · InputHandler     │
│  Snapshot serialization · State sync         │
├─────────────────────────────────────────────┤
│            Platform Layer                    │
│  TopiaSDKBridge · DeferQueue                 │
│  TopiaCredentials · RoomNaming               │
│  Leaderboards · Badges · Data Objects        │
└─────────────────────────────────────────────┘
```

### Game Layer

This is where you work. Define entities with `@schema` decorators, implement lifecycle hooks (`onCreate`, `onTick`, `onInput`, etc.), and create bot behaviors. The game layer has **zero** coupling to networking or Topia — you can test it entirely in-memory with `TestRoom`.

### Network Layer

Built on Colyseus 0.15. Handles WebSocket connections, room lifecycle, state serialization, and client-server communication. On the client side, `Interpolator` smooths snapshots, `Predictor` handles client-side prediction, and `InputHandler` sequences inputs.

### Platform Layer

Bridges the game to Topia's infrastructure. `TopiaSDKBridge` defers SDK calls to avoid blocking the game loop. `TopiaCredentials` validates player identity. `RoomNaming` maps Topia world/scene context to room IDs.

## Data Flow

### Server Tick (Tick-Driven Mode)

```
1. BotManager.tick()          → Bots think and send inputs
2. onTick(room, delta)        → Game logic: movement, collision, scoring
3. Entity state updated        → @schema fields changed
4. Snapshot serialized         → toSnapshot() on all entities
5. State broadcast             → WebSocket to all connected clients
6. DeferQueue.flush()          → Queued Topia SDK calls execute
```

### Client Input (Event-Driven Mode)

```
1. Player sends input          → WebSocket message
2. Entity.onInput(input)       → Entity processes its own input
3. onInput(room, player, input)→ Game-level input processing
4. Snapshot serialized         → State change broadcast
```

### Client Render Loop

```
1. Receive server snapshot     → pushSnapshot(timestamp, state)
2. Interpolator.getInterpolated(now) → Smooth between snapshots
3. Predictor.predict()         → Apply unconfirmed local inputs
4. Predictor.getSmoothed()     → Smooth correction errors
5. Render to canvas/DOM        → Your rendering code
```

## Scaling Architecture

### Single Process (Default)

```
┌──────────────────────────────┐
│          Process              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │Room 1│ │Room 2│ │Room 3│ │
│  └──────┘ └──────┘ └──────┘ │
│  maxRoomsPerProcess: 20      │
└──────────────────────────────┘
```

Each process hosts up to `maxRoomsPerProcess` rooms. No Redis required. Fine for development and small deployments.

### Multi-Process (Redis)

```
                     ┌─────────┐
                     │  Redis   │
                     │ Registry │
                     │ Heartbeat│
                     │Checkpoint│
                     └────┬────┘
              ┌───────────┼───────────┐
     ┌────────┴──┐  ┌─────┴────┐  ┌──┴────────┐
     │ Process A  │  │ Process B │  │ Process C  │
     │ Rooms 1-20 │  │Rooms 21-40│  │Rooms 41-60│
     └────────────┘  └──────────┘  └────────────┘
```

Set `REDIS_URL` to enable. Each process registers a heartbeat. The `FailoverManager` scans for orphaned rooms and recovers from checkpoints.

**Redis features:**
- **Room registry**: Which process owns which room
- **Heartbeat**: 5s TTL, 2s interval — detect dead processes
- **Checkpoints**: Periodic state snapshots (30s default) for failover
- **Cross-process routing**: `@socket.io/redis-adapter` routes WebSocket messages

### Failover Recovery

```
1. Process B dies
2. FailoverManager on Process A scans for orphaned rooms
3. Finds Room 25 has no heartbeat from Process B
4. Loads checkpoint from Redis
5. Claims Room 25, restores state
6. Clients reconnect automatically
```

## Entity Schema System

The `@schema` decorator uses a `Symbol`-based metadata store on entity constructors. This supports inheritance — child classes copy parent schema fields.

```
Entity (base)
  └── SnakeEntity
        @schema('float32') x
        @schema('float32') y
        @schema('float32') angle
        @schema('int16') score

Only @schema fields are serialized in toSnapshot()
Non-decorated fields (bodyParts) stay server-side
```

## Spectator Modes

| Mode | Condition | Use case |
|------|-----------|----------|
| `zone` | Visitor NOT in play zone | Arena games: spectators outside the ring |
| `overflow` | Players >= maxPlayers | First-come-first-served |
| `manual` | Game decides | Custom logic (tournament brackets, etc.) |

Spectators receive state updates but cannot send input.
