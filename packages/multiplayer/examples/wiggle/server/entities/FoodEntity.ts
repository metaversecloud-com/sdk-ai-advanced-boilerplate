import { Entity, schema } from '../../../../src/index.js';

export class FoodEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('uint8') value = 1;

  respawn(width: number, height: number): void {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }
}
