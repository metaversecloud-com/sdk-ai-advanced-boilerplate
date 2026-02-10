> **Source**: @topia/multiplayer framework
> **SDK Methods**: TopiaGame.define, Entity, @schema, BotBehavior.define, TestRoom.create
> **Guide Phase**: Phase 7
> **Difficulty**: Advanced
> **Tags**: `multiplayer, real-time, game, entity, bot, room, Colyseus, physics, interpolation`

# Multiplayer Integration

> Integrate the `@topia/multiplayer` framework into a boilerplate app for real-time multiplayer games with authoritative server, client prediction, bots, and spectators.

## When to Use

- Building a real-time multiplayer game (snake, racing, arena, board game)
- Need authoritative server with client prediction
- Need AI bots to fill empty rooms
- Need spectator support
- Need physics simulation

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Boilerplate App                                 │
│  ┌─────────────┐    ┌────────────────────────┐  │
│  │ Client (React)│   │ Server (Express)        │  │
│  │ Interpolator │   │ ┌────────────────────┐  │  │
│  │ Predictor    │   │ │ @topia/multiplayer  │  │  │
│  │ InputHandler │   │ │ TopiaGame.define()  │  │  │
│  │              │◄──┤ │ Entity + @schema    │  │  │
│  │              │   │ │ BotManager          │  │  │
│  └─────────────┘    │ │ PhysicsWorld (opt)  │  │  │
│                      │ └────────────────────┘  │  │
│                      └────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

The multiplayer framework lives in a **separate repo** ([topia-multiplayer](https://github.com/metaversecloud-com/topia-multiplayer)) and is installed as an npm dependency.

## Server Implementation

### Install

```bash
npm install @topia/multiplayer
```

### Define Entity

```typescript
import { Entity, schema } from '@topia/multiplayer';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  // Server-only (NOT synced)
  bodyParts: Array<{ x: number; y: number }> = [];

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }

  move(delta: number): void {
    this.x += Math.cos(this.angle) * 5 * delta * 60;
    this.y += Math.sin(this.angle) * 5 * delta * 60;
  }
}
```

### Define Game

```typescript
import { TopiaGame, BotBehavior } from '@topia/multiplayer';

const WanderBot = BotBehavior.define({
  think(bot) {
    bot.sendInput({ angle: bot.entity.angle + (Math.random() - 0.5) * 0.3 });
  },
});

export const MyGame = TopiaGame.define({
  name: 'my-game',
  tickRate: 20,
  maxPlayers: 8,
  bots: { fillTo: 4, behaviors: [WanderBot], despawnOnJoin: true },

  onCreate(room) { /* spawn items */ },
  onTick(room, delta) { /* game loop */ },
  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(SnakeEntity, {
      name: player.topia.displayName,
    });
  },
  onPlayerLeave(room, player) {
    if (player.entity) room.despawnEntity(player.entity);
  },
});
```

## Client Implementation

```typescript
import { Interpolator, Predictor, InputHandler } from '@topia/multiplayer/client';

const interpolator = new Interpolator({ bufferMs: 100, mode: 'hermite', angleFields: ['angle'] });
const predictor = new Predictor({
  applyInput: (state, input) => ({ ...state, angle: input.angle }),
  smoothingFrames: 3,
});
const inputHandler = new InputHandler();

// On server snapshot
interpolator.pushSnapshot(timestamp, serverState);
predictor.setServerState(serverState, lastProcessedSeq);

// On local input
const pkg = inputHandler.package({ angle: newAngle });
sendToServer(pkg);

// Render loop
const interpolated = interpolator.getInterpolated(Date.now());
const predicted = predictor.predict(interpolated, inputHandler.unconfirmed);
render(predictor.getSmoothed(predicted));
```

## Testing

```typescript
import { TestRoom } from '@topia/multiplayer/testing';

const room = TestRoom.create(MyGame);
const player = room.addPlayer({ displayName: 'Alice' });
room.tick(); // advance simulation
expect(player.entity.x).not.toBe(0);
```

## Variations

| Variation | Change |
|-----------|--------|
| Event-driven (grid/turn) | `tickRate: 0`, use `onInput` instead of `onTick` |
| Physics | Add `PhysicsWorld.create({ matter: Matter })`, use `physics.step(delta)` |
| Spectators | Set `spectatorMode: 'zone'` or `'overflow'` |
| Scaling | Set `REDIS_URL` env var for multi-process rooms |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Importing server modules in client | Use `@topia/multiplayer/client` for client imports |
| Not setting `player.entity` in `onPlayerJoin` | Framework needs this to route inputs to entities |
| Using `onTick` with `tickRate: 0` | Event-driven games process state in `onInput` |
| Fields missing from snapshots | Add `@schema('type')` decorator to sync fields |

## Related Examples

- [real-time-sse-redis.md](./real-time-sse-redis.md) — Simpler SSE approach for non-game real-time
- [leaderboard.md](./leaderboard.md) — Wire up multiplayer scores to Topia leaderboards
- [badges.md](./badges.md) — Award badges for game achievements

## Related Skills

- [add-multiplayer](../skills/add-multiplayer.md) — Step-by-step integration guide
- [add-leaderboard](../skills/add-leaderboard.md) — Add leaderboard to your game
- [write-tests](../skills/write-tests.md) — Test your game with TestRoom
