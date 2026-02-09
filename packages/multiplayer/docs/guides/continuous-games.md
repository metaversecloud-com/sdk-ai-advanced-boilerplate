# Guide: Continuous Movement Games

Real-time games where entities move smoothly every tick. Examples: snake (Wiggle), racing, top-down shooters.

## Key Settings

```typescript
TopiaGame.define({
  tickRate: 20,   // 20 Hz server loop
  // ...
});
```

## Entity Pattern

Use `float32` for positions and angles. Implement a `move(delta)` method:

```typescript
class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
  @schema('boolean') isAlive = true;

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }

  move(delta: number): void {
    if (!this.isAlive) return;
    this.x += Math.cos(this.angle) * SPEED * delta * 60;
    this.y += Math.sin(this.angle) * SPEED * delta * 60;
  }
}
```

## Game Loop

The `onTick` hook runs every server tick. Process all entity movement, then check collisions:

```typescript
onTick(room, delta) {
  const snakes = room.entities.ofType(SnakeEntity);
  const foods = room.entities.ofType(FoodEntity);

  for (const snake of snakes) {
    if (!snake.isAlive) continue;
    snake.move(delta);

    // Check collisions
    for (const food of foods) {
      if (distance(snake, food) < EAT_RADIUS) {
        snake.grow(food.value);
        food.respawn(ARENA_WIDTH, ARENA_HEIGHT);
      }
    }
  }
}
```

## Client Interpolation

Use `hermite` mode for smooth curved movement:

```typescript
const interp = new Interpolator({
  bufferMs: 100,
  mode: 'hermite',
  angleFields: ['angle'],
});
```

## Bot Behaviors

Continuous bots think at a fixed rate and send angle/direction inputs:

```typescript
const WanderBot = BotBehavior.define({
  think(bot, room, delta) {
    const nudge = (Math.random() - 0.5) * 0.3;
    bot.sendInput({ angle: bot.entity.angle + nudge });
  },
});
```

## Full Example

See `examples/wiggle/` for a complete snake game implementation.
