import { BotBehavior } from '../../../../src/index.js';

export const WanderBot = BotBehavior.define({
  think(bot, room, delta) {
    // Slightly adjust angle each tick for organic movement
    const currentAngle = (bot.entity as any).angle ?? 0;
    const nudge = (Math.random() - 0.5) * 0.3;
    bot.sendInput({ angle: currentAngle + nudge });
  },
});
