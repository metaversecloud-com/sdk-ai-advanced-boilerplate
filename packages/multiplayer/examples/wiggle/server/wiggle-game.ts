import { TopiaGame } from '../../../src/index.js';
import { SnakeEntity } from './entities/SnakeEntity.js';
import { FoodEntity } from './entities/FoodEntity.js';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const FOOD_COUNT = 20;
const EAT_RADIUS = 15;
const COLLISION_RADIUS = 10;

export const WiggleGame = TopiaGame.define({
  name: 'wiggle',
  tickRate: 20,
  maxPlayers: 12,
  debug: ['scoring', 'collision'],

  onCreate(room) {
    for (let i = 0; i < FOOD_COUNT; i++) {
      room.spawnEntity(FoodEntity, {
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
      });
    }
  },

  onTick(room, delta) {
    const snakes = room.entities.ofType(SnakeEntity);
    const foods = room.entities.ofType(FoodEntity);

    for (const snake of snakes) {
      if (!snake.isAlive) continue;

      snake.move(delta);

      // Food eating
      for (const food of foods) {
        const dx = snake.x - food.x;
        const dy = snake.y - food.y;
        if (Math.sqrt(dx * dx + dy * dy) < EAT_RADIUS) {
          snake.grow(food.value);
          food.respawn(ARENA_WIDTH, ARENA_HEIGHT);
          room.log('scoring', `${snake.name} ate food, score: ${snake.score}`);
        }
      }

      // Snake-to-snake collision
      for (const other of snakes) {
        if (other.id === snake.id || !other.isAlive) continue;
        for (const part of other.bodyParts) {
          const dx = snake.x - part.x;
          const dy = snake.y - part.y;
          if (Math.sqrt(dx * dx + dy * dy) < COLLISION_RADIUS) {
            snake.isAlive = false;
            other.grow(3);
            room.log('collision', `${snake.name} hit ${other.name}`);
            break;
          }
        }
      }
    }
  },

  onPlayerJoin(room, player) {
    const snake = room.spawnEntity(SnakeEntity, {
      x: Math.random() * ARENA_WIDTH,
      y: Math.random() * ARENA_HEIGHT,
      angle: Math.random() * Math.PI * 2,
      name: player.topia.displayName,
    });
    player.entity = snake;
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});
