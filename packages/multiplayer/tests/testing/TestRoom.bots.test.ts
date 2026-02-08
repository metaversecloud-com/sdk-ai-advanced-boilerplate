import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { BotBehavior } from '../../src/game/BotBehavior.js';
import { Entity, schema } from '../../src/game/Entity.js';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('string') name = '';

  onInput(input: { angle: number }) {
    this.angle = input.angle;
  }
}

const ChaseBehavior = BotBehavior.define({
  think(bot, room, delta) {
    bot.sendInput({ angle: 1.5 }); // Fixed angle for testing
  },
});

const BotGame = TopiaGame.define({
  name: 'bot-test',
  tickRate: 20,
  maxPlayers: 6,
  bots: {
    fillTo: 4,
    behaviors: [ChaseBehavior],
    despawnOnJoin: true,
    names: ['Slinky', 'Noodle', 'Zigzag', 'Squiggle'],
  },
  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(SnakeEntity, { name: player.topia.displayName });
  },
  onTick(room, delta) {
    for (const snake of room.entities.ofType(SnakeEntity)) {
      snake.x += Math.cos(snake.angle) * 5 * delta * 60;
    }
  },
});

describe('TestRoom with Bots', () => {
  it('auto-fills bots on create', () => {
    const room = TestRoom.create(BotGame);
    // 0 humans, fillTo 4 → 4 bots
    expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);
  });

  it('despawns a bot when human joins', () => {
    const room = TestRoom.create(BotGame);
    room.addPlayer({ displayName: 'Alice' });

    // 1 human + 3 bots = 4
    expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);
    // But only 3 should be bots
    const bots = room.entities.ofType(SnakeEntity).filter(s => s.isBot);
    expect(bots).toHaveLength(3);
  });

  it('bots produce input on tick', () => {
    const room = TestRoom.create(BotGame);
    room.tick();

    // Bots should have updated angle via their behavior
    const bots = room.entities.ofType(SnakeEntity).filter(s => s.isBot);
    for (const bot of bots) {
      expect(bot.angle).toBe(1.5);
    }
  });
});
