# API Reference

## Game Layer

### `TopiaGame.define(definition: GameDefinition): GameConfig`

Factory method to define a game. Returns a `GameConfig` object you pass to room creation or `TestRoom.create()`.

**GameDefinition fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | required | Unique game identifier |
| `tickRate` | `number` | `20` | Server Hz. `0` = event-driven |
| `maxPlayers` | `number` | `10` | Maximum players per room |
| `maxRoomsPerProcess` | `number` | `20` | Max rooms per server process |
| `spectatorMode` | `'zone' \| 'overflow' \| 'manual'` | — | Spectator strategy |
| `playZone` | `string` | — | Zone name (required for `'zone'` mode) |
| `debug` | `string[]` | `[]` | Log channels to enable |
| `bots` | `BotConfig` | — | Bot auto-fill configuration |
| `physics` | `PhysicsConfig` | — | Physics engine configuration |

**Lifecycle hooks:**

| Hook | Signature | When called |
|------|-----------|-------------|
| `onCreate` | `(room: GameRoomContext) => void` | Room is created |
| `onTick` | `(room: GameRoomContext, delta: number) => void` | Every server tick |
| `onInput` | `(room: GameRoomContext, player: Player, input: Record<string, any>) => void` | Player sends input |
| `onPlayerJoin` | `(room: GameRoomContext, player: Player) => void` | Player joins |
| `onPlayerLeave` | `(room: GameRoomContext, player: Player) => void` | Player leaves |
| `onSpectatorJoin` | `(room: GameRoomContext, spectator: Spectator) => void` | Spectator joins |
| `onGameOver` | `(room: GameRoomContext, winner?: Player) => void` | Game ends |

---

### `Entity`

Base class for all synced game objects.

```typescript
class Entity {
  readonly id: string;
  isBot: boolean;

  onInput(input: Record<string, any>): void;
  toSnapshot(): Record<string, any>;
  applySnapshot(snapshot: Record<string, any>): void;
  static getSchemaFields(): Record<string, SchemaType>;
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `onInput(input)` | Override to handle player input for this entity |
| `toSnapshot()` | Serialize schema-decorated fields to a plain object |
| `applySnapshot(snapshot)` | Apply server snapshot to this entity |

---

### `@schema(type: SchemaType)`

Decorator that marks a field for network synchronization.

```typescript
class MyEntity extends Entity {
  @schema('float32') x = 0;      // 4-byte float
  @schema('int16') score = 0;     // 2-byte signed integer
  @schema('string') name = '';    // Variable-length string
  @schema('boolean') alive = true; // Boolean
}
```

**Supported types:** `float32`, `float64`, `int8`, `int16`, `int32`, `uint8`, `uint16`, `uint32`, `string`, `boolean`

---

### `GameRoomContext`

The room context passed to all lifecycle hooks.

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `tickCount` | `number` | Number of ticks elapsed |
| `entities` | `EntityCollection` | All entities in the room |
| `topia` | `TopiaRoomBridge` | Topia SDK bridge for deferred calls |
| `state` | `any` | Arbitrary room state |
| `spawnEntity(Class, initial?)` | `<T> => T` | Create and register an entity |
| `despawnEntity(entity)` | `void` | Remove an entity |
| `spawnBot(behavior, initial?)` | `BotContext` | Create a bot |
| `sendInput(playerId, input)` | `void` | Deliver input to a player |
| `log(channel, message)` | `void` | Debug logging |

---

### `EntityCollection`

Query entities in a room.

| Property/Method | Description |
|-----------------|-------------|
| `count` | Total number of entities |
| `all()` | Get all entities |
| `ofType<T>(EntityClass)` | Filter by entity class |
| `nearest<T>(origin, EntityClass, opts?)` | Find nearest entity (Euclidean) |

---

## Bot System

### `BotBehavior.define(def: BotBehaviorDef): BotBehaviorDef`

Factory for defining bot AI behaviors.

```typescript
const ChaseBot = BotBehavior.define({
  think(bot, room, delta) {
    const target = room.entities.nearest(bot.entity, PlayerEntity, {
      exclude: (e) => e.isBot,
    });
    if (target) {
      bot.sendInput({ angle: angleTo(bot.entity, target) });
    }
  },
});
```

**BotBehaviorDef fields:**

| Field | Type | Description |
|-------|------|-------------|
| `thinkRate` | `number` | Think frequency in Hz. `0` = event-driven |
| `think` | `(bot, room, delta) => void` | Called at `thinkRate` Hz |
| `onMyTurn` | `(bot, room) => void` | Called for turn-based games |

### `BotConfig`

```typescript
{
  fillTo: 6,                      // Target total players (humans + bots)
  behaviors: [ChaseBot, WanderBot], // Randomly assigned
  despawnOnJoin: true,             // Remove a bot when human joins
  names: ['Bot A', 'Bot B'],       // Display names
}
```

### `BotManager`

Manages bot lifecycle. Usually used internally by rooms.

| Method | Description |
|--------|-------------|
| `fillBots(humanCount, spawn)` | Fill room to target count |
| `despawnOne()` | Remove one bot |
| `tick(room, delta)` | Advance all bot think cycles |
| `triggerTurn(botId, room)` | Trigger `onMyTurn` for a bot |
| `clear()` | Remove all bots |

---

## Client Netcode

### `Interpolator`

Smooths server snapshots for jitter-free rendering.

```typescript
const interp = new Interpolator({
  bufferMs: 100,              // Render 100ms behind real-time
  mode: 'linear',             // 'linear' | 'hermite' | 'physics'
  angleFields: ['angle'],     // Shortest-arc interpolation
  physicsFields: [            // Required for 'physics' mode
    { position: 'x', velocity: 'vx' },
    { position: 'y', velocity: 'vy', acceleration: 'ay' },
  ],
});

// Push server snapshots
interp.pushSnapshot(timestamp, entityState);

// In render loop
const smoothed = interp.getInterpolated(Date.now());
```

**Modes:**

| Mode | Description | Best for |
|------|-------------|----------|
| `linear` | Linear interpolation between snapshots | General purpose |
| `hermite` | Cubic Hermite spline (smoother curves) | Curved movement |
| `physics` | Velocity extrapolation past latest snapshot | Physics games |

### `Predictor`

Client-side prediction with server reconciliation.

```typescript
const predictor = new Predictor({
  applyInput: (state, input) => ({
    ...state,
    x: state.x + input.dx,
  }),
  smoothingFrames: 3,
});

// On server state received
predictor.setServerState(serverState, lastProcessedSeq);

// In render loop
const predicted = predictor.predict(interpolated, unconfirmedInputs);
const smoothed = predictor.getSmoothed(predicted);
```

### `InputHandler`

Sequences inputs for prediction reconciliation.

```typescript
const handler = new InputHandler();
const pkg = handler.package({ dx: 5 });  // { seq, input }
sendToServer(pkg);

// After server confirms
handler.confirm(confirmedSeq);
```

---

## Physics

### `PhysicsWorld`

Optional Matter.js physics integration.

```typescript
import { PhysicsWorld } from '@topia/multiplayer';
import Matter from 'matter-js';

const physics = PhysicsWorld.create({
  matter: Matter,
  gravity: { x: 0, y: 0 },
});

// Link entities to physics bodies
physics.addCircle(ballEntity, 20);
physics.addRectangle(wallEntity, 800, 20, { isStatic: true });

// In game tick
physics.step(delta);           // Steps physics, syncs to entities
physics.setVelocity(id, 5, 0);
physics.applyForce(id, 0.01, 0);
```

| Method | Description |
|--------|-------------|
| `create(options)` | Create a PhysicsWorld |
| `addCircle(entity, radius, opts?)` | Add circular body |
| `addRectangle(entity, w, h, opts?)` | Add rectangular body |
| `remove(entityId)` | Remove a body |
| `step(delta)` | Step simulation and sync to entities |
| `setVelocity(id, vx, vy)` | Set body velocity |
| `applyForce(id, fx, fy)` | Apply force to body |
| `getVelocity(id)` | Get body velocity |
| `syncFromEntities()` | Push entity positions to physics |
| `clear()` | Remove all bodies |

---

## Scaling

### `RedisAdapter`

Opt-in horizontal scaling via Redis. Set `REDIS_URL` environment variable.

| Feature | Description |
|---------|-------------|
| Room registry | Tracks which process owns which room |
| Process heartbeat | TTL-based liveness detection |
| State checkpoints | Periodic snapshots for failover recovery |
| Cross-process routing | `@socket.io/redis-adapter` for WebSocket |

### `FailoverManager`

Detects orphaned rooms and recovers from checkpoints.

### `Metrics`

Prometheus-compatible metrics endpoint.

| Metric | Type | Description |
|--------|------|-------------|
| `topia_mp_rooms_active` | Gauge | Active room count |
| `topia_mp_players_connected` | Gauge | Connected players |
| `topia_mp_tick_duration_ms` | Histogram | Tick timing per game |
| `topia_mp_network_bytes_out` | Counter | Bytes sent per room |
| `topia_mp_redis_latency_ms` | Histogram | Redis operation latency |

---

## Dev Tools

### `InspectorServer`

HTTP inspector for development (tree-shaken in production).

```typescript
const inspector = InspectorServer.create({ port: 3002 });
```

**Endpoints:**
- `GET /rooms` — List active rooms
- `GET /rooms/:id/entities` — Entity details
- `GET /rooms/:id/stats` — Tick timing, player counts

---

## Testing

### `TestRoom`

In-memory room for unit tests — no networking.

```typescript
import { TestRoom } from '@topia/multiplayer/testing';

const room = TestRoom.create(MyGame);
const player = room.addPlayer({ displayName: 'Alice' });
room.sendInput(player.id, { angle: Math.PI });
room.tick();
room.removePlayer(player.id);
```

| Method | Description |
|--------|-------------|
| `create(gameConfig)` | Create room and call `onCreate` |
| `addPlayer(overrides?)` | Simulate player joining |
| `removePlayer(playerId)` | Simulate player leaving |
| `sendInput(playerId, input)` | Send input to player's entity |
| `tick(delta?)` | Advance one server tick |
| `getLogs(channel?)` | Read debug log messages |

---

## Topia Integration

### `TopiaSDKBridge`

Defers Topia SDK calls to avoid blocking the game loop.

```typescript
room.topia.defer(async (sdk) => {
  await sdk.world.setDataObject({ key: 'scores', value: leaderboard });
});
```

### `TopiaCredentials`

Validates player credentials from URL parameters.

### `RoomNaming`

Generates room IDs: `{gameName}-{urlSlug}-{sceneDropId}`
