import { BotBehavior } from '../../../../src/index.js';
import { BallEntity } from '../entities/BallEntity.js';

function angleTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function distanceTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Chases the nearest non-bot ball and rams into it. */
export const AggressorBot = BotBehavior.define({
  think(bot, room) {
    const target = room.entities.nearest(bot.entity, BallEntity, {
      exclude: (e: BallEntity) => e.isBot || e.id === bot.entity.id || !e.isAlive,
    });

    if (target && distanceTo(bot.entity, target) < 300) {
      const angle = angleTo(bot.entity, target);
      bot.sendInput({
        thrustX: Math.cos(angle) * 2,
        thrustY: Math.sin(angle) * 2,
      });
    } else {
      // Wander randomly
      bot.sendInput({
        thrustX: (Math.random() - 0.5) * 1,
        thrustY: (Math.random() - 0.5) * 1,
      });
    }
  },
});
