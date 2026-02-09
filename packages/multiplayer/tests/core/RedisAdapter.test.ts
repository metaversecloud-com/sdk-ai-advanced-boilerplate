import { RedisAdapter } from '../../src/core/RedisAdapter.js';
import type { RedisClient, RoomCheckpoint } from '../../src/core/RedisAdapter.js';

/** In-memory Redis mock implementing the minimal RedisClient interface. */
function createMockRedis(): RedisClient {
  const store = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const ttls = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, ...args) {
      store.set(key, value);
      // Handle EX (expire in seconds)
      if (args[0] === 'EX' && typeof args[1] === 'number') {
        if (ttls.has(key)) clearTimeout(ttls.get(key)!);
        ttls.set(key, setTimeout(() => store.delete(key), args[1] * 1000));
      }
      return 'OK';
    },
    async del(key) {
      const keys = Array.isArray(key) ? key : [key];
      let count = 0;
      for (const k of keys) {
        if (store.delete(k)) count++;
        if (ttls.has(k)) {
          clearTimeout(ttls.get(k)!);
          ttls.delete(k);
        }
      }
      return count;
    },
    async keys(pattern) {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter(k => k.startsWith(prefix));
    },
    async hset(key, field, value) {
      if (!hashes.has(key)) hashes.set(key, new Map());
      hashes.get(key)!.set(field, value);
      return 1;
    },
    async hget(key, field) {
      return hashes.get(key)?.get(field) ?? null;
    },
    async hgetall(key) {
      const hash = hashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash.entries());
    },
    async hdel(key, field) {
      const deleted = hashes.get(key)?.delete(field) ? 1 : 0;
      return deleted;
    },
    async quit() {
      // Clear all TTL timers
      for (const timer of ttls.values()) clearTimeout(timer);
      ttls.clear();
      return 'OK';
    },
  };
}

describe('RedisAdapter', () => {
  let adapter: RedisAdapter;
  let redis: RedisClient;

  beforeEach(async () => {
    adapter = new RedisAdapter({
      heartbeatIntervalMs: 60000, // long interval so it doesn't fire in tests
      heartbeatTTLMs: 5000,
      checkpointIntervalMs: 60000,
    });
    redis = createMockRedis();
    await adapter.connect(redis);
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('connection', () => {
    it('reports connected after connect()', () => {
      expect(adapter.isConnected).toBe(true);
      expect(adapter.isEnabled).toBe(true);
    });

    it('generates a unique process ID', () => {
      expect(adapter.getProcessId()).toMatch(/^proc-/);
    });

    it('reports disconnected after disconnect()', async () => {
      await adapter.disconnect();
      expect(adapter.isConnected).toBe(false);
    });
  });

  describe('room registry', () => {
    it('registers and retrieves a room', async () => {
      await adapter.registerRoom({
        roomId: 'wiggle:scene-1',
        gameName: 'wiggle',
        playerCount: 3,
        createdAt: Date.now(),
      });

      const room = await adapter.getRoom('wiggle:scene-1');
      expect(room).not.toBeNull();
      expect(room!.roomId).toBe('wiggle:scene-1');
      expect(room!.gameName).toBe('wiggle');
      expect(room!.playerCount).toBe(3);
      expect(room!.processId).toBe(adapter.getProcessId());
    });

    it('returns null for non-existent room', async () => {
      const room = await adapter.getRoom('nonexistent');
      expect(room).toBeNull();
    });

    it('lists all rooms', async () => {
      await adapter.registerRoom({ roomId: 'room-1', gameName: 'wiggle', playerCount: 2, createdAt: Date.now() });
      await adapter.registerRoom({ roomId: 'room-2', gameName: 'grid', playerCount: 4, createdAt: Date.now() });

      const rooms = await adapter.getAllRooms();
      expect(rooms).toHaveLength(2);
    });

    it('filters owned rooms', async () => {
      await adapter.registerRoom({ roomId: 'mine', gameName: 'wiggle', playerCount: 1, createdAt: Date.now() });

      // Manually inject a room from another process
      await redis.hset('topia:mp:rooms', 'theirs', JSON.stringify({
        roomId: 'theirs',
        processId: 'other-proc',
        gameName: 'wiggle',
        playerCount: 2,
        createdAt: Date.now(),
      }));

      const owned = await adapter.getOwnedRooms();
      expect(owned).toHaveLength(1);
      expect(owned[0].roomId).toBe('mine');
    });

    it('unregisters a room', async () => {
      await adapter.registerRoom({ roomId: 'room-1', gameName: 'wiggle', playerCount: 1, createdAt: Date.now() });
      await adapter.unregisterRoom('room-1');

      const room = await adapter.getRoom('room-1');
      expect(room).toBeNull();
    });

    it('updates player count', async () => {
      await adapter.registerRoom({ roomId: 'room-1', gameName: 'wiggle', playerCount: 1, createdAt: Date.now() });
      await adapter.updatePlayerCount('room-1', 5);

      const room = await adapter.getRoom('room-1');
      expect(room!.playerCount).toBe(5);
    });
  });

  describe('heartbeat', () => {
    it('reports own process as alive after heartbeat', async () => {
      await adapter.heartbeat();
      const alive = await adapter.isProcessAlive(adapter.getProcessId());
      expect(alive).toBe(true);
    });

    it('reports unknown process as not alive', async () => {
      const alive = await adapter.isProcessAlive('unknown-proc');
      expect(alive).toBe(false);
    });

    it('detects orphaned rooms from dead processes', async () => {
      // Register a room from a "dead" process (no heartbeat)
      await redis.hset('topia:mp:rooms', 'orphan-room', JSON.stringify({
        roomId: 'orphan-room',
        processId: 'dead-proc',
        gameName: 'wiggle',
        playerCount: 2,
        createdAt: Date.now(),
      }));

      const orphaned = await adapter.getOrphanedRooms();
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].roomId).toBe('orphan-room');
    });
  });

  describe('state checkpoints', () => {
    it('saves and loads a checkpoint', async () => {
      const checkpoint: RoomCheckpoint = {
        roomId: 'room-1',
        gameName: 'wiggle',
        entities: [{ type: 'SnakeEntity', snapshot: { id: 'e1', x: 10, y: 20 } }],
        state: { round: 3 },
        tickCount: 150,
        savedAt: Date.now(),
      };

      await adapter.saveCheckpoint(checkpoint);
      const loaded = await adapter.loadCheckpoint('room-1');

      expect(loaded).not.toBeNull();
      expect(loaded!.roomId).toBe('room-1');
      expect(loaded!.entities).toHaveLength(1);
      expect(loaded!.state.round).toBe(3);
      expect(loaded!.tickCount).toBe(150);
    });

    it('returns null for non-existent checkpoint', async () => {
      const loaded = await adapter.loadCheckpoint('nonexistent');
      expect(loaded).toBeNull();
    });

    it('deletes a checkpoint', async () => {
      await adapter.saveCheckpoint({
        roomId: 'room-1', gameName: 'wiggle', entities: [], state: {}, tickCount: 0, savedAt: Date.now(),
      });
      await adapter.deleteCheckpoint('room-1');

      const loaded = await adapter.loadCheckpoint('room-1');
      expect(loaded).toBeNull();
    });

    it('registers checkpoint callbacks and saves via them', async () => {
      const checkpointFn = jest.fn<RoomCheckpoint, []>(() => ({
        roomId: 'room-1',
        gameName: 'wiggle',
        entities: [],
        state: { score: 42 },
        tickCount: 100,
        savedAt: Date.now(),
      }));

      adapter.registerCheckpointCallback('room-1', checkpointFn);

      // Manually save using the callback (simulates what runCheckpoints does)
      const cp = checkpointFn();
      await adapter.saveCheckpoint(cp);

      const loaded = await adapter.loadCheckpoint('room-1');
      expect(loaded!.state.score).toBe(42);
    });
  });

  describe('no-op when disconnected', () => {
    it('returns safe defaults when no client', async () => {
      const noRedis = new RedisAdapter();
      // Not connected — all operations should be safe no-ops
      expect(noRedis.isEnabled).toBe(false);
      expect(await noRedis.getRoom('any')).toBeNull();
      expect(await noRedis.getAllRooms()).toEqual([]);
      expect(await noRedis.loadCheckpoint('any')).toBeNull();
      expect(await noRedis.isProcessAlive('any')).toBe(false);
      expect(await noRedis.getOrphanedRooms()).toEqual([]);

      // These should not throw
      await noRedis.registerRoom({ roomId: 'x', gameName: 'x', playerCount: 0, createdAt: 0 });
      await noRedis.heartbeat();
      await noRedis.saveCheckpoint({ roomId: 'x', gameName: 'x', entities: [], state: {}, tickCount: 0, savedAt: 0 });
    });
  });
});
