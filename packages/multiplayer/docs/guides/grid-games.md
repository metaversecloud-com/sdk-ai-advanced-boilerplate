# Guide: Grid-Based Games

Turn-based or event-driven games where entities move on a discrete grid. Examples: puzzle games, board games, Grid Arena.

## Key Settings

```typescript
TopiaGame.define({
  tickRate: 0,    // Event-driven: no server loop
  // ...
});
```

## Entity Pattern

Use `int16` for grid coordinates. Handle movement in `onInput`:

```typescript
class PlayerEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('int16') score = 0;
  @schema('boolean') isAlive = true;

  onInput(input: { action: string; direction: string }): void {
    if (!this.isAlive || input.action !== 'move') return;

    switch (input.direction) {
      case 'north': this.gridY = Math.max(0, this.gridY - 1); break;
      case 'south': this.gridY = Math.min(GRID_H - 1, this.gridY + 1); break;
      case 'east':  this.gridX = Math.min(GRID_W - 1, this.gridX + 1); break;
      case 'west':  this.gridX = Math.max(0, this.gridX - 1); break;
    }
  }
}
```

## Event-Driven Input

With `tickRate: 0`, there is no `onTick` loop. Use `onInput` for game logic:

```typescript
onInput(room, player, input) {
  if (input.action !== 'move') return;

  // Check gem collection (exact coordinate match)
  for (const gem of room.entities.ofType(GemEntity)) {
    if (player.entity.gridX === gem.gridX && player.entity.gridY === gem.gridY) {
      player.entity.score += gem.value;
      gem.respawn(GRID_W, GRID_H);
    }
  }

  // Check traps
  if (TRAPS.some(t => t.x === player.entity.gridX && t.y === player.entity.gridY)) {
    player.entity.isAlive = false;
  }
}
```

## Client Interpolation

Grid games typically don't need interpolation — positions snap to grid cells. Use `linear` mode with no buffer:

```typescript
const interp = new Interpolator({ bufferMs: 0, mode: 'linear' });
```

## Bot Behaviors

Grid bots use `onMyTurn` for turn-based games or `think` for continuous thinking:

```typescript
const RandomWalkBot = BotBehavior.define({
  think(bot, room) {
    const dirs = ['north', 'south', 'east', 'west'];
    bot.sendInput({
      action: 'move',
      direction: dirs[Math.floor(Math.random() * 4)],
    });
  },
});
```

## Full Example

See `examples/grid-arena/` for a complete grid-based game implementation.
