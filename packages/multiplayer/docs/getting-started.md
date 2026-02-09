# Getting Started with @topia/multiplayer

Build your first multiplayer game in 5 minutes.

## Prerequisites

- Node.js 18+
- A Topia developer account with interactive credentials

## Quick Start

### 1. Scaffold a new game

```bash
npx create-topia-game
```

Follow the prompts:
1. **Game name**: `my-first-game`
2. **Game type**: `continuous` (real-time movement)
3. **Max players**: `8`
4. **Bot support**: `Y`
5. **Topia hooks**: `none` (for now)

### 2. Install and run

```bash
cd my-first-game
npm install
npm test    # Verify everything works
npm run dev # Start the dev server
```

### 3. Understand the structure

```
my-first-game/
├── src/
│   ├── game.ts              # Game definition (rules, lifecycle)
│   ├── entities/
│   │   └── MyFirstGameEntity.ts  # Player entity (synced state)
│   └── bots/
│       └── WanderBot.ts     # AI bot behavior
├── tests/
│   └── myFirstGame.test.ts  # Game tests
├── package.json
└── tsconfig.json
```

## Core Concepts

### Entities

Entities are the synced objects in your game — players, items, obstacles. Use the `@schema` decorator to mark which fields sync over the network:

```typescript
import { Entity, schema } from '@topia/multiplayer';

class PlayerEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  // Server-only state (NOT synced)
  lastHitTime = 0;

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }
}
```

**Supported types**: `float32`, `float64`, `int8`, `int16`, `int32`, `uint8`, `uint16`, `uint32`, `string`, `boolean`

### Game Definition

Games are defined with `TopiaGame.define()`. You configure settings and implement lifecycle hooks:

```typescript
import { TopiaGame } from '@topia/multiplayer';

export const MyGame = TopiaGame.define({
  name: 'my-game',
  tickRate: 20,        // 20 Hz server loop (0 = event-driven)
  maxPlayers: 8,

  onCreate(room) {
    // Called once when the room is created
    // Spawn initial entities here
  },

  onTick(room, delta) {
    // Called every server tick (tickRate > 0 only)
    // Move entities, check collisions, update scores
  },

  onInput(room, player, input) {
    // Called when a player sends input (event-driven games)
  },

  onPlayerJoin(room, player) {
    const entity = room.spawnEntity(PlayerEntity, {
      name: player.topia.displayName,
    });
    player.entity = entity;
  },

  onPlayerLeave(room, player) {
    if (player.entity) room.despawnEntity(player.entity);
  },
});
```

### Two Game Modes

| Mode | tickRate | Best for | Example |
|------|----------|----------|---------|
| **Tick-driven** | 20 | Real-time action, physics | Snake, Racing, Bumper Balls |
| **Event-driven** | 0 | Turn-based, puzzle | Chess, Card games, Grid Arena |

### Testing

Use `TestRoom` for fast, in-memory unit tests — no networking required:

```typescript
import { TestRoom } from '@topia/multiplayer/testing';
import { MyGame } from '../src/game.js';

describe('My Game', () => {
  it('spawns player on join', () => {
    const room = TestRoom.create(MyGame);
    const player = room.addPlayer({ displayName: 'Alice' });
    expect(player.entity).toBeDefined();
  });

  it('moves player on tick', () => {
    const room = TestRoom.create(MyGame);
    const player = room.addPlayer({ displayName: 'Alice' });
    const startX = player.entity.x;

    room.tick();
    expect(player.entity.x).not.toBe(startX);
  });
});
```

## Next Steps

- [API Reference](./api-reference.md) — Full class and method documentation
- [Game Type Guides](./guides/) — Deep-dives for continuous, grid, and physics games
- [Architecture](./architecture.md) — How the three-layer architecture works
- [Migration from Lance.gg](./migration-from-lance.md) — Moving from Lance to @topia/multiplayer
