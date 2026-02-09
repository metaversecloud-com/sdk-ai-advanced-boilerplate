import { TopiaGame } from '../../../src/index.js';
import { BallEntity } from './entities/BallEntity.js';
import { PowerUpEntity } from './entities/PowerUpEntity.js';
import { AggressorBot } from './bots/AggressorBot.js';
import { DrifterBot } from './bots/DrifterBot.js';

const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 600;
const POWERUP_COUNT = 3;
const PICKUP_RADIUS = 25;
const WALL_BOUNCE = 0.7;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export const BumperBallsGame = TopiaGame.define({
  name: 'bumper-balls',
  tickRate: 20,
  maxPlayers: 8,
  debug: ['collision', 'scoring'],
  bots: {
    fillTo: 4,
    behaviors: [AggressorBot, DrifterBot],
    despawnOnJoin: true,
    names: ['Bouncer', 'Ricochet', 'Pinball', 'Bumpy'],
  },

  onCreate(room) {
    for (let i = 0; i < POWERUP_COUNT; i++) {
      const powerUp = room.spawnEntity(PowerUpEntity);
      powerUp.respawn(ARENA_WIDTH, ARENA_HEIGHT);
    }
  },

  onTick(room, delta) {
    const balls = room.entities.ofType(BallEntity);
    const powerUps = room.entities.ofType(PowerUpEntity);

    for (const ball of balls) {
      if (!ball.isAlive) continue;

      ball.move(delta);

      // Wall bounce
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
        room.log('collision', `${ball.name} bounced off left wall`);
      }
      if (ball.x + ball.radius > ARENA_WIDTH) {
        ball.x = ARENA_WIDTH - ball.radius;
        ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
        room.log('collision', `${ball.name} bounced off right wall`);
      }
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * WALL_BOUNCE;
        room.log('collision', `${ball.name} bounced off top wall`);
      }
      if (ball.y + ball.radius > ARENA_HEIGHT) {
        ball.y = ARENA_HEIGHT - ball.radius;
        ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE;
        room.log('collision', `${ball.name} bounced off bottom wall`);
      }

      // Power-up pickup
      for (const powerUp of powerUps) {
        if (distance(ball, powerUp) < PICKUP_RADIUS + ball.radius) {
          ball.score += 1;
          room.log('scoring', `${ball.name} collected ${powerUp.powerType}, score: ${ball.score}`);
          powerUp.respawn(ARENA_WIDTH, ARENA_HEIGHT);
        }
      }
    }

    // Ball-to-ball collision (elastic-ish bounce)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (!a.isAlive || !b.isAlive) continue;

        const dist = distance(a, b);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
          // Normalized collision vector
          const nx = (b.x - a.x) / dist;
          const ny = (b.y - a.y) / dist;

          // Relative velocity along collision normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const relNormal = dvx * nx + dvy * ny;

          // Only resolve if balls are approaching
          if (relNormal > 0) {
            a.vx -= relNormal * nx;
            a.vy -= relNormal * ny;
            b.vx += relNormal * nx;
            b.vy += relNormal * ny;

            // Separate overlapping balls
            const overlap = (minDist - dist) / 2;
            a.x -= overlap * nx;
            a.y -= overlap * ny;
            b.x += overlap * nx;
            b.y += overlap * ny;

            room.log('collision', `${a.name} bumped ${b.name}`);
          }
        }
      }
    }
  },

  onPlayerJoin(room, player) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 150;
    const ball = room.spawnEntity(BallEntity, {
      x: ARENA_WIDTH / 2 + Math.cos(angle) * spawnDist,
      y: ARENA_HEIGHT / 2 + Math.sin(angle) * spawnDist,
      name: player.topia.displayName,
    });
    player.entity = ball;
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});
