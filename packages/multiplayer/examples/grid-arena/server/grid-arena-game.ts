import { TopiaGame } from '../../../src/index.js';
import { BotBehavior } from '../../../src/index.js';
import { PlayerEntity } from './entities/PlayerEntity.js';
import { GemEntity } from './entities/GemEntity.js';

const GRID_SIZE = 10;
const GEM_COUNT = 8;
const TRAP_POSITIONS = [
  { x: 4, y: 4 },
  { x: 5, y: 5 },
  { x: 2, y: 7 },
  { x: 7, y: 2 },
];

const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;

const RandomWalkBot = BotBehavior.define({
  think(bot) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    bot.sendInput({ action: 'move', direction });
  },
});

export const GridArenaGame = TopiaGame.define({
  name: 'grid-arena',
  tickRate: 0, // Event-driven: state updates only on input
  maxPlayers: 6,
  debug: ['scoring', 'trap'],
  bots: {
    fillTo: 4,
    behaviors: [RandomWalkBot],
    despawnOnJoin: true,
    names: ['Rover', 'Pixel', 'Bitsy', 'Glitch'],
  },

  onCreate(room) {
    room.state.gridSize = GRID_SIZE;
    room.state.traps = TRAP_POSITIONS;

    // Spawn gems at random grid positions
    for (let i = 0; i < GEM_COUNT; i++) {
      room.spawnEntity(GemEntity, {
        gridX: Math.floor(Math.random() * GRID_SIZE),
        gridY: Math.floor(Math.random() * GRID_SIZE),
        value: Math.random() < 0.3 ? 3 : 1, // 30% chance of high-value gem
      });
    }
  },

  onInput(room, player, input) {
    const entity = player.entity as PlayerEntity;
    if (!entity?.isAlive) return;

    // Check gem collection (coordinate matching, not distance)
    for (const gem of room.entities.ofType(GemEntity)) {
      if (gem.gridX === entity.gridX && gem.gridY === entity.gridY) {
        entity.score += gem.value;
        gem.respawn(GRID_SIZE);
        room.log('scoring', `${entity.name} collected gem worth ${gem.value}, total: ${entity.score}`);
      }
    }

    // Check trap collision
    for (const trap of TRAP_POSITIONS) {
      if (entity.gridX === trap.x && entity.gridY === trap.y) {
        entity.isAlive = false;
        room.log('trap', `${entity.name} hit a trap at (${trap.x}, ${trap.y})`);
      }
    }
  },

  onPlayerJoin(room, player) {
    // Spawn at a random edge position to avoid traps
    const edge = Math.floor(Math.random() * 4);
    let gridX = 0, gridY = 0;
    switch (edge) {
      case 0: gridX = 0; gridY = Math.floor(Math.random() * GRID_SIZE); break;
      case 1: gridX = GRID_SIZE - 1; gridY = Math.floor(Math.random() * GRID_SIZE); break;
      case 2: gridX = Math.floor(Math.random() * GRID_SIZE); gridY = 0; break;
      case 3: gridX = Math.floor(Math.random() * GRID_SIZE); gridY = GRID_SIZE - 1; break;
    }

    player.entity = room.spawnEntity(PlayerEntity, {
      gridX,
      gridY,
      name: player.topia.displayName,
    });
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});
