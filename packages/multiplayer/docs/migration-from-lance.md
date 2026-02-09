# Migration from Lance.gg

This guide helps you migrate from Lance.gg to @topia/multiplayer. While the concepts are similar (authoritative server, client prediction, entity sync), the API differs.

## Concept Mapping

| Lance.gg | @topia/multiplayer | Notes |
|----------|-------------------|-------|
| `ServerEngine` | `TopiaGame.define()` | Game definition factory |
| `GameEngine` | `GameRoomContext` | Room context in hooks |
| `DynamicObject` | `Entity` + `@schema` | Base synced object |
| `PhysicsEngine` | `PhysicsWorld` | Optional Matter.js wrapper |
| `ClientEngine` | `Interpolator` + `Predictor` | Client-side netcode |
| `TwoVector` | `@schema('float32') x/y` | No vector class; use primitives |
| `GameWorld` | `EntityCollection` | Query and iterate entities |
| `step()` | `onTick(room, delta)` | Server tick hook |
| `processInput()` | `onInput(room, player, input)` | Input processing hook |

## Step-by-Step Migration

### 1. Replace ServerEngine with TopiaGame.define

**Lance.gg:**
```javascript
class MyServerEngine extends ServerEngine {
  constructor(io, gameEngine, options) {
    super(io, gameEngine, options);
  }

  start() {
    super.start();
    this.gameEngine.addObjectToWorld(new Food(this.gameEngine, null, { position: new TwoVector(100, 100) }));
  }
}
```

**@topia/multiplayer:**
```typescript
export const MyGame = TopiaGame.define({
  name: 'my-game',
  tickRate: 60,
  maxPlayers: 8,

  onCreate(room) {
    room.spawnEntity(FoodEntity, { x: 100, y: 100 });
  },
});
```

### 2. Replace DynamicObject with Entity + @schema

**Lance.gg:**
```javascript
class Snake extends DynamicObject {
  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.score = 0;
  }

  static get netScheme() {
    return Object.assign({
      score: { type: BaseTypes.TYPES.INT16 },
    }, super.netScheme);
  }
}
```

**@topia/multiplayer:**
```typescript
class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
  @schema('boolean') isAlive = true;

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }
}
```

### 3. Replace step() with onTick()

**Lance.gg:**
```javascript
class MyGameEngine extends GameEngine {
  step(isReenact) {
    super.step(isReenact);
    this.world.forEachObject((id, obj) => {
      if (obj instanceof Snake) obj.move();
    });
  }
}
```

**@topia/multiplayer:**
```typescript
onTick(room, delta) {
  for (const snake of room.entities.ofType(SnakeEntity)) {
    snake.move(delta);
  }
}
```

### 4. Replace processInput with onInput

**Lance.gg:**
```javascript
processInput(inputData, playerId) {
  super.processInput(inputData, playerId);
  const player = this.world.queryObject({ playerId });
  if (inputData.input === 'left') player.angle -= 0.1;
}
```

**@topia/multiplayer:**
```typescript
// Option A: Entity handles its own input
class SnakeEntity extends Entity {
  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }
}

// Option B: Game-level input hook (event-driven games)
onInput(room, player, input) {
  // Handle input at the game level
}
```

### 5. Replace ClientEngine with Interpolator + Predictor

**Lance.gg:**
```javascript
class MyClientEngine extends ClientEngine {
  constructor(gameEngine, options) {
    super(gameEngine, options, MyRenderer);
  }
}
```

**@topia/multiplayer:**
```typescript
import { Interpolator, Predictor, InputHandler } from '@topia/multiplayer/client';

const interpolator = new Interpolator({ bufferMs: 100, mode: 'hermite' });
const predictor = new Predictor({
  applyInput: (state, input) => ({ ...state, x: state.x + input.dx }),
});
const inputHandler = new InputHandler();
```

### 6. Testing

Lance.gg required spinning up a full server. @topia/multiplayer provides `TestRoom` for instant in-memory testing:

```typescript
import { TestRoom } from '@topia/multiplayer/testing';

const room = TestRoom.create(MyGame);
const player = room.addPlayer({ displayName: 'Alice' });
room.tick();
expect(player.entity.x).toBeGreaterThan(0);
```

## Key Differences

| Feature | Lance.gg | @topia/multiplayer |
|---------|----------|-------------------|
| Language | JavaScript | TypeScript |
| Entity sync | `netScheme` static getter | `@schema` decorators |
| Physics | Built-in (simple) | Optional PhysicsWorld (Matter.js) |
| Testing | Full server required | In-memory TestRoom |
| Bots | Manual | Built-in BotManager |
| Spectators | Manual | Built-in SpectatorManager |
| Scaling | Single process | Redis-based multi-process |
| Platform | Generic | Topia SDK integration |
| Event-driven | Not supported | `tickRate: 0` mode |
