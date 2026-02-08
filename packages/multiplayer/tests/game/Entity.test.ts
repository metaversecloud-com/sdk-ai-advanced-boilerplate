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
