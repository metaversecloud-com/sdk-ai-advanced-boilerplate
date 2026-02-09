/**
 * Redis adapter for horizontal scaling of @topia/multiplayer.
 *
 * Opt-in: if REDIS_URL is not set, everything falls back to in-memory mode.
 * When enabled, provides:
 *   - Room registry (which process owns which room)
 *   - Process heartbeat with TTL-based liveness detection
 *   - Periodic state checkpoints for failover recovery
 *   - Cross-process message routing via @socket.io/redis-adapter
 */

export interface RedisAdapterOptions {
  /** Redis connection URL (e.g. redis://localhost:6379). If absent, adapter is no-op. */
  url?: string;
  /** Prefix for all Redis keys. Default: 'topia:mp:' */
  keyPrefix?: string;
  /** Process heartbeat interval in ms. Default: 2000 */
  heartbeatIntervalMs?: number;
  /** Heartbeat TTL in ms — process considered dead after this. Default: 5000 */
  heartbeatTTLMs?: number;
  /** State checkpoint interval in ms. Default: 30000 */
  checkpointIntervalMs?: number;
}

export interface RoomRegistryEntry {
  roomId: string;
  processId: string;
  gameName: string;
  playerCount: number;
  createdAt: number;
}

export interface RoomCheckpoint {
  roomId: string;
  gameName: string;
  entities: Array<{ type: string; snapshot: Record<string, any> }>;
  state: Record<string, any>;
  tickCount: number;
  savedAt: number;
}

/** Minimal Redis client interface — compatible with ioredis and ioredis-mock. */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(key: string | string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string): Promise<number>;
  quit(): Promise<any>;
}

export class RedisAdapter {
  private client: RedisClient | null = null;
  private processId: string;
  private keyPrefix: string;
  private heartbeatIntervalMs: number;
  private heartbeatTTLMs: number;
  private checkpointIntervalMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private roomCheckpointCallbacks: Map<string, () => RoomCheckpoint> = new Map();
  private _connected = false;

  constructor(options: RedisAdapterOptions = {}) {
    this.processId = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.keyPrefix = options.keyPrefix ?? 'topia:mp:';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 2000;
    this.heartbeatTTLMs = options.heartbeatTTLMs ?? 5000;
    this.checkpointIntervalMs = options.checkpointIntervalMs ?? 30000;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  getProcessId(): string {
    return this.processId;
  }

  /**
   * Connect to Redis. Pass a pre-constructed client (allows ioredis-mock in tests).
   * If no client is provided and REDIS_URL is set, you must construct the client externally.
   */
  async connect(client: RedisClient): Promise<void> {
    this.client = client;
    this._connected = true;
    this.startHeartbeat();
    this.startCheckpointing();
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }

    if (this.client && this._connected) {
      // Remove our heartbeat
      await this.client.del(this.key(`heartbeat:${this.processId}`));
      // Remove our room registrations
      const rooms = await this.getOwnedRooms();
      for (const room of rooms) {
        await this.client.hdel(this.key('rooms'), room.roomId);
      }
      await this.client.quit();
      this._connected = false;
      this.client = null;
    }
  }

  // --- Room Registry ---

  async registerRoom(entry: Omit<RoomRegistryEntry, 'processId'>): Promise<void> {
    if (!this.client) return;
    const full: RoomRegistryEntry = { ...entry, processId: this.processId };
    await this.client.hset(this.key('rooms'), entry.roomId, JSON.stringify(full));
  }

  async unregisterRoom(roomId: string): Promise<void> {
    if (!this.client) return;
    await this.client.hdel(this.key('rooms'), roomId);
    this.roomCheckpointCallbacks.delete(roomId);
    // Clean up checkpoint
    await this.client.del(this.key(`checkpoint:${roomId}`));
  }

  async getRoom(roomId: string): Promise<RoomRegistryEntry | null> {
    if (!this.client) return null;
    const data = await this.client.hget(this.key('rooms'), roomId);
    return data ? JSON.parse(data) : null;
  }

  async getAllRooms(): Promise<RoomRegistryEntry[]> {
    if (!this.client) return [];
    const data = await this.client.hgetall(this.key('rooms'));
    return Object.values(data).map(v => JSON.parse(v));
  }

  async getOwnedRooms(): Promise<RoomRegistryEntry[]> {
    const all = await this.getAllRooms();
    return all.filter(r => r.processId === this.processId);
  }

  async updatePlayerCount(roomId: string, playerCount: number): Promise<void> {
    if (!this.client) return;
    const existing = await this.getRoom(roomId);
    if (existing && existing.processId === this.processId) {
      existing.playerCount = playerCount;
      await this.client.hset(this.key('rooms'), roomId, JSON.stringify(existing));
    }
  }

  // --- Heartbeat ---

  async heartbeat(): Promise<void> {
    if (!this.client) return;
    const ttlSeconds = Math.ceil(this.heartbeatTTLMs / 1000);
    await this.client.set(
      this.key(`heartbeat:${this.processId}`),
      JSON.stringify({ processId: this.processId, timestamp: Date.now() }),
      'EX',
      ttlSeconds,
    );
  }

  async isProcessAlive(processId: string): Promise<boolean> {
    if (!this.client) return false;
    const data = await this.client.get(this.key(`heartbeat:${processId}`));
    return data !== null;
  }

  async getOrphanedRooms(): Promise<RoomRegistryEntry[]> {
    const allRooms = await this.getAllRooms();
    const orphaned: RoomRegistryEntry[] = [];

    for (const room of allRooms) {
      if (room.processId === this.processId) continue;
      const alive = await this.isProcessAlive(room.processId);
      if (!alive) {
        orphaned.push(room);
      }
    }

    return orphaned;
  }

  // --- State Checkpoints ---

  registerCheckpointCallback(roomId: string, callback: () => RoomCheckpoint): void {
    this.roomCheckpointCallbacks.set(roomId, callback);
  }

  async saveCheckpoint(checkpoint: RoomCheckpoint): Promise<void> {
    if (!this.client) return;
    await this.client.set(
      this.key(`checkpoint:${checkpoint.roomId}`),
      JSON.stringify(checkpoint),
    );
  }

  async loadCheckpoint(roomId: string): Promise<RoomCheckpoint | null> {
    if (!this.client) return null;
    const data = await this.client.get(this.key(`checkpoint:${roomId}`));
    return data ? JSON.parse(data) : null;
  }

  async deleteCheckpoint(roomId: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(this.key(`checkpoint:${roomId}`));
  }

  // --- Internals ---

  private startHeartbeat(): void {
    // Send initial heartbeat immediately
    this.heartbeat();
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.heartbeatIntervalMs);
  }

  private startCheckpointing(): void {
    this.checkpointTimer = setInterval(() => this.runCheckpoints(), this.checkpointIntervalMs);
  }

  private async runCheckpoints(): Promise<void> {
    for (const [roomId, callback] of this.roomCheckpointCallbacks) {
      try {
        const checkpoint = callback();
        await this.saveCheckpoint(checkpoint);
      } catch {
        // Checkpoint failure is non-fatal — log and continue
      }
    }
  }

  private key(suffix: string): string {
    return `${this.keyPrefix}${suffix}`;
  }
}
