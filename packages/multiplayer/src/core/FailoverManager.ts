/**
 * FailoverManager handles graceful recovery when a game server process dies.
 *
 * Responsibilities:
 *   - Periodic orphan scan: detect rooms whose owning process has no heartbeat
 *   - Claim orphaned rooms and restore from the latest checkpoint
 *   - Provide a reconnection hook for clients to re-subscribe to room state
 */

import type { RedisAdapter, RoomCheckpoint, RoomRegistryEntry } from './RedisAdapter.js';

export interface FailoverManagerOptions {
  /** How often to scan for orphaned rooms (ms). Default: 10000 */
  scanIntervalMs?: number;
  /** Called when an orphaned room is detected and a checkpoint is available. */
  onOrphanRecovered?: (roomId: string, checkpoint: RoomCheckpoint) => void | Promise<void>;
  /** Called when an orphaned room is detected but no checkpoint exists. */
  onOrphanLost?: (roomId: string, entry: RoomRegistryEntry) => void;
}

export class FailoverManager {
  private redis: RedisAdapter;
  private options: Required<Pick<FailoverManagerOptions, 'scanIntervalMs'>> & FailoverManagerOptions;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private _scanning = false;
  private _recovered: string[] = [];
  private _lost: string[] = [];

  constructor(redis: RedisAdapter, options: FailoverManagerOptions = {}) {
    this.redis = redis;
    this.options = {
      scanIntervalMs: options.scanIntervalMs ?? 10000,
      ...options,
    };
  }

  /** Start periodic orphan scanning. */
  start(): void {
    if (this.scanTimer) return;
    this.scanTimer = setInterval(() => this.scan(), this.options.scanIntervalMs);
  }

  /** Stop periodic scanning. */
  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  get isRunning(): boolean {
    return this.scanTimer !== null;
  }

  /** List of room IDs that were successfully recovered. */
  get recovered(): readonly string[] {
    return this._recovered;
  }

  /** List of room IDs that were lost (no checkpoint available). */
  get lost(): readonly string[] {
    return this._lost;
  }

  /**
   * Run a single orphan scan.
   * Detects rooms whose owning process has no heartbeat, then either
   * recovers them from checkpoint or marks them as lost.
   */
  async scan(): Promise<{ recovered: string[]; lost: string[] }> {
    if (this._scanning) return { recovered: [], lost: [] };
    this._scanning = true;

    const scanRecovered: string[] = [];
    const scanLost: string[] = [];

    try {
      const orphaned = await this.redis.getOrphanedRooms();

      for (const entry of orphaned) {
        const checkpoint = await this.redis.loadCheckpoint(entry.roomId);

        if (checkpoint) {
          // Claim the room: re-register under our process
          await this.redis.registerRoom({
            roomId: entry.roomId,
            gameName: entry.gameName,
            playerCount: entry.playerCount,
            createdAt: entry.createdAt,
          });

          scanRecovered.push(entry.roomId);
          this._recovered.push(entry.roomId);
          await this.options.onOrphanRecovered?.(entry.roomId, checkpoint);
        } else {
          // No checkpoint — clean up the dead registration
          await this.redis.unregisterRoom(entry.roomId);
          scanLost.push(entry.roomId);
          this._lost.push(entry.roomId);
          this.options.onOrphanLost?.(entry.roomId, entry);
        }
      }
    } finally {
      this._scanning = false;
    }

    return { recovered: scanRecovered, lost: scanLost };
  }

  /**
   * Handle client reconnection.
   * When a client reconnects, it needs to re-subscribe to the room state.
   * Returns the latest checkpoint if available, or null if the room must be recreated.
   */
  async getReconnectionState(roomId: string): Promise<RoomCheckpoint | null> {
    return this.redis.loadCheckpoint(roomId);
  }

  /** Reset tracked state (useful in tests). */
  reset(): void {
    this._recovered = [];
    this._lost = [];
  }
}
