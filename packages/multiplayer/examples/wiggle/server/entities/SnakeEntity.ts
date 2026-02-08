import { Entity, schema } from '../../../../src/index.js';

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
