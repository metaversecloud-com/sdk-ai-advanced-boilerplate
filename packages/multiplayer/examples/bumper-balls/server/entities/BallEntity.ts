import { Entity, schema } from '../../../../src/index.js';

const MAX_SPEED = 8;

export class BallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') vx = 0;
  @schema('float32') vy = 0;
  @schema('float32') radius = 20;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  onInput(input: { thrustX: number; thrustY: number }): void {
    if (!this.isAlive) return;

    this.vx += (input.thrustX ?? 0) * 0.5;
    this.vy += (input.thrustY ?? 0) * 0.5;

    // Clamp speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }
  }

  move(delta: number): void {
    if (!this.isAlive) return;

    this.x += this.vx * delta * 60;
    this.y += this.vy * delta * 60;

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }
}
