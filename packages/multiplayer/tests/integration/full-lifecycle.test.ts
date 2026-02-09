/**
 * Full lifecycle integration test.
 *
 * Validates the complete flow using TestRoom (no real networking):
 *   1. Create a game server with the Wiggle game definition
 *   2. Connect 3 simulated clients (players)
 *   3. Send input from each
 *   4. Verify state sync to all entities
 *   5. Disconnect one client
 *   6. Verify cleanup
 *
 * Also tests the Grid Arena event-driven game.
 */

import { TestRoom } from '../../src/testing/TestRoom.js';
import { TopiaGame } from '../../src/game/TopiaGame.js';
import { Entity, schema } from '../../src/game/Entity.js';
import { BotBehavior } from '../../src/game/BotBehavior.js';
import { Metrics } from '../../src/core/Metrics.js';
import { InspectorServer } from '../../src/dev/InspectorServer.js';
import type { Player } from '../../src/game/types.js';

// --- Wiggle-like game entities ---

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
  @schema('boolean') isAlive = true;

  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }

  move(delta: number): void {
    if (!this.isAlive) return;
    this.x += Math.cos(this.angle) * 5 * delta * 60;
    this.y += Math.sin(this.angle) * 5 * delta * 60;
  }
}

class FoodEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('uint8') value = 1;
}

const WanderBot = BotBehavior.define({
  think(bot) {
    bot.sendInput({ angle: Math.random() * Math.PI * 2 });
  },
});

const WiggleGame = TopiaGame.define({
  name: 'wiggle-integration',
  tickRate: 20,
  maxPlayers: 8,
  bots: {
    fillTo: 4,
    behaviors: [WanderBot],
    despawnOnJoin: true,
    names: ['Slinky', 'Noodle', 'Zigzag', 'Pretzel'],
  },

  onCreate(room) {
    for (let i = 0; i < 5; i++) {
      room.spawnEntity(FoodEntity, {
        x: Math.random() * 800,
        y: Math.random() * 600,
      });
    }
  },

  onTick(room, delta) {
    for (const snake of room.entities.ofType(SnakeEntity)) {
      snake.move(delta);
    }
  },

  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(SnakeEntity, {
      x: Math.random() * 800,
      y: Math.random() * 600,
      name: player.topia.displayName,
    });
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});

// --- Grid game entities ---

class GridPlayer extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';

  onInput(input: { action: string; direction?: string }): void {
    if (input.action !== 'move') return;
    switch (input.direction) {
      case 'north': this.gridY -= 1; break;
      case 'south': this.gridY += 1; break;
      case 'east':  this.gridX += 1; break;
      case 'west':  this.gridX -= 1; break;
    }
  }
}

class GemEntity extends Entity {
  @schema('int16') gridX = 0;
  @schema('int16') gridY = 0;
  @schema('uint8') value = 1;
}

const GridGame = TopiaGame.define({
  name: 'grid-integration',
  tickRate: 0,
  maxPlayers: 4,

  onCreate(room) {
    room.spawnEntity(GemEntity, { gridX: 2, gridY: 0, value: 10 });
  },

  onInput(room, player, input) {
    const entity = player.entity as GridPlayer;
    for (const gem of room.entities.ofType(GemEntity)) {
      if (gem.gridX === entity.gridX && gem.gridY === entity.gridY) {
        entity.score += gem.value;
        room.despawnEntity(gem);
      }
    }
  },

  onPlayerJoin(room, player) {
    player.entity = room.spawnEntity(GridPlayer, {
      gridX: 0,
      gridY: 0,
      name: player.topia.displayName,
    });
  },

  onPlayerLeave(room, player) {
    if (player.entity) room.despawnEntity(player.entity);
  },
});

// --- Tests ---

describe('Full Lifecycle Integration', () => {
  describe('Wiggle Game (tick-driven)', () => {
    let room: TestRoom;
    let players: Player[];

    beforeEach(() => {
      room = TestRoom.create(WiggleGame);
      players = [];
    });

    it('creates room with initial entities (bots + food)', () => {
      // 4 bots + 5 food = 9 entities
      expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);
      expect(room.entities.ofType(FoodEntity)).toHaveLength(5);
      expect(room.entities.count).toBe(9);
    });

    it('connects 3 players, despawning bots', () => {
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });
      const charlie = room.addPlayer({ displayName: 'Charlie' });
      players.push(alice, bob, charlie);

      // 3 humans + 1 bot = 4 snakes + 5 food = 9 entities
      const snakes = room.entities.ofType(SnakeEntity);
      expect(snakes).toHaveLength(4);

      const humans = snakes.filter(s => !s.isBot);
      const bots = snakes.filter(s => s.isBot);
      expect(humans).toHaveLength(3);
      expect(bots).toHaveLength(1);
    });

    it('sends input and verifies state updates', () => {
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });
      const charlie = room.addPlayer({ displayName: 'Charlie' });
      players.push(alice, bob, charlie);

      // Send directional input to each player
      room.sendInput(alice.id, { angle: 0 });            // East
      room.sendInput(bob.id, { angle: Math.PI / 2 });    // South
      room.sendInput(charlie.id, { angle: Math.PI });     // West

      expect(alice.entity.angle).toBe(0);
      expect(bob.entity.angle).toBeCloseTo(Math.PI / 2);
      expect(charlie.entity.angle).toBeCloseTo(Math.PI);

      // Run a few ticks to advance positions
      const aliceStartX = alice.entity.x;
      for (let i = 0; i < 5; i++) room.tick();

      // Alice moves east (positive x)
      expect(alice.entity.x).toBeGreaterThan(aliceStartX);
    });

    it('state syncs to all entities after tick', () => {
      const alice = room.addPlayer({ displayName: 'Alice' });
      alice.entity.x = 100;
      alice.entity.y = 200;
      room.sendInput(alice.id, { angle: 0 });

      room.tick();

      // Snapshot should reflect updated position
      const snapshot = alice.entity.toSnapshot();
      expect(snapshot.x).toBeGreaterThan(100);
      expect(snapshot.y).toBeCloseTo(200);
      expect(snapshot.angle).toBe(0);
      expect(snapshot.name).toBe('Alice');
    });

    it('disconnects a player and verifies cleanup', () => {
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });
      const charlie = room.addPlayer({ displayName: 'Charlie' });

      const aliceEntityId = alice.entity.id;
      const countBefore = room.entities.ofType(SnakeEntity).length;

      room.removePlayer(alice.id);

      const countAfter = room.entities.ofType(SnakeEntity).length;
      expect(countAfter).toBe(countBefore - 1);

      // Alice's entity should be gone
      const aliceEntity = room.entities.all().find(e => e.id === aliceEntityId);
      expect(aliceEntity).toBeUndefined();

      // Bob and Charlie still exist
      expect(bob.entity).toBeTruthy();
      expect(charlie.entity).toBeTruthy();
    });

    it('runs complete session: create → join → play → leave', () => {
      // Phase 1: Room creates with bots
      expect(room.entities.ofType(SnakeEntity)).toHaveLength(4);

      // Phase 2: Players join
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });
      const charlie = room.addPlayer({ displayName: 'Charlie' });

      // Phase 3: Send inputs
      room.sendInput(alice.id, { angle: 0 });
      room.sendInput(bob.id, { angle: Math.PI / 2 });
      room.sendInput(charlie.id, { angle: Math.PI });

      // Phase 4: Run game for 20 ticks
      for (let i = 0; i < 20; i++) room.tick();
      expect(room.tickCount).toBe(20);

      // All snakes should have moved
      for (const snake of room.entities.ofType(SnakeEntity)) {
        const snap = snake.toSnapshot();
        expect(snap.x).toBeDefined();
        expect(snap.y).toBeDefined();
      }

      // Phase 5: One player leaves
      room.removePlayer(bob.id);
      const remainingSnakes = room.entities.ofType(SnakeEntity);
      expect(remainingSnakes.find(s => s.name === 'Bob')).toBeUndefined();

      // Phase 6: Game continues for remaining players
      for (let i = 0; i < 10; i++) room.tick();
      expect(room.tickCount).toBe(30);
    });
  });

  describe('Grid Arena (event-driven)', () => {
    it('runs complete event-driven session', () => {
      const room = TestRoom.create(GridGame);

      // Initial: 1 gem
      expect(room.entities.ofType(GemEntity)).toHaveLength(1);

      // Join 2 players
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });
      expect(room.entities.ofType(GridPlayer)).toHaveLength(2);

      // Alice moves east twice to (2, 0) where the gem is
      room.sendInput(alice.id, { action: 'move', direction: 'east' });
      room.sendInput(alice.id, { action: 'move', direction: 'east' });

      // Alice collected the gem
      expect(alice.entity.score).toBe(10);
      expect(room.entities.ofType(GemEntity)).toHaveLength(0);

      // Bob moves independently
      room.sendInput(bob.id, { action: 'move', direction: 'south' });
      expect(bob.entity.gridY).toBe(1);

      // tick() is a no-op in event-driven mode
      room.tick();
      expect(room.tickCount).toBe(0);

      // Player leaves
      room.removePlayer(alice.id);
      expect(room.entities.ofType(GridPlayer)).toHaveLength(1);
    });
  });

  describe('Cross-feature integration', () => {
    it('inspector sees room entities during gameplay', () => {
      const inspector = InspectorServer.create({ nodeEnv: 'test' })!;
      const room = TestRoom.create(WiggleGame);

      // Register room with inspector
      inspector.addRoom({
        roomId: 'test-room',
        gameName: 'wiggle',
        entities: room.entities,
        tickCount: room.tickCount,
        playerCount: 0,
        createdAt: Date.now(),
        tickDurations: [],
      });

      const player = room.addPlayer({ displayName: 'Inspector Test' });

      // Inspector should see entities
      const result = inspector.handleRequest('/rooms/test-room/entities');
      expect(result.status).toBe(200);
      expect(result.body.length).toBeGreaterThan(0);

      const playerEntity = result.body.find((e: any) => e.schema.name === 'Inspector Test');
      expect(playerEntity).toBeTruthy();
    });

    it('metrics track room and player lifecycle', () => {
      const metrics = new Metrics({ enabled: true });

      // Simulate room creation
      metrics.incRooms();
      expect(metrics.roomsActive).toBe(1);

      // Simulate players joining
      metrics.incPlayers();
      metrics.incPlayers();
      metrics.incPlayers();
      expect(metrics.playersConnected).toBe(3);

      // Simulate ticks
      metrics.observeTickDuration('wiggle', 2);
      metrics.observeTickDuration('wiggle', 3);

      // Simulate player leaving
      metrics.decPlayers();
      expect(metrics.playersConnected).toBe(2);

      // Verify Prometheus output
      const output = metrics.toPrometheus();
      expect(output).toContain('topia_mp_rooms_active 1');
      expect(output).toContain('topia_mp_players_connected 2');
      expect(output).toContain('topia_mp_tick_duration_ms_count{game="wiggle"} 2');
    });

    it('entity snapshots are consistent across tick-driven and event-driven games', () => {
      // Tick-driven
      const tickRoom = TestRoom.create(WiggleGame);
      const tickPlayer = tickRoom.addPlayer({ displayName: 'Tick Player' });
      tickRoom.sendInput(tickPlayer.id, { angle: 1.5 });
      tickRoom.tick();

      const tickSnapshot = tickPlayer.entity.toSnapshot();
      expect(tickSnapshot).toHaveProperty('id');
      expect(tickSnapshot).toHaveProperty('x');
      expect(tickSnapshot).toHaveProperty('y');
      expect(tickSnapshot).toHaveProperty('name', 'Tick Player');

      // Event-driven
      const eventRoom = TestRoom.create(GridGame);
      const eventPlayer = eventRoom.addPlayer({ displayName: 'Event Player' });
      eventRoom.sendInput(eventPlayer.id, { action: 'move', direction: 'east' });

      const eventSnapshot = eventPlayer.entity.toSnapshot();
      expect(eventSnapshot).toHaveProperty('id');
      expect(eventSnapshot).toHaveProperty('gridX', 1);
      expect(eventSnapshot).toHaveProperty('name', 'Event Player');
    });
  });
});
