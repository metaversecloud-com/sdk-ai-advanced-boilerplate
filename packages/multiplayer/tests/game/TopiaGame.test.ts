import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

describe('TopiaGame.define()', () => {
  it('creates a game definition with defaults', () => {
    const game = TopiaGame.define({
      name: 'test-game',
    });

    expect(game.name).toBe('test-game');
    expect(game.tickRate).toBe(20);
    expect(game.maxPlayers).toBe(10);
  });

  it('accepts custom tick rate and max players', () => {
    const game = TopiaGame.define({
      name: 'custom-game',
      tickRate: 30,
      maxPlayers: 4,
    });

    expect(game.tickRate).toBe(30);
    expect(game.maxPlayers).toBe(4);
  });

  it('accepts event-driven mode (tickRate 0)', () => {
    const game = TopiaGame.define({
      name: 'grid-game',
      tickRate: 0,
    });

    expect(game.tickRate).toBe(0);
  });

  it('stores lifecycle hooks', () => {
    const onCreate = jest.fn();
    const onTick = jest.fn();
    const onPlayerJoin = jest.fn();
    const onPlayerLeave = jest.fn();

    const game = TopiaGame.define({
      name: 'hook-game',
      onCreate,
      onTick,
      onPlayerJoin,
      onPlayerLeave,
    });

    expect(game.hooks.onCreate).toBe(onCreate);
    expect(game.hooks.onTick).toBe(onTick);
    expect(game.hooks.onPlayerJoin).toBe(onPlayerJoin);
    expect(game.hooks.onPlayerLeave).toBe(onPlayerLeave);
  });

  it('stores debug channels', () => {
    const game = TopiaGame.define({
      name: 'debug-game',
      debug: ['physics', 'input', 'scoring'],
    });

    expect(game.debug).toEqual(['physics', 'input', 'scoring']);
  });
});
