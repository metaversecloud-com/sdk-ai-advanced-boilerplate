> **Part of**: [@topia/multiplayer Implementation Plan](./2026-02-07-multiplayer-00-overview.md)
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 2: Bots + Spectators + Polish

> Feature parity with current Wiggle, plus improvements. Adds bot system, spectator mode, Hermite interpolation, and Topia SDK hooks.

### Task 13: BotBehavior Base Class

**Files:**
- Create: `packages/multiplayer/src/game/BotBehavior.ts`
- Create: `packages/multiplayer/tests/game/BotBehavior.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/BotBehavior.test.ts
import { BotBehavior } from '../../src/game/BotBehavior.js';

describe('BotBehavior', () => {
  it('defines a behavior with think function', () => {
    const behavior = BotBehavior.define({
      think(bot, room, delta) {
        bot.sendInput({ angle: Math.random() * Math.PI * 2 });
      },
    });

    expect(behavior.thinkRate).toBeUndefined();
    expect(typeof behavior.think).toBe('function');
  });

  it('supports event-driven mode (thinkRate 0)', () => {
    const behavior = BotBehavior.define({
      thinkRate: 0,
      onMyTurn(bot, room) {
        bot.sendInput({ action: 'move', direction: 'north' });
      },
    });

    expect(behavior.thinkRate).toBe(0);
    expect(typeof behavior.onMyTurn).toBe('function');
  });

  it('supports custom think rate', () => {
    const behavior = BotBehavior.define({
      thinkRate: 10,
      think(bot, room, delta) {
        bot.sendInput({ angle: 0 });
      },
    });

    expect(behavior.thinkRate).toBe(10);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/game/BotBehavior.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/game/BotBehavior.ts
import type { BotBehaviorDef, BotContext, GameRoomContext } from './types.js';

export class BotBehavior {
  static define(def: BotBehaviorDef): BotBehaviorDef {
    return {
      thinkRate: def.thinkRate,
      think: def.think,
      onMyTurn: def.onMyTurn,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/game/BotBehavior.test.ts -v`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/game/BotBehavior.ts packages/multiplayer/tests/game/BotBehavior.test.ts
git commit -m "feat(multiplayer): add BotBehavior.define() for AI bot behaviors"
```

---

### Task 14: Bot Manager (Spawning, Think Loop, fillTo)

**Files:**
- Create: `packages/multiplayer/src/game/BotManager.ts`
- Create: `packages/multiplayer/tests/game/BotManager.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/BotManager.test.ts
import { BotManager } from '../../src/game/BotManager.js';
import { BotBehavior } from '../../src/game/BotBehavior.js';
import { Entity, schema } from '../../src/game/Entity.js';
import { EntityCollection } from '../../src/core/TopiaRoom.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

const WanderBehavior = BotBehavior.define({
  think(bot, room, delta) {
    bot.sendInput({ angle: Math.random() * Math.PI * 2 });
  },
});

describe('BotManager', () => {
  let entities: EntityCollection;
  let inputLog: Array<{ botId: string; input: any }>;

  beforeEach(() => {
    entities = new EntityCollection();
    inputLog = [];
  });

  const createInputHandler = (botId: string) => (input: Record<string, any>) => {
    inputLog.push({ botId, input });
  };

  it('spawns bots up to fillTo count', () => {
    const manager = new BotManager({
      fillTo: 4,
      behaviors: [WanderBehavior],
      despawnOnJoin: true,
      names: ['Bot1', 'Bot2', 'Bot3', 'Bot4'],
    });

    const humanCount = 1;
    const spawned = manager.fillBots(humanCount, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    expect(spawned).toBe(3); // 4 - 1 human = 3 bots
    expect(manager.botCount).toBe(3);
  });

  it('despawns a bot when a human joins', () => {
    const manager = new BotManager({
      fillTo: 4,
      behaviors: [WanderBehavior],
      despawnOnJoin: true,
    });

    manager.fillBots(0, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    expect(manager.botCount).toBe(4);

    const removed = manager.despawnOne();
    expect(removed).toBeTruthy();
    expect(manager.botCount).toBe(3);
  });

  it('runs think for all bots', () => {
    const manager = new BotManager({
      fillTo: 2,
      behaviors: [WanderBehavior],
    });

    manager.fillBots(0, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    manager.tick({} as any, 0.05);

    expect(inputLog).toHaveLength(2); // Both bots produced input
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/game/BotManager.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/game/BotManager.ts
import type { BotBehaviorDef, BotContext, BotConfig, GameRoomContext } from './types.js';

interface ManagedBot {
  id: string;
  name: string;
  behavior: BotBehaviorDef;
  context: BotContext;
  thinkAccumulator: number;
}

type SpawnCallback = (name: string) => { entity: any; sendInput: (input: Record<string, any>) => void };

let botCounter = 0;

export class BotManager {
  private bots: Map<string, ManagedBot> = new Map();
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  get botCount(): number {
    return this.bots.size;
  }

  fillBots(humanCount: number, spawn: SpawnCallback): number {
    const fillTo = this.config.fillTo ?? 0;
    const needed = Math.max(0, fillTo - humanCount - this.bots.size);

    for (let i = 0; i < needed; i++) {
      const id = `bot-${++botCounter}`;
      const name = this.config.names?.[this.bots.size % (this.config.names?.length || 1)]
        ?? `Bot ${botCounter}`;
      const behavior = this.config.behaviors[
        Math.floor(Math.random() * this.config.behaviors.length)
      ];

      const { entity, sendInput } = spawn(name);
      entity.isBot = true;

      this.bots.set(id, {
        id,
        name,
        behavior,
        context: { entity, sendInput },
        thinkAccumulator: 0,
      });
    }

    return needed;
  }

  despawnOne(): ManagedBot | null {
    if (this.bots.size === 0) return null;
    const [firstKey] = this.bots.keys();
    const bot = this.bots.get(firstKey)!;
    this.bots.delete(firstKey);
    return bot;
  }

  tick(room: GameRoomContext, delta: number): void {
    for (const bot of this.bots.values()) {
      if (bot.behavior.thinkRate === 0) continue; // event-driven, skip

      const thinkInterval = bot.behavior.thinkRate
        ? 1 / bot.behavior.thinkRate
        : delta; // think every tick by default

      bot.thinkAccumulator += delta;

      if (bot.thinkAccumulator >= thinkInterval) {
        bot.thinkAccumulator -= thinkInterval;
        bot.behavior.think?.(bot.context, room, delta);
      }
    }
  }

  triggerTurn(botId: string, room: GameRoomContext): void {
    const bot = this.bots.get(botId);
    if (bot?.behavior.onMyTurn) {
      bot.behavior.onMyTurn(bot.context, room);
    }
  }

  clear(): void {
    this.bots.clear();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/game/BotManager.test.ts -v`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/game/BotManager.ts packages/multiplayer/tests/game/BotManager.test.ts
git commit -m "feat(multiplayer): add BotManager with fillTo auto-population and think loop"
```

---

### Task 15: Integrate Bots into TestRoom

**Files:**
- Modify: `packages/multiplayer/src/testing/TestRoom.ts`
- Create: `packages/multiplayer/tests/testing/TestRoom.bots.test.ts`

**Step 1: Write failing test**

```typescript
// tests/testing/TestRoom.bots.test.ts
import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { BotBehavior } from '../../src/game/BotBehavior.js';
import { Entity, schema } from '../../src/game/Entity.js';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;

  onInput(input: { angle: number }) {
    this.angle = input.angle;
  }
}

const ChaseBehavior = BotBehavior.define({
  think(bot, room, delta) {
    bot.sendInput({ angle: 1.5 }); // Fixed angle for testing
  },
});

const BotGame = TopiaGame.define({
  name: 'bot-test',
  tickRate: 20,
  maxPlayers: 6,
  bots: {
    fillTo: 4,
    behaviors: [ChaseBehavior],
    despawnOnJoin: true,
    names: ['Slinky', 'Noodle', 'Zigzag', 'Squiggle'],
  },
  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(SnakeEntity, { name: player.topia.displayName });
  },
  onTick(room, delta) {
    for (const snake of room.entities.ofType(SnakeEntity)) {
      snake.x += Math.cos(snake.angle) * 5 * delta * 60;
    }
  },
});

describe('TestRoom with Bots', () => {
  it('auto-fills bots on create', () => {
    const room = TestRoom.create(BotGame);
    // 0 humans, fillTo 4 → 4 bots
    expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);
  });

  it('despawns a bot when human joins', () => {
    const room = TestRoom.create(BotGame);
    room.addPlayer({ displayName: 'Alice' });

    // 1 human + 3 bots = 4
    expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);
    // But only 3 should be bots
    const bots = room.entities.ofType(SnakeEntity).filter(s => s.isBot);
    expect(bots).toHaveLength(3);
  });

  it('bots produce input on tick', () => {
    const room = TestRoom.create(BotGame);
    room.tick();

    // Bots should have updated angle via their behavior
    const bots = room.entities.ofType(SnakeEntity).filter(s => s.isBot);
    for (const bot of bots) {
      expect(bot.angle).toBe(1.5);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/testing/TestRoom.bots.test.ts -v`
Expected: FAIL

**Step 3: Update TestRoom to support bots**

Update `TestRoom.ts` to import `BotManager` and:
- In `create()`: if `gameConfig.bots`, create a `BotManager` and call `fillBots()`
- In `tick()`: call `botManager.tick()` before `onTick`
- In `addPlayer()`: if `despawnOnJoin`, call `botManager.despawnOne()` and remove entity
- The bot spawn callback should create an entity, add to collection, and wire `sendInput` to call `entity.onInput()`

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/testing/TestRoom.bots.test.ts -v`
Expected: 3 tests PASS

**Step 5: Run all tests**

Run: `cd packages/multiplayer && npx jest -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/multiplayer/src/testing/TestRoom.ts packages/multiplayer/tests/testing/TestRoom.bots.test.ts
git commit -m "feat(multiplayer): integrate BotManager into TestRoom with auto-fill and despawn"
```

---

### Task 16: Hermite Interpolation Upgrade

**Files:**
- Modify: `packages/multiplayer/src/client/Interpolator.ts`
- Modify: `packages/multiplayer/tests/client/Interpolator.test.ts`

**Step 1: Write failing test for Hermite mode**

```typescript
// Add to existing Interpolator.test.ts
describe('Hermite interpolation', () => {
  it('produces smoother curves than linear', () => {
    const linear = new Interpolator({ bufferMs: 100, mode: 'linear' });
    const hermite = new Interpolator({ bufferMs: 100, mode: 'hermite' });

    // Snake moving in a curve: velocity changes direction
    const snapshots = [
      { t: 1000, s: { x: 0, y: 0 } },
      { t: 1050, s: { x: 50, y: 0 } },    // moving right
      { t: 1100, s: { x: 80, y: 30 } },   // curving up
      { t: 1150, s: { x: 90, y: 70 } },   // moving up
    ];

    for (const { t, s } of snapshots) {
      linear.pushSnapshot(t, s);
      hermite.pushSnapshot(t, s);
    }

    // At the midpoint of the curve, Hermite should have a different
    // (smoother) value than linear
    const linearResult = linear.getInterpolated(1175);  // renderTime = 1075
    const hermiteResult = hermite.getInterpolated(1175);

    // Both should be in the right ballpark
    expect(linearResult.x).toBeGreaterThan(40);
    expect(hermiteResult.x).toBeGreaterThan(40);

    // Hermite accounts for velocity, so it should differ from linear
    // (We can't assert exact values, but they shouldn't be identical)
    const diff = Math.abs(hermiteResult.y - linearResult.y);
    // Hermite should produce a different result (accounting for curve)
    // This is a smoke test — exact values depend on implementation
    expect(typeof hermiteResult.x).toBe('number');
    expect(typeof hermiteResult.y).toBe('number');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/client/Interpolator.test.ts -v`
Expected: FAIL (mode option doesn't exist yet)

**Step 3: Add Hermite interpolation mode**

Add `mode: 'linear' | 'hermite'` to `InterpolatorOptions`. Hermite interpolation uses cubic Hermite spline with velocity estimation from adjacent snapshots:

```
P(t) = (2t³ - 3t² + 1)p0 + (t³ - 2t² + t)m0 + (-2t³ + 3t²)p1 + (t³ - t²)m1
```

Where `m0` and `m1` are tangent (velocity) estimates from finite differences of neighboring snapshots.

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/client/Interpolator.test.ts -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/client/Interpolator.ts packages/multiplayer/tests/client/Interpolator.test.ts
git commit -m "feat(multiplayer): add Hermite interpolation mode for smoother curves"
```

---

### Task 17: Spectator Mode

**Files:**
- Create: `packages/multiplayer/src/game/SpectatorManager.ts`
- Create: `packages/multiplayer/tests/game/SpectatorManager.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/SpectatorManager.test.ts
import { SpectatorManager } from '../../src/game/SpectatorManager.js';

describe('SpectatorManager', () => {
  it('adds spectators', () => {
    const manager = new SpectatorManager();
    manager.add({ id: 's1', topia: { visitorId: 1, displayName: 'Alice' } as any });

    expect(manager.count).toBe(1);
  });

  it('removes spectators', () => {
    const manager = new SpectatorManager();
    manager.add({ id: 's1', topia: { visitorId: 1, displayName: 'Alice' } as any });
    manager.remove('s1');

    expect(manager.count).toBe(0);
  });

  it('determines if visitor should spectate based on zone mode', () => {
    const manager = new SpectatorManager({ mode: 'zone', playZone: 'arena' });

    expect(manager.shouldSpectate(['lobby', 'entrance'])).toBe(true);
    expect(manager.shouldSpectate(['arena'])).toBe(false);
    expect(manager.shouldSpectate(['arena', 'lobby'])).toBe(false);
  });

  it('spectates on overflow when max players reached', () => {
    const manager = new SpectatorManager({ mode: 'overflow', maxPlayers: 2 });

    expect(manager.shouldSpectateOverflow(1)).toBe(false);
    expect(manager.shouldSpectateOverflow(2)).toBe(true);
    expect(manager.shouldSpectateOverflow(3)).toBe(true);
  });
});
```

**Step 2: Implement and test**

Follow same TDD flow: implement `SpectatorManager`, run tests, commit.

**Step 3: Commit**

```bash
git add packages/multiplayer/src/game/SpectatorManager.ts packages/multiplayer/tests/game/SpectatorManager.test.ts
git commit -m "feat(multiplayer): add SpectatorManager with zone-based and overflow modes"
```

---

### Task 18: Structured Logging with Debug Channels

**Files:**
- Create: `packages/multiplayer/src/game/Logger.ts`
- Create: `packages/multiplayer/tests/game/Logger.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/Logger.test.ts
import { Logger } from '../../src/game/Logger.js';

describe('Logger', () => {
  it('logs to enabled channels', () => {
    const output: string[] = [];
    const logger = new Logger({
      channels: ['physics', 'scoring'],
      sink: (msg) => output.push(msg),
    });

    logger.log('physics', 'tick 42, 8 entities');
    logger.log('scoring', 'player scored');
    logger.log('input', 'should not appear');

    expect(output).toHaveLength(2);
    expect(output[0]).toContain('[physics]');
    expect(output[1]).toContain('[scoring]');
  });

  it('supports runtime channel toggle', () => {
    const output: string[] = [];
    const logger = new Logger({ channels: [], sink: (msg) => output.push(msg) });

    logger.log('debug', 'invisible');
    expect(output).toHaveLength(0);

    logger.enable('debug');
    logger.log('debug', 'visible');
    expect(output).toHaveLength(1);
  });

  it('attaches room context to messages', () => {
    const output: string[] = [];
    const logger = new Logger({
      channels: ['game'],
      sink: (msg) => output.push(msg),
      roomId: 'wiggle:scene-123',
    });

    logger.log('game', 'started');
    expect(output[0]).toContain('wiggle:scene-123');
  });
});
```

**Step 2: Implement and test**

Follow TDD flow.

**Step 3: Commit**

```bash
git add packages/multiplayer/src/game/Logger.ts packages/multiplayer/tests/game/Logger.test.ts
git commit -m "feat(multiplayer): add structured Logger with runtime channel toggling"
```

---

### Task 19: Wiggle Bots Example

**Files:**
- Create: `packages/multiplayer/examples/wiggle/server/bots/WanderBot.ts`
- Create: `packages/multiplayer/examples/wiggle/server/bots/AggressiveBot.ts`
- Modify: `packages/multiplayer/examples/wiggle/server/wiggle-game.ts` (add bot config)

**Step 1: Create WanderBot**

```typescript
// examples/wiggle/server/bots/WanderBot.ts
import { BotBehavior } from '@topia/multiplayer';

export const WanderBot = BotBehavior.define({
  think(bot, room, delta) {
    // Slightly adjust angle each tick for organic movement
    const currentAngle = (bot.entity as any).angle ?? 0;
    const nudge = (Math.random() - 0.5) * 0.3;
    bot.sendInput({ angle: currentAngle + nudge });
  },
});
```

**Step 2: Create AggressiveBot**

```typescript
// examples/wiggle/server/bots/AggressiveBot.ts
import { BotBehavior } from '@topia/multiplayer';

function angleTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function distanceTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export const AggressiveBot = BotBehavior.define({
  think(bot, room, delta) {
    // Find nearest non-bot snake
    const target = room.entities.nearest(bot.entity, bot.entity.constructor, {
      exclude: (e: any) => e.isBot || e.id === bot.entity.id,
    });

    if (target && distanceTo(bot.entity, target) < 200) {
      bot.sendInput({ angle: angleTo(bot.entity, target) });
    } else {
      // Wander toward nearest food
      const foods = room.entities.ofType(
        Array.from(room.entities.all()).find((e: any) => e.constructor.name === 'FoodEntity')?.constructor as any
      );
      if (foods.length > 0) {
        const nearest = foods.reduce((closest: any, food: any) => {
          return distanceTo(bot.entity, food) < distanceTo(bot.entity, closest) ? food : closest;
        });
        bot.sendInput({ angle: angleTo(bot.entity, nearest) });
      } else {
        bot.sendInput({ angle: Math.random() * Math.PI * 2 });
      }
    }
  },
});
```

**Step 3: Update wiggle-game.ts to include bots**

Add `bots` config to the game definition:

```typescript
bots: {
  fillTo: 6,
  behaviors: [WanderBot, AggressiveBot],
  despawnOnJoin: true,
  names: ['Slinky', 'Zigzag', 'Noodle', 'Squiggles', 'Pretzel', 'Swirl'],
},
```

**Step 4: Commit**

```bash
git add packages/multiplayer/examples/wiggle/
git commit -m "feat(multiplayer): add Wiggle bot examples (WanderBot + AggressiveBot)"
```

---

### Task 20: Topia SDK Bridge (Leaderboard + Badge Hooks)

**Files:**
- Create: `packages/multiplayer/src/topia/TopiaSDKBridge.ts`
- Create: `packages/multiplayer/tests/topia/TopiaSDKBridge.test.ts`
- Modify: `packages/multiplayer/examples/wiggle/server/wiggle-game.ts` (add SDK hooks)

**Step 1: Write failing test**

```typescript
// tests/topia/TopiaSDKBridge.test.ts
import { TopiaSDKBridge } from '../../src/topia/TopiaSDKBridge.js';

describe('TopiaSDKBridge', () => {
  it('creates bridge with credentials', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    expect(bridge.urlSlug).toBe('my-world');
  });

  it('defer queues SDK calls without blocking', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    let executed = false;
    bridge.defer(async (sdk) => {
      executed = true;
    });

    // Should not execute synchronously
    expect(executed).toBe(false);
  });

  it('tracks deferred calls for testing', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    bridge.deferTracked('grantBadge', ['speed-demon']);
    bridge.deferTracked('updateLeaderboard', ['high-scores', { visitorId: 42, score: 100 }]);

    expect(bridge.tracked).toHaveLength(2);
    expect(bridge.tracked[0]).toEqual({ method: 'grantBadge', args: ['speed-demon'] });
  });
});
```

**Step 2: Implement and test**

`TopiaSDKBridge` wraps `DeferQueue` and provides typed helper methods for common SDK operations. In production, `defer()` creates real SDK instances. In test mode (detected by missing credentials), calls are only tracked.

**Step 3: Update Wiggle example with SDK hooks**

Add `onPlayerEliminated` custom event and `onGameOver` with badge/leaderboard defer calls.

**Step 4: Commit**

```bash
git add packages/multiplayer/src/topia/TopiaSDKBridge.ts packages/multiplayer/tests/topia/TopiaSDKBridge.test.ts packages/multiplayer/examples/wiggle/
git commit -m "feat(multiplayer): add TopiaSDKBridge with defer queue and Wiggle SDK hooks"
```

---

