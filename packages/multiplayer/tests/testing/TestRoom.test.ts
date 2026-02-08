import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';

class BallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
}

class CoinEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

const SimpleGame = TopiaGame.define({
  name: 'simple-test',
  tickRate: 20,
  maxPlayers: 4,

  onCreate(room) {
    room.spawnEntity(CoinEntity, { x: 50, y: 50 });
  },

  onTick(room, delta) {
    for (const ball of room.entities.ofType(BallEntity)) {
      for (const coin of room.entities.ofType(CoinEntity)) {
        const dx = ball.x - coin.x;
        const dy = ball.y - coin.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          ball.score += 1;
          coin.x = Math.random() * 500;
          coin.y = Math.random() * 500;
        }
      }
    }
  },

  onPlayerJoin(room, player) {
    room.spawnEntity(BallEntity, { x: 0, y: 0 });
  },
});

describe('TestRoom', () => {
  it('creates a room and runs onCreate', () => {
    const room = TestRoom.create(SimpleGame);

    expect(room.entities.count).toBe(1); // 1 coin from onCreate
    expect(room.entities.ofType(CoinEntity)).toHaveLength(1);
  });

  it('adds players and triggers onPlayerJoin', () => {
    const room = TestRoom.create(SimpleGame);
    const player = room.addPlayer({ displayName: 'Alice' });

    expect(player.topia.displayName).toBe('Alice');
    expect(room.entities.ofType(BallEntity)).toHaveLength(1);
  });

  it('runs tick manually', () => {
    const room = TestRoom.create(SimpleGame);
    const player = room.addPlayer();

    // Position player entity on top of coin
    const ball = room.entities.ofType(BallEntity)[0];
    const coin = room.entities.ofType(CoinEntity)[0];
    ball.x = coin.x;
    ball.y = coin.y;

    room.tick();

    expect(ball.score).toBe(1);
  });

  it('tracks deferred SDK calls', () => {
    const GameWithDefer = TopiaGame.define({
      name: 'defer-test',
      onPlayerJoin(room, player) {
        room.spawnEntity(BallEntity, { x: 0, y: 0 });
        room.topia.deferTracked('grantBadge', ['first-join']);
      },
    });

    const room = TestRoom.create(GameWithDefer);
    room.addPlayer();

    expect(room.topia.tracked).toContainEqual({
      method: 'grantBadge',
      args: ['first-join'],
    });
  });

  it('tracks tick count', () => {
    const room = TestRoom.create(SimpleGame);

    expect(room.tickCount).toBe(0);
    room.tick();
    room.tick();
    room.tick();
    expect(room.tickCount).toBe(3);
  });

  it('removes players and triggers onPlayerLeave', () => {
    const leaveFn = jest.fn();
    const GameWithLeave = TopiaGame.define({
      name: 'leave-test',
      onPlayerJoin(room, player) {
        room.spawnEntity(BallEntity, { x: 0, y: 0 });
      },
      onPlayerLeave: leaveFn,
    });

    const room = TestRoom.create(GameWithLeave);
    const player = room.addPlayer();
    room.removePlayer(player.id);

    expect(leaveFn).toHaveBeenCalledTimes(1);
  });
});
