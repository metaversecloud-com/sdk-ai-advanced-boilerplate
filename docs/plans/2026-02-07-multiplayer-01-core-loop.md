> **Part of**: [@topia/multiplayer Implementation Plan](./2026-02-07-multiplayer-00-overview.md)
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 1: Core Loop (Wiggle Rewrite)

> Ship a working Wiggle clone on the new framework. Proves the architecture end-to-end. Single process, no Redis, no bots.

### Task 1: Scaffold the Package

**Files:**
- Create: `packages/multiplayer/package.json`
- Create: `packages/multiplayer/tsconfig.json`
- Modify: root `package.json` (add workspace)

**Step 1: Create package.json**

```json
{
  "name": "@topia/multiplayer",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client.js",
    "./testing": "./dist/testing/TestRoom.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest --config jest.config.ts",
    "test:watch": "jest --watch --config jest.config.ts"
  },
  "dependencies": {
    "colyseus": "^0.15.0",
    "@colyseus/core": "^0.15.0",
    "@colyseus/ws-transport": "^0.15.0"
  },
  "peerDependencies": {
    "@rtsdk/topia": ">=0.15.0",
    "express": ">=4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.0.0",
    "@types/express": "^4.17.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests/**/*.ts", "dist"]
}
```

**Step 3: Add workspace to root package.json**

Add `"packages/multiplayer"` to the `workspaces` array in `/package.json`.

**Step 4: Create jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testTimeout: 15000,
};

export default config;
```

**Step 5: Install dependencies**

Run: `cd packages/multiplayer && npm install`

**Step 6: Verify**

Run: `cd packages/multiplayer && npx tsc --noEmit`
Expected: No errors (empty project compiles)

**Step 7: Commit**

```bash
git add packages/multiplayer/ package.json
git commit -m "feat(multiplayer): scaffold @topia/multiplayer package with Colyseus deps"
```

---

### Task 2: Entity Base Class with @schema Decorator

**Files:**
- Create: `packages/multiplayer/src/game/schema.ts`
- Create: `packages/multiplayer/src/game/Entity.ts`
- Create: `packages/multiplayer/src/game/types.ts`
- Create: `packages/multiplayer/tests/game/schema.test.ts`
- Create: `packages/multiplayer/tests/game/Entity.test.ts`

**Step 1: Write failing test for @schema decorator**

```typescript
// tests/game/schema.test.ts
import { Entity, schema } from '../../src/game/Entity.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
}

describe('@schema decorator', () => {
  it('registers schema fields on the entity class', () => {
    const fields = TestEntity.getSchemaFields();
    expect(fields).toEqual({
      x: 'float32',
      y: 'float32',
      score: 'int16',
      name: 'string',
    });
  });

  it('does not include non-decorated fields', () => {
    class ExtendedEntity extends Entity {
      @schema('float32') x = 0;
      private internal = 'hidden';
    }
    const fields = ExtendedEntity.getSchemaFields();
    expect(fields).toEqual({ x: 'float32' });
    expect(fields).not.toHaveProperty('internal');
  });

  it('creates instance with default values', () => {
    const entity = new TestEntity('test-id');
    expect(entity.x).toBe(0);
    expect(entity.y).toBe(0);
    expect(entity.score).toBe(0);
    expect(entity.name).toBe('');
    expect(entity.id).toBe('test-id');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/game/schema.test.ts -v`
Expected: FAIL — `Cannot find module`

**Step 3: Implement types**

```typescript
// src/game/types.ts
export type SchemaType = 'float32' | 'float64' | 'int8' | 'int16' | 'int32' | 'uint8' | 'uint16' | 'uint32' | 'string' | 'boolean';

export interface SchemaField {
  type: SchemaType;
  propertyKey: string;
}

export interface GameDefinition {
  name: string;
  tickRate?: number;          // Server Hz, 0 = event-driven
  maxPlayers?: number;
  physics?: PhysicsConfig;
  bots?: BotConfig;
  spectatorMode?: 'zone' | 'overflow' | 'manual';
  playZone?: string;
  debug?: string[];
  maxRoomsPerProcess?: number;

  onCreate?(room: GameRoomContext): void | Promise<void>;
  onTick?(room: GameRoomContext, delta: number): void;
  onPlayerJoin?(room: GameRoomContext, player: Player): void | Promise<void>;
  onPlayerLeave?(room: GameRoomContext, player: Player): void;
  onSpectatorJoin?(room: GameRoomContext, spectator: Spectator): void;
  onGameOver?(room: GameRoomContext, winner?: Player): void | Promise<void>;
}

export interface PhysicsConfig {
  engine: 'matter' | 'rapier';
  gravity?: { x: number; y: number };
}

export interface BotConfig {
  fillTo?: number;
  behaviors: BotBehaviorDef[];
  despawnOnJoin?: boolean;
  names?: string[];
}

export interface BotBehaviorDef {
  thinkRate?: number;   // Hz, 0 = event-driven
  think?(bot: BotContext, room: GameRoomContext, delta: number): void;
  onMyTurn?(bot: BotContext, room: GameRoomContext): void;
}

export interface Player {
  id: string;
  entity: any;
  topia: {
    visitorId: number;
    displayName: string;
    profileId: string;
    urlSlug: string;
    sceneDropId: string;
    identityId: string;
  };
}

export interface Spectator {
  id: string;
  topia: Player['topia'];
}

export interface BotContext {
  entity: any;
  sendInput(input: Record<string, any>): void;
}

export interface GameRoomContext {
  tickCount: number;
  entities: EntityCollection;
  topia: TopiaRoomBridge;
  state: any;
  spawnEntity<T extends typeof Entity>(
    EntityClass: T,
    initial?: Partial<InstanceType<T>>
  ): InstanceType<T>;
  despawnEntity(entity: any): void;
  spawnBot(behavior: BotBehaviorDef, initial?: Record<string, any>): BotContext;
  log(channel: string, message: string): void;
}

export interface EntityCollection {
  count: number;
  all(): any[];
  ofType<T>(EntityClass: new (...args: any[]) => T): T[];
  nearest<T>(origin: any, EntityClass: new (...args: any[]) => T, opts?: { exclude?: (e: T) => boolean }): T | null;
}

export interface TopiaRoomBridge {
  defer(fn: (sdk: TopiaSDKContext) => Promise<void>): void;
  deferred: Array<{ method: string; args: any[] }>;  // For testing
}

export interface TopiaSDKContext {
  world: any;       // World SDK instance
  visitor(visitorId: number): any;  // Visitor SDK instance
}
```

**Step 4: Implement @schema decorator and Entity base class**

```typescript
// src/game/schema.ts
import type { SchemaType } from './types.js';

const SCHEMA_METADATA_KEY = Symbol('schemaFields');

export function schema(type: SchemaType) {
  return function (target: any, propertyKey: string) {
    const constructor = target.constructor;
    if (!constructor.hasOwnProperty(SCHEMA_METADATA_KEY)) {
      // Copy parent schema fields if inheriting
      const parentFields = constructor[SCHEMA_METADATA_KEY]
        ? { ...constructor[SCHEMA_METADATA_KEY] }
        : {};
      Object.defineProperty(constructor, SCHEMA_METADATA_KEY, {
        value: parentFields,
        writable: true,
        enumerable: false,
      });
    }
    constructor[SCHEMA_METADATA_KEY][propertyKey] = type;
  };
}

export function getSchemaFields(EntityClass: any): Record<string, SchemaType> {
  return EntityClass[SCHEMA_METADATA_KEY] || {};
}
```

```typescript
// src/game/Entity.ts
import { schema, getSchemaFields } from './schema.js';
import type { SchemaType } from './types.js';

export { schema };

let entityIdCounter = 0;

export class Entity {
  readonly id: string;
  isBot = false;

  constructor(id?: string) {
    this.id = id ?? `entity-${++entityIdCounter}`;
  }

  static getSchemaFields(): Record<string, SchemaType> {
    return getSchemaFields(this);
  }

  /** Called when this entity's owner sends input. Override in subclass. */
  onInput(input: Record<string, any>): void {}

  /** Serialize schema fields to a plain object for network sync. */
  toSnapshot(): Record<string, any> {
    const fields = (this.constructor as typeof Entity).getSchemaFields();
    const snapshot: Record<string, any> = { id: this.id };
    for (const key of Object.keys(fields)) {
      snapshot[key] = (this as any)[key];
    }
    return snapshot;
  }

  /** Apply a snapshot from the server. */
  applySnapshot(snapshot: Record<string, any>): void {
    const fields = (this.constructor as typeof Entity).getSchemaFields();
    for (const key of Object.keys(fields)) {
      if (key in snapshot) {
        (this as any)[key] = snapshot[key];
      }
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/game/schema.test.ts -v`
Expected: 3 tests PASS

**Step 6: Write Entity snapshot tests**

```typescript
// tests/game/Entity.test.ts
import { Entity, schema } from '../../src/game/Entity.js';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('int8') bodyLength = 3;

  // NOT synced
  bodyParts: Array<{ x: number; y: number }> = [];
}

describe('Entity', () => {
  it('serializes only schema fields to snapshot', () => {
    const snake = new SnakeEntity('snake-1');
    snake.x = 100;
    snake.y = 200;
    snake.angle = 1.5;
    snake.score = 42;
    snake.name = 'Zigzag';
    snake.bodyLength = 5;
    snake.bodyParts = [{ x: 90, y: 190 }, { x: 80, y: 180 }];

    const snapshot = snake.toSnapshot();

    expect(snapshot).toEqual({
      id: 'snake-1',
      x: 100,
      y: 200,
      angle: 1.5,
      score: 42,
      name: 'Zigzag',
      bodyLength: 5,
    });
    expect(snapshot).not.toHaveProperty('bodyParts');
    expect(snapshot).not.toHaveProperty('isBot');
  });

  it('applies snapshot from server', () => {
    const snake = new SnakeEntity('snake-1');
    snake.applySnapshot({ x: 50, y: 75, score: 10 });

    expect(snake.x).toBe(50);
    expect(snake.y).toBe(75);
    expect(snake.score).toBe(10);
    expect(snake.name).toBe('');  // unchanged
  });

  it('generates unique IDs when no ID provided', () => {
    const a = new SnakeEntity();
    const b = new SnakeEntity();
    expect(a.id).not.toBe(b.id);
  });
});
```

**Step 7: Run all tests**

Run: `cd packages/multiplayer && npx jest -v`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add packages/multiplayer/src/game/ packages/multiplayer/tests/game/
git commit -m "feat(multiplayer): add Entity base class with @schema decorator"
```

---

### Task 3: TopiaGame.define() Factory

**Files:**
- Create: `packages/multiplayer/src/game/TopiaGame.ts`
- Create: `packages/multiplayer/tests/game/TopiaGame.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/TopiaGame.test.ts
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

describe('TopiaGame.define()', () => {
  it('creates a game definition with defaults', () => {
    const game = TopiaGame.define({
      name: 'test-game',
    });

    expect(game.name).toBe('test-game');
    expect(game.tickRate).toBe(20);
    expect(game.maxPlayers).toBe(10);
  });

  it('accepts custom tick rate and max players', () => {
    const game = TopiaGame.define({
      name: 'custom-game',
      tickRate: 30,
      maxPlayers: 4,
    });

    expect(game.tickRate).toBe(30);
    expect(game.maxPlayers).toBe(4);
  });

  it('accepts event-driven mode (tickRate 0)', () => {
    const game = TopiaGame.define({
      name: 'grid-game',
      tickRate: 0,
    });

    expect(game.tickRate).toBe(0);
  });

  it('stores lifecycle hooks', () => {
    const onCreate = jest.fn();
    const onTick = jest.fn();
    const onPlayerJoin = jest.fn();
    const onPlayerLeave = jest.fn();

    const game = TopiaGame.define({
      name: 'hook-game',
      onCreate,
      onTick,
      onPlayerJoin,
      onPlayerLeave,
    });

    expect(game.hooks.onCreate).toBe(onCreate);
    expect(game.hooks.onTick).toBe(onTick);
    expect(game.hooks.onPlayerJoin).toBe(onPlayerJoin);
    expect(game.hooks.onPlayerLeave).toBe(onPlayerLeave);
  });

  it('stores debug channels', () => {
    const game = TopiaGame.define({
      name: 'debug-game',
      debug: ['physics', 'input', 'scoring'],
    });

    expect(game.debug).toEqual(['physics', 'input', 'scoring']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/game/TopiaGame.test.ts -v`
Expected: FAIL

**Step 3: Implement TopiaGame**

```typescript
// src/game/TopiaGame.ts
import type { GameDefinition, BotConfig } from './types.js';

export interface GameConfig {
  name: string;
  tickRate: number;
  maxPlayers: number;
  maxRoomsPerProcess: number;
  spectatorMode?: 'zone' | 'overflow' | 'manual';
  playZone?: string;
  debug: string[];
  bots?: BotConfig;
  hooks: {
    onCreate?: GameDefinition['onCreate'];
    onTick?: GameDefinition['onTick'];
    onPlayerJoin?: GameDefinition['onPlayerJoin'];
    onPlayerLeave?: GameDefinition['onPlayerLeave'];
    onSpectatorJoin?: GameDefinition['onSpectatorJoin'];
    onGameOver?: GameDefinition['onGameOver'];
  };
  roomId?: (topia: { urlSlug: string; sceneDropId: string }) => string;
}

export class TopiaGame {
  static define(definition: GameDefinition): GameConfig {
    return {
      name: definition.name,
      tickRate: definition.tickRate ?? 20,
      maxPlayers: definition.maxPlayers ?? 10,
      maxRoomsPerProcess: definition.maxRoomsPerProcess ?? 20,
      spectatorMode: definition.spectatorMode,
      playZone: definition.playZone,
      debug: definition.debug ?? [],
      bots: definition.bots,
      hooks: {
        onCreate: definition.onCreate,
        onTick: definition.onTick,
        onPlayerJoin: definition.onPlayerJoin,
        onPlayerLeave: definition.onPlayerLeave,
        onSpectatorJoin: definition.onSpectatorJoin,
        onGameOver: definition.onGameOver,
      },
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/game/TopiaGame.test.ts -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/game/TopiaGame.ts packages/multiplayer/tests/game/TopiaGame.test.ts
git commit -m "feat(multiplayer): add TopiaGame.define() factory with lifecycle hooks"
```

---

### Task 4: Topia Credential Extraction

**Files:**
- Create: `packages/multiplayer/src/topia/TopiaCredentials.ts`
- Create: `packages/multiplayer/tests/topia/TopiaCredentials.test.ts`

**Step 1: Write failing test**

```typescript
// tests/topia/TopiaCredentials.test.ts
import { TopiaCredentials } from '../../src/topia/TopiaCredentials.js';

describe('TopiaCredentials', () => {
  const validParams = new URLSearchParams({
    assetId: 'asset-123',
    displayName: 'Alice',
    identityId: 'ident-456',
    interactiveNonce: 'nonce-789',
    interactivePublicKey: 'pk-abc',
    profileId: 'profile-def',
    sceneDropId: 'scene-ghi',
    uniqueName: 'my-game',
    urlSlug: 'my-world',
    username: 'alice',
    visitorId: '42',
  });

  it('extracts credentials from URL search params', () => {
    const creds = TopiaCredentials.fromURLParams(validParams);

    expect(creds.assetId).toBe('asset-123');
    expect(creds.visitorId).toBe(42);
    expect(creds.urlSlug).toBe('my-world');
    expect(creds.sceneDropId).toBe('scene-ghi');
    expect(creds.displayName).toBe('Alice');
  });

  it('extracts from a full iframe URL', () => {
    const url = 'https://myapp.com/?assetId=a1&visitorId=7&urlSlug=world&interactiveNonce=n&interactivePublicKey=k&sceneDropId=s1&identityId=i1&profileId=p1&uniqueName=u1&username=bob&displayName=Bob';
    const creds = TopiaCredentials.fromURL(url);

    expect(creds.visitorId).toBe(7);
    expect(creds.urlSlug).toBe('world');
    expect(creds.displayName).toBe('Bob');
  });

  it('throws on missing required fields', () => {
    const incomplete = new URLSearchParams({ assetId: 'a1' });
    expect(() => TopiaCredentials.fromURLParams(incomplete)).toThrow(
      /Missing required Topia credential/
    );
  });

  it('extracts from Socket.io auth handshake', () => {
    const auth = {
      assetId: 'asset-123',
      visitorId: '42',
      urlSlug: 'my-world',
      interactiveNonce: 'nonce-789',
      interactivePublicKey: 'pk-abc',
      sceneDropId: 'scene-ghi',
      identityId: 'ident-456',
      profileId: 'profile-def',
      uniqueName: 'my-game',
      username: 'alice',
      displayName: 'Alice',
    };
    const creds = TopiaCredentials.fromSocketAuth(auth);

    expect(creds.visitorId).toBe(42);
    expect(creds.urlSlug).toBe('my-world');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/topia/TopiaCredentials.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/topia/TopiaCredentials.ts
export interface TopiaPlayerCredentials {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: number;
}

const REQUIRED_FIELDS = [
  'assetId', 'visitorId', 'urlSlug', 'interactiveNonce',
  'interactivePublicKey', 'sceneDropId', 'identityId',
  'profileId', 'uniqueName', 'username', 'displayName',
] as const;

export class TopiaCredentials {
  static fromURLParams(params: URLSearchParams): TopiaPlayerCredentials {
    const raw: Record<string, string> = {};
    for (const field of REQUIRED_FIELDS) {
      const value = params.get(field);
      if (!value) {
        throw new Error(`Missing required Topia credential: ${field}`);
      }
      raw[field] = value;
    }

    return {
      ...raw,
      visitorId: parseInt(raw.visitorId, 10),
    } as TopiaPlayerCredentials;
  }

  static fromURL(url: string): TopiaPlayerCredentials {
    const parsed = new URL(url);
    return TopiaCredentials.fromURLParams(parsed.searchParams);
  }

  static fromSocketAuth(auth: Record<string, string>): TopiaPlayerCredentials {
    for (const field of REQUIRED_FIELDS) {
      if (!auth[field]) {
        throw new Error(`Missing required Topia credential: ${field}`);
      }
    }

    return {
      ...auth,
      visitorId: parseInt(auth.visitorId, 10),
    } as TopiaPlayerCredentials;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/topia/TopiaCredentials.test.ts -v`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/topia/TopiaCredentials.ts packages/multiplayer/tests/topia/TopiaCredentials.test.ts
git commit -m "feat(multiplayer): add TopiaCredentials extraction from URL/Socket auth"
```

---

### Task 5: Room Naming (sceneDropId Mapping)

**Files:**
- Create: `packages/multiplayer/src/topia/RoomNaming.ts`
- Create: `packages/multiplayer/tests/topia/RoomNaming.test.ts`

**Step 1: Write failing test**

```typescript
// tests/topia/RoomNaming.test.ts
import { RoomNaming } from '../../src/topia/RoomNaming.js';

describe('RoomNaming', () => {
  it('generates room ID from game name + sceneDropId', () => {
    const id = RoomNaming.defaultRoomId('wiggle', {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('wiggle:scene-abc-123');
  });

  it('supports custom room ID function', () => {
    const customFn = (topia: { urlSlug: string; sceneDropId: string }) =>
      `${topia.urlSlug}:${topia.sceneDropId}`;

    const id = RoomNaming.resolve('wiggle', customFn, {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('my-world:scene-abc-123');
  });

  it('falls back to default when no custom function', () => {
    const id = RoomNaming.resolve('wiggle', undefined, {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('wiggle:scene-abc-123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/topia/RoomNaming.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/topia/RoomNaming.ts
type RoomIdFn = (topia: { urlSlug: string; sceneDropId: string }) => string;

export class RoomNaming {
  static defaultRoomId(gameName: string, topia: { urlSlug: string; sceneDropId: string }): string {
    return `${gameName}:${topia.sceneDropId}`;
  }

  static resolve(
    gameName: string,
    customFn: RoomIdFn | undefined,
    topia: { urlSlug: string; sceneDropId: string }
  ): string {
    if (customFn) {
      return customFn(topia);
    }
    return RoomNaming.defaultRoomId(gameName, topia);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/topia/RoomNaming.test.ts -v`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/topia/RoomNaming.ts packages/multiplayer/tests/topia/RoomNaming.test.ts
git commit -m "feat(multiplayer): add RoomNaming with sceneDropId-based room IDs"
```

---

### Task 6: DeferQueue (Non-Blocking SDK Calls)

**Files:**
- Create: `packages/multiplayer/src/topia/DeferQueue.ts`
- Create: `packages/multiplayer/tests/topia/DeferQueue.test.ts`

**Step 1: Write failing test**

```typescript
// tests/topia/DeferQueue.test.ts
import { DeferQueue } from '../../src/topia/DeferQueue.js';

describe('DeferQueue', () => {
  it('queues and executes deferred functions', async () => {
    const queue = new DeferQueue();
    const results: string[] = [];

    queue.defer(async () => { results.push('a'); });
    queue.defer(async () => { results.push('b'); });

    await queue.flush();

    expect(results).toEqual(['a', 'b']);
  });

  it('does not block the caller', () => {
    const queue = new DeferQueue();
    let executed = false;

    queue.defer(async () => {
      await new Promise(r => setTimeout(r, 50));
      executed = true;
    });

    // Should return immediately, not wait for the deferred fn
    expect(executed).toBe(false);
  });

  it('retries failed calls with backoff', async () => {
    const queue = new DeferQueue({ maxRetries: 2, baseDelayMs: 10 });
    let attempts = 0;

    queue.defer(async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
    });

    await queue.flush();
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it('logs and drops after max retries', async () => {
    const errors: Error[] = [];
    const queue = new DeferQueue({
      maxRetries: 1,
      baseDelayMs: 10,
      onError: (err) => errors.push(err),
    });

    queue.defer(async () => { throw new Error('permanent'); });

    await queue.flush();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('permanent');
  });

  it('tracks deferred calls for testing', () => {
    const queue = new DeferQueue();

    queue.deferTracked('grantBadge', ['wiggle-champion']);
    queue.deferTracked('triggerParticle', [{ name: 'firework', duration: 3000 }]);

    expect(queue.tracked).toEqual([
      { method: 'grantBadge', args: ['wiggle-champion'] },
      { method: 'triggerParticle', args: [{ name: 'firework', duration: 3000 }] },
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/topia/DeferQueue.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/topia/DeferQueue.ts
export interface DeferQueueOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onError?: (error: Error) => void;
}

type DeferredFn = () => Promise<void>;

interface TrackedCall {
  method: string;
  args: any[];
}

export class DeferQueue {
  private queue: DeferredFn[] = [];
  private processing = false;
  private maxRetries: number;
  private baseDelayMs: number;
  private onError?: (error: Error) => void;

  readonly tracked: TrackedCall[] = [];

  constructor(options: DeferQueueOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.onError = options.onError;
  }

  defer(fn: DeferredFn): void {
    this.queue.push(fn);
    this.process();
  }

  deferTracked(method: string, args: any[]): void {
    this.tracked.push({ method, args });
  }

  async flush(): Promise<void> {
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await this.executeWithRetry(fn);
    }
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await this.executeWithRetry(fn);
    }

    this.processing = false;
  }

  private async executeWithRetry(fn: DeferredFn): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    if (lastError && this.onError) {
      this.onError(lastError);
    }
  }

  reset(): void {
    this.queue = [];
    this.tracked.length = 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/topia/DeferQueue.test.ts -v`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/topia/DeferQueue.ts packages/multiplayer/tests/topia/DeferQueue.test.ts
git commit -m "feat(multiplayer): add DeferQueue for non-blocking async SDK calls"
```

---

### Task 7: InputHandler (Client Input Batching)

**Files:**
- Create: `packages/multiplayer/src/game/InputHandler.ts`
- Create: `packages/multiplayer/tests/game/InputHandler.test.ts`

**Step 1: Write failing test**

```typescript
// tests/game/InputHandler.test.ts
import { InputHandler } from '../../src/game/InputHandler.js';

describe('InputHandler', () => {
  it('assigns incrementing sequence numbers', () => {
    const handler = new InputHandler();

    const p1 = handler.package({ angle: 1.5 });
    const p2 = handler.package({ angle: 2.0 });

    expect(p1.seq).toBe(1);
    expect(p2.seq).toBe(2);
  });

  it('attaches timestamp to each input', () => {
    const handler = new InputHandler();
    const before = Date.now();
    const pkg = handler.package({ angle: 1.5 });
    const after = Date.now();

    expect(pkg.timestamp).toBeGreaterThanOrEqual(before);
    expect(pkg.timestamp).toBeLessThanOrEqual(after);
  });

  it('wraps the input payload', () => {
    const handler = new InputHandler();
    const pkg = handler.package({ angle: 1.5, boost: true });

    expect(pkg.input).toEqual({ angle: 1.5, boost: true });
  });

  it('tracks unconfirmed inputs', () => {
    const handler = new InputHandler();

    handler.package({ angle: 1.0 });
    handler.package({ angle: 2.0 });
    handler.package({ angle: 3.0 });

    expect(handler.unconfirmed).toHaveLength(3);

    handler.confirmUpTo(2);

    expect(handler.unconfirmed).toHaveLength(1);
    expect(handler.unconfirmed[0].seq).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/game/InputHandler.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/game/InputHandler.ts
export interface InputPackage {
  seq: number;
  timestamp: number;
  input: Record<string, any>;
}

export class InputHandler {
  private seqCounter = 0;
  readonly unconfirmed: InputPackage[] = [];

  package(input: Record<string, any>): InputPackage {
    const pkg: InputPackage = {
      seq: ++this.seqCounter,
      timestamp: Date.now(),
      input,
    };
    this.unconfirmed.push(pkg);
    return pkg;
  }

  confirmUpTo(seq: number): void {
    const idx = this.unconfirmed.findIndex(p => p.seq > seq);
    if (idx === -1) {
      this.unconfirmed.length = 0;
    } else {
      this.unconfirmed.splice(0, idx);
    }
  }

  reset(): void {
    this.seqCounter = 0;
    this.unconfirmed.length = 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/game/InputHandler.test.ts -v`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/game/InputHandler.ts packages/multiplayer/tests/game/InputHandler.test.ts
git commit -m "feat(multiplayer): add InputHandler with sequence numbering and confirmation"
```

---

### Task 8: Interpolator (Snapshot Buffer + Smooth Rendering)

**Files:**
- Create: `packages/multiplayer/src/client/Interpolator.ts`
- Create: `packages/multiplayer/tests/client/Interpolator.test.ts`

**Step 1: Write failing test**

```typescript
// tests/client/Interpolator.test.ts
import { Interpolator } from '../../src/client/Interpolator.js';

describe('Interpolator', () => {
  it('stores snapshots in order', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1050, { x: 50, y: 50 });

    expect(interp.snapshotCount).toBe(2);
  });

  it('interpolates between two snapshots (linear)', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // Render time = now - bufferMs. If we set "now" to 1150,
    // render time = 1050, which is 50% between snapshot 1000 and 1100
    const result = interp.getInterpolated(1150);

    expect(result.x).toBeCloseTo(50, 0);
    expect(result.y).toBeCloseTo(100, 0);
  });

  it('clamps to latest snapshot when ahead', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // renderTime = 1300 - 100 = 1200, which is past the last snapshot
    const result = interp.getInterpolated(1300);

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('clamps to earliest snapshot when behind', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // renderTime = 1050 - 100 = 950, which is before the first snapshot
    const result = interp.getInterpolated(1050);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('interpolates angles via shortest arc', () => {
    const interp = new Interpolator({ bufferMs: 100, angleFields: ['angle'] });

    // Crossing the 0/2PI boundary: 350° → 10° should go through 0°
    const deg2rad = (d: number) => d * Math.PI / 180;
    interp.pushSnapshot(1000, { angle: deg2rad(350) });
    interp.pushSnapshot(1100, { angle: deg2rad(10) });

    // 50% between 350° and 10° (shortest arc) = 0° = 0 rad
    const result = interp.getInterpolated(1150);
    const resultDeg = (result.angle * 180 / Math.PI + 360) % 360;

    expect(resultDeg).toBeCloseTo(0, 0);
  });

  it('drops old snapshots beyond buffer limit', () => {
    const interp = new Interpolator({ bufferMs: 100, maxSnapshots: 3 });

    interp.pushSnapshot(1000, { x: 0 });
    interp.pushSnapshot(1050, { x: 50 });
    interp.pushSnapshot(1100, { x: 100 });
    interp.pushSnapshot(1150, { x: 150 });

    expect(interp.snapshotCount).toBe(3); // oldest dropped
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/client/Interpolator.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/client/Interpolator.ts
interface Snapshot {
  timestamp: number;
  state: Record<string, number>;
}

export interface InterpolatorOptions {
  bufferMs?: number;       // How far behind real-time to render (default 100ms)
  maxSnapshots?: number;   // Ring buffer size (default 30)
  angleFields?: string[];  // Fields that use shortest-arc lerp
}

export class Interpolator {
  private snapshots: Snapshot[] = [];
  private bufferMs: number;
  private maxSnapshots: number;
  private angleFields: Set<string>;

  constructor(options: InterpolatorOptions = {}) {
    this.bufferMs = options.bufferMs ?? 100;
    this.maxSnapshots = options.maxSnapshots ?? 30;
    this.angleFields = new Set(options.angleFields ?? []);
  }

  get snapshotCount(): number {
    return this.snapshots.length;
  }

  pushSnapshot(timestamp: number, state: Record<string, number>): void {
    this.snapshots.push({ timestamp, state: { ...state } });
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  getInterpolated(now: number): Record<string, number> {
    if (this.snapshots.length === 0) return {};

    const renderTime = now - this.bufferMs;

    // Before first snapshot
    if (renderTime <= this.snapshots[0].timestamp) {
      return { ...this.snapshots[0].state };
    }

    // After last snapshot
    if (renderTime >= this.snapshots[this.snapshots.length - 1].timestamp) {
      return { ...this.snapshots[this.snapshots.length - 1].state };
    }

    // Find bounding snapshots
    let i = 0;
    for (; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i + 1].timestamp >= renderTime) break;
    }

    const from = this.snapshots[i];
    const to = this.snapshots[i + 1];
    const range = to.timestamp - from.timestamp;
    const t = range === 0 ? 0 : (renderTime - from.timestamp) / range;

    return this.lerp(from.state, to.state, t);
  }

  private lerp(
    from: Record<string, number>,
    to: Record<string, number>,
    t: number,
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const key of Object.keys(to)) {
      const a = from[key] ?? to[key];
      const b = to[key];

      if (this.angleFields.has(key)) {
        result[key] = this.lerpAngle(a, b, t);
      } else {
        result[key] = a + (b - a) * t;
      }
    }

    return result;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const TWO_PI = Math.PI * 2;
    let diff = ((b - a) % TWO_PI + TWO_PI + Math.PI) % TWO_PI - Math.PI;
    return a + diff * t;
  }

  reset(): void {
    this.snapshots = [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/client/Interpolator.test.ts -v`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/client/Interpolator.ts packages/multiplayer/tests/client/Interpolator.test.ts
git commit -m "feat(multiplayer): add Interpolator with linear lerp and angle shortest-arc"
```

---

### Task 9: Predictor (Client-Side Prediction + Reconciliation)

**Files:**
- Create: `packages/multiplayer/src/client/Predictor.ts`
- Create: `packages/multiplayer/tests/client/Predictor.test.ts`

**Step 1: Write failing test**

```typescript
// tests/client/Predictor.test.ts
import { Predictor } from '../../src/client/Predictor.js';

describe('Predictor', () => {
  const applyInput = (state: Record<string, number>, input: Record<string, any>) => {
    // Simple: move in direction of angle at speed 5
    return {
      ...state,
      x: state.x + Math.cos(input.angle) * 5,
      y: state.y + Math.sin(input.angle) * 5,
    };
  };

  it('predicts state by applying unconfirmed inputs', () => {
    const predictor = new Predictor({ applyInput });

    const serverState = { x: 0, y: 0 };
    const unconfirmedInputs = [
      { seq: 1, timestamp: 1000, input: { angle: 0 } },       // +5,0
      { seq: 2, timestamp: 1050, input: { angle: 0 } },       // +5,0
    ];

    const predicted = predictor.predict(serverState, unconfirmedInputs);

    expect(predicted.x).toBeCloseTo(10, 1);
    expect(predicted.y).toBeCloseTo(0, 1);
  });

  it('reconciles when server confirms inputs', () => {
    const predictor = new Predictor({ applyInput, smoothingFrames: 3 });

    // Server says we're at (5, 0) after processing seq 1
    predictor.setServerState({ x: 5, y: 0 }, 1);

    // We still have seq 2 unconfirmed
    const unconfirmedInputs = [
      { seq: 2, timestamp: 1050, input: { angle: 0 } },
    ];

    const predicted = predictor.predict({ x: 5, y: 0 }, unconfirmedInputs);

    // Server (5,0) + unconfirmed seq2 (+5,0) = (10, 0)
    expect(predicted.x).toBeCloseTo(10, 1);
  });

  it('smooths corrections over multiple frames', () => {
    const predictor = new Predictor({ applyInput, smoothingFrames: 3 });

    // We predicted (10, 0) but server says (8, 0)
    predictor.setCorrection({ x: 10, y: 0 }, { x: 8, y: 0 });

    // Frame 1: should be partially corrected (not snapped)
    const frame1 = predictor.getSmoothed({ x: 8, y: 0 });
    expect(frame1.x).toBeGreaterThan(8);
    expect(frame1.x).toBeLessThan(10);

    // After all smoothing frames, should converge to server truth
    predictor.getSmoothed({ x: 8, y: 0 });
    const frame3 = predictor.getSmoothed({ x: 8, y: 0 });
    expect(frame3.x).toBeCloseTo(8, 0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/client/Predictor.test.ts -v`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/client/Predictor.ts
import type { InputPackage } from '../game/InputHandler.js';

export interface PredictorOptions {
  applyInput: (state: Record<string, number>, input: Record<string, any>) => Record<string, number>;
  smoothingFrames?: number;  // Frames over which to blend corrections (default 3)
}

export class Predictor {
  private applyInput: PredictorOptions['applyInput'];
  private smoothingFrames: number;
  private correctionOffset: Record<string, number> = {};
  private correctionFrame = 0;
  private lastConfirmedSeq = 0;

  constructor(options: PredictorOptions) {
    this.applyInput = options.applyInput;
    this.smoothingFrames = options.smoothingFrames ?? 3;
  }

  predict(
    serverState: Record<string, number>,
    unconfirmedInputs: InputPackage[],
  ): Record<string, number> {
    let state = { ...serverState };
    for (const pkg of unconfirmedInputs) {
      state = this.applyInput(state, pkg.input);
    }
    return state;
  }

  setServerState(state: Record<string, number>, lastProcessedSeq: number): void {
    this.lastConfirmedSeq = lastProcessedSeq;
  }

  setCorrection(
    predicted: Record<string, number>,
    serverTruth: Record<string, number>,
  ): void {
    this.correctionOffset = {};
    for (const key of Object.keys(serverTruth)) {
      const diff = (predicted[key] ?? 0) - (serverTruth[key] ?? 0);
      if (Math.abs(diff) > 0.01) {
        this.correctionOffset[key] = diff;
      }
    }
    this.correctionFrame = 0;
  }

  getSmoothed(currentState: Record<string, number>): Record<string, number> {
    this.correctionFrame++;
    const t = Math.min(this.correctionFrame / this.smoothingFrames, 1);
    const result = { ...currentState };

    for (const key of Object.keys(this.correctionOffset)) {
      const remaining = this.correctionOffset[key] * (1 - t);
      result[key] = (currentState[key] ?? 0) + remaining;
    }

    if (t >= 1) {
      this.correctionOffset = {};
    }

    return result;
  }

  get confirmedSeq(): number {
    return this.lastConfirmedSeq;
  }

  reset(): void {
    this.correctionOffset = {};
    this.correctionFrame = 0;
    this.lastConfirmedSeq = 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/client/Predictor.test.ts -v`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/client/Predictor.ts packages/multiplayer/tests/client/Predictor.test.ts
git commit -m "feat(multiplayer): add Predictor with client-side prediction and smooth reconciliation"
```

---

### Task 10: TopiaRoom (Colyseus Room Subclass)

**Files:**
- Create: `packages/multiplayer/src/core/TopiaRoom.ts`
- Create: `packages/multiplayer/tests/core/TopiaRoom.test.ts`

This is where the game loop, entity collection, and player management converge. The TopiaRoom wraps a Colyseus Room with Topia-specific lifecycle and entity management.

**Step 1: Write failing test**

```typescript
// tests/core/TopiaRoom.test.ts
import { EntityCollection } from '../../src/core/TopiaRoom.js';
import { Entity, schema } from '../../src/game/Entity.js';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

class FoodEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

describe('EntityCollection', () => {
  it('adds and retrieves entities', () => {
    const collection = new EntityCollection();
    const snake = new SnakeEntity('s1');
    const food = new FoodEntity('f1');

    collection.add(snake);
    collection.add(food);

    expect(collection.count).toBe(2);
    expect(collection.all()).toContain(snake);
    expect(collection.all()).toContain(food);
  });

  it('filters by entity type', () => {
    const collection = new EntityCollection();
    collection.add(new SnakeEntity('s1'));
    collection.add(new SnakeEntity('s2'));
    collection.add(new FoodEntity('f1'));

    const snakes = collection.ofType(SnakeEntity);
    expect(snakes).toHaveLength(2);
    expect(snakes.every(s => s instanceof SnakeEntity)).toBe(true);
  });

  it('finds nearest entity of type', () => {
    const collection = new EntityCollection();

    const origin = new SnakeEntity('s1');
    origin.x = 0;
    origin.y = 0;
    collection.add(origin);

    const near = new FoodEntity('f1');
    near.x = 10;
    near.y = 0;
    collection.add(near);

    const far = new FoodEntity('f2');
    far.x = 100;
    far.y = 0;
    collection.add(far);

    const nearest = collection.nearest(origin, FoodEntity);
    expect(nearest?.id).toBe('f1');
  });

  it('respects exclude filter in nearest', () => {
    const collection = new EntityCollection();

    const origin = new SnakeEntity('s1');
    origin.x = 0;
    origin.y = 0;
    collection.add(origin);

    const close = new SnakeEntity('s2');
    close.x = 5;
    close.y = 0;
    close.isBot = true;
    collection.add(close);

    const human = new SnakeEntity('s3');
    human.x = 50;
    human.y = 0;
    collection.add(human);

    const nearest = collection.nearest(origin, SnakeEntity, {
      exclude: (e) => e.isBot || e.id === origin.id,
    });
    expect(nearest?.id).toBe('s3');
  });

  it('removes entities', () => {
    const collection = new EntityCollection();
    const snake = new SnakeEntity('s1');
    collection.add(snake);

    expect(collection.count).toBe(1);
    collection.remove('s1');
    expect(collection.count).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/core/TopiaRoom.test.ts -v`
Expected: FAIL

**Step 3: Implement EntityCollection**

```typescript
// src/core/TopiaRoom.ts
import { Entity } from '../game/Entity.js';

export class EntityCollection {
  private entities: Map<string, Entity> = new Map();

  get count(): number {
    return this.entities.size;
  }

  add(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  all(): Entity[] {
    return Array.from(this.entities.values());
  }

  ofType<T extends Entity>(EntityClass: new (...args: any[]) => T): T[] {
    return this.all().filter((e): e is T => e instanceof EntityClass);
  }

  nearest<T extends Entity>(
    origin: Entity,
    EntityClass: new (...args: any[]) => T,
    opts?: { exclude?: (e: T) => boolean },
  ): T | null {
    const candidates = this.ofType(EntityClass).filter(e => {
      if (e.id === origin.id) return false;
      if (opts?.exclude?.(e)) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    let closest: T | null = null;
    let closestDist = Infinity;

    const ox = (origin as any).x ?? 0;
    const oy = (origin as any).y ?? 0;

    for (const candidate of candidates) {
      const cx = (candidate as any).x ?? 0;
      const cy = (candidate as any).y ?? 0;
      const dist = (cx - ox) ** 2 + (cy - oy) ** 2;
      if (dist < closestDist) {
        closestDist = dist;
        closest = candidate;
      }
    }

    return closest;
  }

  clear(): void {
    this.entities.clear();
  }

  /** Get all entity snapshots for network sync */
  toSnapshots(): Array<{ type: string; snapshot: Record<string, any> }> {
    return this.all().map(e => ({
      type: e.constructor.name,
      snapshot: e.toSnapshot(),
    }));
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/core/TopiaRoom.test.ts -v`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/core/TopiaRoom.ts packages/multiplayer/tests/core/TopiaRoom.test.ts
git commit -m "feat(multiplayer): add EntityCollection with type filtering and nearest-entity search"
```

---

### Task 11: TestRoom (Synchronous Test Harness)

**Files:**
- Create: `packages/multiplayer/src/testing/TestRoom.ts`
- Create: `packages/multiplayer/tests/testing/TestRoom.test.ts`

**Step 1: Write failing test**

```typescript
// tests/testing/TestRoom.test.ts
import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';

class BallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
}

class CoinEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

const SimpleGame = TopiaGame.define({
  name: 'simple-test',
  tickRate: 20,
  maxPlayers: 4,

  onCreate(room) {
    room.spawnEntity(CoinEntity, { x: 50, y: 50 });
  },

  onTick(room, delta) {
    for (const ball of room.entities.ofType(BallEntity)) {
      for (const coin of room.entities.ofType(CoinEntity)) {
        const dx = ball.x - coin.x;
        const dy = ball.y - coin.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          ball.score += 1;
          coin.x = Math.random() * 500;
          coin.y = Math.random() * 500;
        }
      }
    }
  },

  onPlayerJoin(room, player) {
    room.spawnEntity(BallEntity, { x: 0, y: 0 });
  },
});

describe('TestRoom', () => {
  it('creates a room and runs onCreate', () => {
    const room = TestRoom.create(SimpleGame);

    expect(room.entities.count).toBe(1); // 1 coin from onCreate
    expect(room.entities.ofType(CoinEntity)).toHaveLength(1);
  });

  it('adds players and triggers onPlayerJoin', () => {
    const room = TestRoom.create(SimpleGame);
    const player = room.addPlayer({ displayName: 'Alice' });

    expect(player.topia.displayName).toBe('Alice');
    expect(room.entities.ofType(BallEntity)).toHaveLength(1);
  });

  it('runs tick manually', () => {
    const room = TestRoom.create(SimpleGame);
    const player = room.addPlayer();

    // Position player entity on top of coin
    const ball = room.entities.ofType(BallEntity)[0];
    const coin = room.entities.ofType(CoinEntity)[0];
    ball.x = coin.x;
    ball.y = coin.y;

    room.tick();

    expect(ball.score).toBe(1);
  });

  it('tracks deferred SDK calls', () => {
    const GameWithDefer = TopiaGame.define({
      name: 'defer-test',
      onPlayerJoin(room, player) {
        room.spawnEntity(BallEntity, { x: 0, y: 0 });
        room.topia.deferTracked('grantBadge', ['first-join']);
      },
    });

    const room = TestRoom.create(GameWithDefer);
    room.addPlayer();

    expect(room.topia.tracked).toContainEqual({
      method: 'grantBadge',
      args: ['first-join'],
    });
  });

  it('tracks tick count', () => {
    const room = TestRoom.create(SimpleGame);

    expect(room.tickCount).toBe(0);
    room.tick();
    room.tick();
    room.tick();
    expect(room.tickCount).toBe(3);
  });

  it('removes players and triggers onPlayerLeave', () => {
    const leaveFn = jest.fn();
    const GameWithLeave = TopiaGame.define({
      name: 'leave-test',
      onPlayerJoin(room, player) {
        room.spawnEntity(BallEntity, { x: 0, y: 0 });
      },
      onPlayerLeave: leaveFn,
    });

    const room = TestRoom.create(GameWithLeave);
    const player = room.addPlayer();
    room.removePlayer(player.id);

    expect(leaveFn).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/multiplayer && npx jest tests/testing/TestRoom.test.ts -v`
Expected: FAIL

**Step 3: Implement TestRoom**

```typescript
// src/testing/TestRoom.ts
import { EntityCollection } from '../core/TopiaRoom.js';
import { Entity } from '../game/Entity.js';
import { DeferQueue } from '../topia/DeferQueue.js';
import type { GameConfig } from '../game/TopiaGame.js';
import type { Player, GameRoomContext } from '../game/types.js';

let testPlayerCounter = 0;

export class TestRoom implements GameRoomContext {
  readonly entities: EntityCollection;
  readonly topia: DeferQueue;
  readonly state: Record<string, any> = {};
  tickCount = 0;

  private gameConfig: GameConfig;
  private players: Map<string, Player> = new Map();
  private logMessages: Array<{ channel: string; message: string }> = [];

  private constructor(gameConfig: GameConfig) {
    this.gameConfig = gameConfig;
    this.entities = new EntityCollection();
    this.topia = new DeferQueue();
  }

  static create(gameConfig: GameConfig): TestRoom {
    const room = new TestRoom(gameConfig);
    gameConfig.hooks.onCreate?.(room);
    return room;
  }

  addPlayer(overrides?: Partial<Player['topia']>): Player {
    const id = `test-player-${++testPlayerCounter}`;
    const player: Player = {
      id,
      entity: null as any,
      topia: {
        visitorId: testPlayerCounter,
        displayName: overrides?.displayName ?? `Player ${testPlayerCounter}`,
        profileId: overrides?.profileId ?? `profile-${testPlayerCounter}`,
        urlSlug: overrides?.urlSlug ?? 'test-world',
        sceneDropId: overrides?.sceneDropId ?? 'test-scene',
        identityId: overrides?.identityId ?? `identity-${testPlayerCounter}`,
      },
    };

    this.players.set(id, player);
    this.gameConfig.hooks.onPlayerJoin?.(this, player);

    // If onPlayerJoin spawned an entity, link it
    const allEntities = this.entities.all();
    if (allEntities.length > 0 && !player.entity) {
      player.entity = allEntities[allEntities.length - 1];
    }

    return player;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      this.gameConfig.hooks.onPlayerLeave?.(this, player);
      this.players.delete(playerId);
    }
  }

  tick(delta?: number): void {
    this.tickCount++;
    this.gameConfig.hooks.onTick?.(this, delta ?? 1 / (this.gameConfig.tickRate || 20));
  }

  spawnEntity<T extends typeof Entity>(
    EntityClass: T,
    initial?: Partial<InstanceType<T>>,
  ): InstanceType<T> {
    const entity = new EntityClass() as InstanceType<T>;
    if (initial) {
      Object.assign(entity, initial);
    }
    this.entities.add(entity);
    return entity;
  }

  despawnEntity(entity: Entity): void {
    this.entities.remove(entity.id);
  }

  spawnBot(behavior: any, initial?: Record<string, any>): any {
    // Phase 2 — stub for now
    return { entity: null, sendInput: () => {} };
  }

  log(channel: string, message: string): void {
    this.logMessages.push({ channel, message });
    if (this.gameConfig.debug.includes(channel)) {
      console.log(`[${channel}] ${message}`);
    }
  }

  getLogs(channel?: string): Array<{ channel: string; message: string }> {
    if (channel) return this.logMessages.filter(l => l.channel === channel);
    return [...this.logMessages];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/multiplayer && npx jest tests/testing/TestRoom.test.ts -v`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add packages/multiplayer/src/testing/TestRoom.ts packages/multiplayer/tests/testing/TestRoom.test.ts
git commit -m "feat(multiplayer): add TestRoom synchronous test harness"
```

---

### Task 12: Package Exports + Wiggle Example Scaffold

**Files:**
- Create: `packages/multiplayer/src/index.ts`
- Create: `packages/multiplayer/src/client.ts`
- Create: `packages/multiplayer/examples/wiggle/server/wiggle-game.ts`
- Create: `packages/multiplayer/examples/wiggle/server/entities/SnakeEntity.ts`
- Create: `packages/multiplayer/examples/wiggle/server/entities/FoodEntity.ts`

**Step 1: Create server exports**

```typescript
// src/index.ts
// Core
export { EntityCollection } from './core/TopiaRoom.js';

// Game
export { TopiaGame } from './game/TopiaGame.js';
export { Entity, schema } from './game/Entity.js';
export { InputHandler } from './game/InputHandler.js';
export type { InputPackage } from './game/InputHandler.js';

// Topia integration
export { TopiaCredentials } from './topia/TopiaCredentials.js';
export type { TopiaPlayerCredentials } from './topia/TopiaCredentials.js';
export { RoomNaming } from './topia/RoomNaming.js';
export { DeferQueue } from './topia/DeferQueue.js';

// Types
export type * from './game/types.js';
```

**Step 2: Create client exports**

```typescript
// src/client.ts
export { Interpolator } from './client/Interpolator.js';
export type { InterpolatorOptions } from './client/Interpolator.js';
export { Predictor } from './client/Predictor.js';
export type { PredictorOptions } from './client/Predictor.js';
export { InputHandler } from './game/InputHandler.js';
export type { InputPackage } from './game/InputHandler.js';
```

**Step 3: Create Wiggle entities**

```typescript
// examples/wiggle/server/entities/SnakeEntity.ts
import { Entity, schema } from '@topia/multiplayer';

const SPEED = 5;

export class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('int8') bodyLength = 3;
  @schema('boolean') isAlive = true;

  // Server-only state (not synced)
  bodyParts: Array<{ x: number; y: number }> = [];

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }

  move(delta: number): void {
    if (!this.isAlive) return;

    this.bodyParts.unshift({ x: this.x, y: this.y });
    this.x += Math.cos(this.angle) * SPEED * delta * 60;
    this.y += Math.sin(this.angle) * SPEED * delta * 60;

    while (this.bodyParts.length > this.bodyLength) {
      this.bodyParts.pop();
    }
  }

  grow(amount = 1): void {
    this.bodyLength += amount;
    this.score += amount;
  }
}
```

```typescript
// examples/wiggle/server/entities/FoodEntity.ts
import { Entity, schema } from '@topia/multiplayer';

export class FoodEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('uint8') value = 1;

  respawn(width: number, height: number): void {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }
}
```

**Step 4: Create Wiggle game definition**

```typescript
// examples/wiggle/server/wiggle-game.ts
import { TopiaGame } from '@topia/multiplayer';
import { SnakeEntity } from './entities/SnakeEntity.js';
import { FoodEntity } from './entities/FoodEntity.js';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const FOOD_COUNT = 20;
const EAT_RADIUS = 15;
const COLLISION_RADIUS = 10;

export const WiggleGame = TopiaGame.define({
  name: 'wiggle',
  tickRate: 20,
  maxPlayers: 12,
  debug: ['scoring', 'collision'],

  onCreate(room) {
    for (let i = 0; i < FOOD_COUNT; i++) {
      room.spawnEntity(FoodEntity, {
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
      });
    }
  },

  onTick(room, delta) {
    const snakes = room.entities.ofType(SnakeEntity);
    const foods = room.entities.ofType(FoodEntity);

    for (const snake of snakes) {
      if (!snake.isAlive) continue;

      snake.move(delta);

      // Food eating
      for (const food of foods) {
        const dx = snake.x - food.x;
        const dy = snake.y - food.y;
        if (Math.sqrt(dx * dx + dy * dy) < EAT_RADIUS) {
          snake.grow(food.value);
          food.respawn(ARENA_WIDTH, ARENA_HEIGHT);
          room.log('scoring', `${snake.name} ate food, score: ${snake.score}`);
        }
      }

      // Snake-to-snake collision
      for (const other of snakes) {
        if (other.id === snake.id || !other.isAlive) continue;
        for (const part of other.bodyParts) {
          const dx = snake.x - part.x;
          const dy = snake.y - part.y;
          if (Math.sqrt(dx * dx + dy * dy) < COLLISION_RADIUS) {
            snake.isAlive = false;
            other.grow(3);
            room.log('collision', `${snake.name} hit ${other.name}`);
            break;
          }
        }
      }
    }
  },

  onPlayerJoin(room, player) {
    const snake = room.spawnEntity(SnakeEntity, {
      x: Math.random() * ARENA_WIDTH,
      y: Math.random() * ARENA_HEIGHT,
      angle: Math.random() * Math.PI * 2,
      name: player.topia.displayName,
    });
    player.entity = snake;
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});
```

**Step 5: Run all tests to make sure nothing broke**

Run: `cd packages/multiplayer && npx jest -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/multiplayer/src/index.ts packages/multiplayer/src/client.ts packages/multiplayer/examples/
git commit -m "feat(multiplayer): add package exports and Wiggle game example"
```

---

