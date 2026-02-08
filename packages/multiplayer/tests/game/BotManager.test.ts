import { BotManager } from '../../src/game/BotManager.js';
import { BotBehavior } from '../../src/game/BotBehavior.js';
import { Entity, schema } from '../../src/game/Entity.js';
import { EntityCollection } from '../../src/core/TopiaRoom.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

const WanderBehavior = BotBehavior.define({
  think(bot, room, delta) {
    bot.sendInput({ angle: Math.random() * Math.PI * 2 });
  },
});

describe('BotManager', () => {
  let entities: EntityCollection;
  let inputLog: Array<{ botId: string; input: any }>;

  beforeEach(() => {
    entities = new EntityCollection();
    inputLog = [];
  });

  const createInputHandler = (botId: string) => (input: Record<string, any>) => {
    inputLog.push({ botId, input });
  };

  it('spawns bots up to fillTo count', () => {
    const manager = new BotManager({
      fillTo: 4,
      behaviors: [WanderBehavior],
      despawnOnJoin: true,
      names: ['Bot1', 'Bot2', 'Bot3', 'Bot4'],
    });

    const humanCount = 1;
    const spawned = manager.fillBots(humanCount, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    expect(spawned).toBe(3); // 4 - 1 human = 3 bots
    expect(manager.botCount).toBe(3);
  });

  it('despawns a bot when a human joins', () => {
    const manager = new BotManager({
      fillTo: 4,
      behaviors: [WanderBehavior],
      despawnOnJoin: true,
    });

    manager.fillBots(0, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    expect(manager.botCount).toBe(4);

    const removed = manager.despawnOne();
    expect(removed).toBeTruthy();
    expect(manager.botCount).toBe(3);
  });

  it('runs think for all bots', () => {
    const manager = new BotManager({
      fillTo: 2,
      behaviors: [WanderBehavior],
    });

    manager.fillBots(0, (name) => {
      const entity = new TestEntity();
      entities.add(entity);
      return { entity, sendInput: createInputHandler(entity.id) };
    });

    manager.tick({} as any, 0.05);

    expect(inputLog).toHaveLength(2); // Both bots produced input
  });
});
