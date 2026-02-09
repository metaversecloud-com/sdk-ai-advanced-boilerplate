import { Entity, schema } from '../../../../src/index.js';

export class GemEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('uint8') value = 1;

  respawn(gridSize: number): void {
    this.gridX = Math.floor(Math.random() * gridSize);
    this.gridY = Math.floor(Math.random() * gridSize);
  }
}
