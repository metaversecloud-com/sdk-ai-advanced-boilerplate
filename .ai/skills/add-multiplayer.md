---
name: Add Multiplayer
description: Integrate @topia/multiplayer into a boilerplate app for real-time multiplayer games.
difficulty: Advanced
prerequisites: add-route, add-component
---

# Add Multiplayer

> Add real-time multiplayer game support to your Topia SDK app using the `@topia/multiplayer` framework.

## References

- **Package**: [@topia/multiplayer](https://github.com/metaversecloud-com/topia-multiplayer) (separate repo)
- **Docs**: See the multiplayer repo's `packages/multiplayer/docs/` for full API reference, architecture, and game type guides
- **Scaffolding**: `npx create-topia-game` generates a standalone game project
- **Examples**: `wiggle` (continuous), `grid-arena` (event-driven), `bumper-balls` (physics)

## Inputs Needed

1. **Game type**: continuous (tick-driven), grid (event-driven), or physics
2. **Max players**: How many players per room
3. **Bot support**: Whether to auto-fill rooms with AI bots
4. **Entity schema**: What fields to sync over the network

## Steps

### Step 1: Install the package

```bash
npm install @topia/multiplayer
```

**Verify**: `node -e "import('@topia/multiplayer').then(m => console.log(Object.keys(m)))"` lists exports.

### Step 2: Define your entity

Create `server/game/entities/PlayerEntity.ts`:

```typescript
import { Entity, schema } from '@topia/multiplayer';

export class PlayerEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  onInput(input: Record<string, any>): void {
    // Handle player input
  }
}
```

**Verify**: `PlayerEntity.getSchemaFields()` returns the fields you decorated.

### Step 3: Define your game

Create `server/game/my-game.ts`:

```typescript
import { TopiaGame } from '@topia/multiplayer';
import { PlayerEntity } from './entities/PlayerEntity.js';

export const MyGame = TopiaGame.define({
  name: 'my-game',
  tickRate: 20,       // 0 for event-driven
  maxPlayers: 8,

  onCreate(room) {
    // Spawn initial entities (items, obstacles, etc.)
  },

  onTick(room, delta) {
    // Game loop (tick-driven only)
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

**Verify**: `MyGame.tickRate === 20` and `MyGame.hooks.onCreate` is defined.

### Step 4: Add bot behaviors (optional)

Create `server/game/bots/WanderBot.ts`:

```typescript
import { BotBehavior } from '@topia/multiplayer';

export const WanderBot = BotBehavior.define({
  think(bot, room, delta) {
    bot.sendInput({ /* game-specific input */ });
  },
});
```

Add to game definition:
```typescript
bots: {
  fillTo: 4,
  behaviors: [WanderBot],
  despawnOnJoin: true,
  names: ['Bot A', 'Bot B', 'Bot C', 'Bot D'],
},
```

### Step 5: Wire up server routes

Add game state routes to `server/routes.ts`:

```typescript
import { MyGame } from './game/my-game.js';

// The multiplayer framework handles room management via Colyseus
// Your app server provides the game definition and Topia SDK bridge
router.get('/api/game-config', (req, res) => {
  res.json({
    name: MyGame.name,
    tickRate: MyGame.tickRate,
    maxPlayers: MyGame.maxPlayers,
  });
});
```

**Verify**: `GET /api/game-config` returns the game configuration.

### Step 6: Add client interpolation

In your React component:

```typescript
import { Interpolator, Predictor, InputHandler } from '@topia/multiplayer/client';

const interpolator = new Interpolator({
  bufferMs: 100,
  mode: 'hermite',  // or 'linear' or 'physics'
});
const predictor = new Predictor({
  applyInput: (state, input) => ({ ...state, /* apply input */ }),
});
const inputHandler = new InputHandler();
```

### Step 7: Write tests

```typescript
import { TestRoom } from '@topia/multiplayer/testing';
import { MyGame } from '../server/game/my-game.js';
import { PlayerEntity } from '../server/game/entities/PlayerEntity.js';

describe('My Game', () => {
  it('spawns player on join', () => {
    const room = TestRoom.create(MyGame);
    const player = room.addPlayer({ displayName: 'Alice' });
    expect(player.entity).toBeDefined();
    expect(player.entity.name).toBe('Alice');
  });
});
```

**Verify**: `npm test` passes.

## Verification Checklist

- [ ] `@topia/multiplayer` installed and importable
- [ ] Entity class defined with `@schema` decorators
- [ ] Game definition created with lifecycle hooks
- [ ] Tests pass using `TestRoom`
- [ ] Server routes wired up for game config
- [ ] Client interpolation set up (if rendering game state)
- [ ] Bots configured (if needed)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Importing from `@topia/multiplayer` in client code | Use `@topia/multiplayer/client` for client-side imports |
| Forgetting `@schema` decorator | Undecorated fields won't sync over the network |
| Using `tickRate: 0` with `onTick` | Event-driven games use `onInput`, not `onTick` |
| Not linking `player.entity` in `onPlayerJoin` | The framework needs this link to deliver inputs |

## Next Skills

- `add-leaderboard` — Wire up leaderboard to multiplayer game scores
- `add-badges` — Award badges for multiplayer achievements
- `write-tests` — Add more comprehensive game tests
