import { BotBehavior } from '../../../../src/index.js';

function angleTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function distanceTo(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export const AggressiveBot = BotBehavior.define({
  think(bot, room, delta) {
    // Find nearest non-bot snake
    const target = room.entities.nearest(bot.entity, bot.entity.constructor, {
      exclude: (e: any) => e.isBot || e.id === bot.entity.id,
    });

    if (target && distanceTo(bot.entity, target) < 200) {
      bot.sendInput({ angle: angleTo(bot.entity, target) });
    } else {
      // Wander toward nearest food
      const allEntities = room.entities.all();
      const foods = allEntities.filter((e: any) => e.constructor.name === 'FoodEntity');
      if (foods.length > 0) {
        const nearest = foods.reduce((closest: any, food: any) => {
          return distanceTo(bot.entity, food) < distanceTo(bot.entity, closest) ? food : closest;
        });
        bot.sendInput({ angle: angleTo(bot.entity, nearest) });
      } else {
        bot.sendInput({ angle: Math.random() * Math.PI * 2 });
      }
    }
  },
});
