import { BotBehavior } from '../../src/game/BotBehavior.js';

describe('BotBehavior', () => {
  it('defines a behavior with think function', () => {
    const behavior = BotBehavior.define({
      think(bot, room, delta) {
        bot.sendInput({ angle: Math.random() * Math.PI * 2 });
      },
    });

    expect(behavior.thinkRate).toBeUndefined();
    expect(typeof behavior.think).toBe('function');
  });

  it('supports event-driven mode (thinkRate 0)', () => {
    const behavior = BotBehavior.define({
      thinkRate: 0,
      onMyTurn(bot, room) {
        bot.sendInput({ action: 'move', direction: 'north' });
      },
    });

    expect(behavior.thinkRate).toBe(0);
    expect(typeof behavior.onMyTurn).toBe('function');
  });

  it('supports custom think rate', () => {
    const behavior = BotBehavior.define({
      thinkRate: 10,
      think(bot, room, delta) {
        bot.sendInput({ angle: 0 });
      },
    });

    expect(behavior.thinkRate).toBe(10);
  });
});
