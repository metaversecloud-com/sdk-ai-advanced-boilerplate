import { RedisAdapter } from '../../src/core/RedisAdapter.js';
import { FailoverManager } from '../../src/core/FailoverManager.js';
import type { RedisClient, RoomCheckpoint } from '../../src/core/RedisAdapter.js';

/** In-memory Redis mock for testing. */
function createMockRedis(): RedisClient {
  const store = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();

  return {
    async get(key) { return store.get(key) ?? null; },
    async set(key, value) { store.set(key, value); return 'OK'; },
    async del(key) {
      const keys = Array.isArray(key) ? key : [key];
      let count = 0;
      for (const k of keys) { if (store.delete(k)) count++; }
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
    async hget(key, field) { return hashes.get(key)?.get(field) ?? null; },
    async hgetall(key) {
      const hash = hashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash.entries());
    },
    async hdel(key, field) { return hashes.get(key)?.delete(field) ? 1 : 0; },
    async quit() { return 'OK'; },
  };
}

describe('FailoverManager', () => {
  let redis: RedisClient;
  let adapter: RedisAdapter;
  let failover: FailoverManager;

  beforeEach(async () => {
    redis = createMockRedis();
    adapter = new RedisAdapter({
      heartbeatIntervalMs: 60000,
      heartbeatTTLMs: 5000,
      checkpointIntervalMs: 60000,
    });
    await adapter.connect(redis);
  });

  afterEach(async () => {
    failover?.stop();
    await adapter.disconnect();
  });

  it('detects no orphans when all processes are alive', async () => {
    failover = new FailoverManager(adapter);

    // Register a room owned by this process (which has a heartbeat)
    await adapter.registerRoom({
      roomId: 'room-1',
      gameName: 'wiggle',
      playerCount: 2,
      createdAt: Date.now(),
    });
    await adapter.heartbeat();

    const result = await failover.scan();
    expect(result.recovered).toHaveLength(0);
    expect(result.lost).toHaveLength(0);
  });

  it('recovers orphaned room with checkpoint', async () => {
    failover = new FailoverManager(adapter);

    // Simulate a dead process's room registration
    await redis.hset('topia:mp:rooms', 'orphan-1', JSON.stringify({
      roomId: 'orphan-1',
      processId: 'dead-proc',
      gameName: 'wiggle',
      playerCount: 3,
      createdAt: Date.now(),
    }));

    // Simulate a saved checkpoint from the dead process
    const checkpoint: RoomCheckpoint = {
      roomId: 'orphan-1',
      gameName: 'wiggle',
      entities: [{ type: 'SnakeEntity', snapshot: { id: 'e1', x: 50, y: 100 } }],
      state: { round: 2 },
      tickCount: 200,
      savedAt: Date.now(),
    };
    await adapter.saveCheckpoint(checkpoint);

    const onRecovered = jest.fn();
    failover = new FailoverManager(adapter, { onOrphanRecovered: onRecovered });

    const result = await failover.scan();
    expect(result.recovered).toEqual(['orphan-1']);
    expect(result.lost).toHaveLength(0);
    expect(onRecovered).toHaveBeenCalledWith('orphan-1', expect.objectContaining({ roomId: 'orphan-1' }));
    expect(failover.recovered).toContain('orphan-1');

    // The room should now be owned by this process
    const room = await adapter.getRoom('orphan-1');
    expect(room!.processId).toBe(adapter.getProcessId());
  });

  it('marks orphaned room as lost when no checkpoint exists', async () => {
    // Register a room from a dead process (no heartbeat, no checkpoint)
    await redis.hset('topia:mp:rooms', 'orphan-2', JSON.stringify({
      roomId: 'orphan-2',
      processId: 'dead-proc-2',
      gameName: 'grid',
      playerCount: 1,
      createdAt: Date.now(),
    }));

    const onLost = jest.fn();
    failover = new FailoverManager(adapter, { onOrphanLost: onLost });

    const result = await failover.scan();
    expect(result.lost).toEqual(['orphan-2']);
    expect(result.recovered).toHaveLength(0);
    expect(onLost).toHaveBeenCalledWith('orphan-2', expect.objectContaining({ roomId: 'orphan-2' }));
    expect(failover.lost).toContain('orphan-2');

    // The dead registration should be cleaned up
    const room = await adapter.getRoom('orphan-2');
    expect(room).toBeNull();
  });

  it('provides reconnection state from checkpoint', async () => {
    const checkpoint: RoomCheckpoint = {
      roomId: 'room-1',
      gameName: 'wiggle',
      entities: [],
      state: { score: 100 },
      tickCount: 50,
      savedAt: Date.now(),
    };
    await adapter.saveCheckpoint(checkpoint);

    failover = new FailoverManager(adapter);
    const state = await failover.getReconnectionState('room-1');
    expect(state).not.toBeNull();
    expect(state!.state.score).toBe(100);
  });

  it('returns null reconnection state when no checkpoint', async () => {
    failover = new FailoverManager(adapter);
    const state = await failover.getReconnectionState('nonexistent');
    expect(state).toBeNull();
  });

  it('starts and stops periodic scanning', () => {
    failover = new FailoverManager(adapter, { scanIntervalMs: 100 });

    expect(failover.isRunning).toBe(false);
    failover.start();
    expect(failover.isRunning).toBe(true);
    failover.stop();
    expect(failover.isRunning).toBe(false);
  });

  it('does not run concurrent scans', async () => {
    failover = new FailoverManager(adapter);

    // Run two scans simultaneously — the second should return empty
    const [result1, result2] = await Promise.all([
      failover.scan(),
      failover.scan(),
    ]);

    // One should have run, the other should be a no-op
    const totalRecovered = result1.recovered.length + result2.recovered.length;
    const totalLost = result1.lost.length + result2.lost.length;
    expect(totalRecovered).toBe(0);
    expect(totalLost).toBe(0);
  });

  it('resets tracked state', async () => {
    await redis.hset('topia:mp:rooms', 'orphan-3', JSON.stringify({
      roomId: 'orphan-3',
      processId: 'dead-proc-3',
      gameName: 'wiggle',
      playerCount: 0,
      createdAt: Date.now(),
    }));

    failover = new FailoverManager(adapter);
    await failover.scan();
    expect(failover.lost.length).toBeGreaterThan(0);

    failover.reset();
    expect(failover.recovered).toHaveLength(0);
    expect(failover.lost).toHaveLength(0);
  });
});
