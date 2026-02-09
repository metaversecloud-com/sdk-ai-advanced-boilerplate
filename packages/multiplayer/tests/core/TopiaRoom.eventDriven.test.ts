import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';

// --- Grid game entities ---
class GridPlayerEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';

  onInput(input: { action: string; direction?: string }): void {
    if (input.action === 'move' && input.direction) {
      switch (input.direction) {
        case 'north': this.gridY -= 1; break;
        case 'south': this.gridY += 1; break;
        case 'east':  this.gridX += 1; break;
        case 'west':  this.gridX -= 1; break;
      }
    }
  }
}

class GemEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('uint8') value = 1;
  collected = false;
}

// --- Grid game definition ---
const GridGame = TopiaGame.define({
  name: 'grid-test',
  tickRate: 0,  // Event-driven!
  maxPlayers: 4,

  onCreate(room) {
    // Place some gems
    room.spawnEntity(GemEntity, { gridX: 3, gridY: 0, value: 5 });
    room.spawnEntity(GemEntity, { gridX: 0, gridY: 2, value: 3 });
  },

  onInput(room, player, input) {
    // After entity.onInput moves the player, check for gem collection
    const playerEntity = player.entity as GridPlayerEntity;
    for (const gem of room.entities.ofType(GemEntity)) {
      if (!gem.collected && gem.gridX === playerEntity.gridX && gem.gridY === playerEntity.gridY) {
        playerEntity.score += gem.value;
        gem.collected = true;
        room.despawnEntity(gem);
        room.log('scoring', `${playerEntity.name} collected gem worth ${gem.value}`);
      }
    }
  },

  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(GridPlayerEntity, {
      gridX: 0,
      gridY: 0,
      name: player.topia.displayName,
    });
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});

describe('Event-driven room (tickRate 0)', () => {
  it('stores tickRate as 0', () => {
    expect(GridGame.tickRate).toBe(0);
  });

  it('tick() is a no-op without explicit delta', () => {
    const tickFn = jest.fn();
    const game = TopiaGame.define({
      name: 'noop-test',
      tickRate: 0,
      onTick: tickFn,
    });
    const room = TestRoom.create(game);
    room.tick(); // No delta → should be no-op

    expect(tickFn).not.toHaveBeenCalled();
    expect(room.tickCount).toBe(0);
  });

  it('tick() runs when explicit delta is provided', () => {
    const tickFn = jest.fn();
    const game = TopiaGame.define({
      name: 'explicit-test',
      tickRate: 0,
      onTick: tickFn,
    });
    const room = TestRoom.create(game);
    room.tick(0.05); // Explicit delta → should run

    expect(tickFn).toHaveBeenCalledWith(room, 0.05);
    expect(room.tickCount).toBe(1);
  });

  it('processes input immediately via sendInput', () => {
    const room = TestRoom.create(GridGame);
    const player = room.addPlayer({ displayName: 'Alice' });

    expect(player.entity.gridX).toBe(0);
    expect(player.entity.gridY).toBe(0);

    room.sendInput(player.id, { action: 'move', direction: 'east' });
    expect(player.entity.gridX).toBe(1);

    room.sendInput(player.id, { action: 'move', direction: 'south' });
    expect(player.entity.gridY).toBe(1);
  });

  it('triggers onInput hook after entity.onInput', () => {
    const room = TestRoom.create(GridGame);
    const player = room.addPlayer({ displayName: 'Bob' });

    // Move to gem at (3, 0)
    room.sendInput(player.id, { action: 'move', direction: 'east' }); // (1, 0)
    room.sendInput(player.id, { action: 'move', direction: 'east' }); // (2, 0)
    room.sendInput(player.id, { action: 'move', direction: 'east' }); // (3, 0) → collect gem

    expect(player.entity.score).toBe(5);
    expect(room.entities.ofType(GemEntity)).toHaveLength(1); // One gem collected, one remains
  });

  it('multiple players can send input in event-driven mode', () => {
    const room = TestRoom.create(GridGame);
    const alice = room.addPlayer({ displayName: 'Alice' });
    const bob = room.addPlayer({ displayName: 'Bob' });

    room.sendInput(alice.id, { action: 'move', direction: 'east' });
    room.sendInput(bob.id, { action: 'move', direction: 'south' });

    expect(alice.entity.gridX).toBe(1);
    expect(alice.entity.gridY).toBe(0);
    expect(bob.entity.gridX).toBe(0);
    expect(bob.entity.gridY).toBe(1);
  });

  it('sendInput is a no-op for unknown player', () => {
    const room = TestRoom.create(GridGame);
    // Should not throw
    room.sendInput('nonexistent', { action: 'move', direction: 'east' });
  });

  it('does not run onTick during input processing', () => {
    const tickFn = jest.fn();
    const game = TopiaGame.define({
      name: 'no-auto-tick',
      tickRate: 0,
      onTick: tickFn,
      onPlayerJoin(room, player) {
        player.entity = room.spawnEntity(GridPlayerEntity, { name: 'X' });
      },
    });
    const room = TestRoom.create(game);
    const player = room.addPlayer({ displayName: 'X' });

    room.sendInput(player.id, { action: 'move', direction: 'east' });
    room.sendInput(player.id, { action: 'move', direction: 'east' });

    expect(tickFn).not.toHaveBeenCalled();
  });
});
