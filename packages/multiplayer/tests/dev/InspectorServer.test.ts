import { InspectorServer } from '../../src/dev/InspectorServer.js';
import type { InspectorRoom } from '../../src/dev/InspectorServer.js';
import { EntityCollection } from '../../src/core/TopiaRoom.js';
import { Entity, schema } from '../../src/game/Entity.js';

class TestSnake extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('string') name = '';
}

function createTestRoom(overrides?: Partial<InspectorRoom>): InspectorRoom {
  const entities = new EntityCollection();
  const snake1 = new TestSnake('s1');
  snake1.x = 10;
  snake1.y = 20;
  snake1.name = 'Alice';
  entities.add(snake1);

  const snake2 = new TestSnake('s2');
  snake2.x = 30;
  snake2.y = 40;
  snake2.name = 'Bot1';
  snake2.isBot = true;
  entities.add(snake2);

  return {
    roomId: 'wiggle:scene-1',
    gameName: 'wiggle',
    entities,
    tickCount: 100,
    playerCount: 2,
    createdAt: Date.now() - 60000, // 1 min ago
    tickDurations: [2, 3, 2, 4, 3],
    ...overrides,
  };
}

describe('InspectorServer', () => {
  describe('factory', () => {
    it('returns null in production', () => {
      const server = InspectorServer.create({ nodeEnv: 'production' });
      expect(server).toBeNull();
    });

    it('returns instance in development', () => {
      const server = InspectorServer.create({ nodeEnv: 'development' });
      expect(server).not.toBeNull();
    });

    it('returns instance in test', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' });
      expect(server).not.toBeNull();
    });
  });

  describe('room management', () => {
    it('adds and removes rooms', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      const room = createTestRoom();
      server.addRoom(room);
      expect(server.roomCount).toBe(1);

      server.removeRoom(room.roomId);
      expect(server.roomCount).toBe(0);
    });
  });

  describe('GET /rooms', () => {
    it('returns empty list when no rooms', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      const result = server.handleRequest('/rooms');
      expect(result.status).toBe(200);
      expect(result.body).toEqual([]);
    });

    it('returns room summaries', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      server.addRoom(createTestRoom());

      const result = server.handleRequest('/rooms');
      expect(result.status).toBe(200);
      expect(result.body).toHaveLength(1);
      expect(result.body[0]).toMatchObject({
        roomId: 'wiggle:scene-1',
        gameName: 'wiggle',
        playerCount: 2,
        entityCount: 2,
        tickCount: 100,
      });
      expect(result.body[0].uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns multiple rooms', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      server.addRoom(createTestRoom({ roomId: 'room-1' }));
      server.addRoom(createTestRoom({ roomId: 'room-2' }));

      const result = server.handleRequest('/rooms');
      expect(result.body).toHaveLength(2);
    });
  });

  describe('GET /rooms/:id/entities', () => {
    it('returns 404 for unknown room', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      const result = server.handleRequest('/rooms/unknown/entities');
      expect(result.status).toBe(404);
    });

    it('returns entity details', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      server.addRoom(createTestRoom());

      const result = server.handleRequest('/rooms/wiggle:scene-1/entities');
      expect(result.status).toBe(200);
      expect(result.body).toHaveLength(2);

      const alice = result.body.find((e: any) => e.id === 's1');
      expect(alice).toMatchObject({
        id: 's1',
        type: 'TestSnake',
        isBot: false,
        schema: { id: 's1', x: 10, y: 20, name: 'Alice' },
      });

      const bot = result.body.find((e: any) => e.id === 's2');
      expect(bot.isBot).toBe(true);
    });
  });

  describe('GET /rooms/:id/stats', () => {
    it('returns 404 for unknown room', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      const result = server.handleRequest('/rooms/unknown/stats');
      expect(result.status).toBe(404);
    });

    it('returns room stats with tick timing', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      server.addRoom(createTestRoom());

      const result = server.handleRequest('/rooms/wiggle:scene-1/stats');
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        roomId: 'wiggle:scene-1',
        gameName: 'wiggle',
        tickCount: 100,
        entityCount: 2,
        playerCount: 2,
      });
      expect(result.body.avgTickDurationMs).toBeCloseTo(2.8, 1);
      expect(result.body.maxTickDurationMs).toBe(4);
    });
  });

  describe('tick recording', () => {
    it('records tick durations', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      server.addRoom(createTestRoom({ tickDurations: [] }));

      server.recordTick('wiggle:scene-1', 1.5);
      server.recordTick('wiggle:scene-1', 2.0);
      server.recordTick('wiggle:scene-1', 3.5);

      const result = server.handleRequest('/rooms/wiggle:scene-1/stats');
      expect(result.body.avgTickDurationMs).toBeCloseTo(2.33, 1);
      expect(result.body.maxTickDurationMs).toBe(3.5);
    });

    it('is a no-op for unknown room', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      // Should not throw
      server.recordTick('nonexistent', 1.0);
    });
  });

  describe('404', () => {
    it('returns 404 for unknown routes', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      const result = server.handleRequest('/unknown');
      expect(result.status).toBe(404);
    });
  });

  describe('start/stop', () => {
    it('tracks started state', () => {
      const server = InspectorServer.create({ nodeEnv: 'test' })!;
      expect(server.isStarted).toBe(false);
      server.start();
      expect(server.isStarted).toBe(true);
      server.stop();
      expect(server.isStarted).toBe(false);
    });
  });
});
