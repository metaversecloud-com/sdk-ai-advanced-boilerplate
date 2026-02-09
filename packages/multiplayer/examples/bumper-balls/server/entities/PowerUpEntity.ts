import { Entity, schema } from '../../../../src/index.js';

export type PowerUpType = 'speed' | 'shield' | 'grow';

export class PowerUpEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('string') powerType: PowerUpType = 'speed';

  respawn(arenaWidth: number, arenaHeight: number, margin = 40): void {
    this.x = margin + Math.random() * (arenaWidth - margin * 2);
    this.y = margin + Math.random() * (arenaHeight - margin * 2);
    const types: PowerUpType[] = ['speed', 'shield', 'grow'];
    this.powerType = types[Math.floor(Math.random() * types.length)];
  }
}
