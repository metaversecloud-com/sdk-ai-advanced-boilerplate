import { BotBehavior } from '../../../../src/index.js';

/** Drifts around the arena with gentle random thrusts. */
export const DrifterBot = BotBehavior.define({
  think(bot) {
    bot.sendInput({
      thrustX: (Math.random() - 0.5) * 1.5,
      thrustY: (Math.random() - 0.5) * 1.5,
    });
  },
});
