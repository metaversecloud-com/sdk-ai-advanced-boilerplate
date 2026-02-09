import { Entity, schema } from '../../../../src/index.js';

const GRID_SIZE = 10;

export class PlayerEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  onInput(input: { action: string; direction?: string }): void {
    if (!this.isAlive) return;
    if (input.action !== 'move' || !input.direction) return;

    let nextX = this.gridX;
    let nextY = this.gridY;

    switch (input.direction) {
      case 'north': nextY -= 1; break;
      case 'south': nextY += 1; break;
      case 'east':  nextX += 1; break;
      case 'west':  nextX -= 1; break;
      default: return;
    }

    // Clamp to grid bounds
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) return;

    this.gridX = nextX;
    this.gridY = nextY;
  }
}
