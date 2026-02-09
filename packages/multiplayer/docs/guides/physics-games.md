# Guide: Physics-Based Games

Games with momentum, collisions, and forces. Examples: Bumper Balls, air hockey, pinball.

## Key Settings

```typescript
TopiaGame.define({
  tickRate: 20,   // Physics needs a tick loop
  // ...
});
```

## Entity Pattern

Include velocity fields (`vx`, `vy`) in your entity so the client can extrapolate:

```typescript
class BallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') vx = 0;
  @schema('float32') vy = 0;
  @schema('float32') radius = 20;
  @schema('int16') score = 0;

  onInput(input: { thrustX: number; thrustY: number }): void {
    this.vx += input.thrustX * 0.5;
    this.vy += input.thrustY * 0.5;
    // Clamp speed
    const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }
  }

  move(delta: number): void {
    this.x += this.vx * delta * 60;
    this.y += this.vy * delta * 60;
    this.vx *= 0.98;  // Friction
    this.vy *= 0.98;
  }
}
```

## Using PhysicsWorld (Matter.js)

For complex collision shapes and realistic physics, use `PhysicsWorld`:

```typescript
import { PhysicsWorld } from '@topia/multiplayer';
import Matter from 'matter-js';

let physics: PhysicsWorld;

onCreate(room) {
  physics = PhysicsWorld.create({
    matter: Matter,
    gravity: { x: 0, y: 0 },  // Top-down: no gravity
  });

  // Add walls
  const topWall = room.spawnEntity(WallEntity, { x: 400, y: 0 });
  physics.addRectangle(topWall, 800, 20, { isStatic: true, restitution: 0.8 });
}

onPlayerJoin(room, player) {
  const ball = room.spawnEntity(BallEntity, { ... });
  physics.addCircle(ball, 20, { restitution: 0.9, frictionAir: 0.02 });
  player.entity = ball;
}

onTick(room, delta) {
  // Apply forces from player inputs, then step physics
  physics.step(delta);  // Automatically syncs x, y, angle to entities
}
```

## Manual Collision (Without Matter.js)

For simple circle-to-circle physics, handle it manually:

```typescript
// Elastic collision between two circles
const dist = distance(a, b);
const minDist = a.radius + b.radius;

if (dist < minDist && dist > 0) {
  const nx = (b.x - a.x) / dist;
  const ny = (b.y - a.y) / dist;
  const relNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

  if (relNormal > 0) {
    a.vx -= relNormal * nx;
    a.vy -= relNormal * ny;
    b.vx += relNormal * nx;
    b.vy += relNormal * ny;

    // Separate overlapping bodies
    const overlap = (minDist - dist) / 2;
    a.x -= overlap * nx;
    a.y -= overlap * ny;
    b.x += overlap * nx;
    b.y += overlap * ny;
  }
}
```

## Client Interpolation

Use `physics` mode for velocity-based extrapolation:

```typescript
const interp = new Interpolator({
  bufferMs: 80,
  mode: 'physics',
  physicsFields: [
    { position: 'x', velocity: 'vx' },
    { position: 'y', velocity: 'vy' },
  ],
});
```

This extrapolates past the last snapshot using velocity, reducing perceived latency in physics games.

## Full Example

See `examples/bumper-balls/` for a complete physics game implementation.
