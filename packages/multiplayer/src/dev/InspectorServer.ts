/**
 * Game Inspector — dev-only HTTP server that exposes room and entity data.
 *
 * Runs on a separate port (default 3002). Tree-shaken from production builds
 * via the `process.env.NODE_ENV` guard in `create()`.
 *
 * Routes:
 *   GET  /rooms                — list active rooms
 *   GET  /rooms/:id/entities   — entity list with schema values
 *   GET  /rooms/:id/stats      — tick timing, player counts
 */

import type { EntityCollection } from '../core/TopiaRoom.js';
import type {
  InspectorRoomSummary,
  InspectorEntityInfo,
  InspectorRoomStats,
} from './InspectorAPI.js';

export interface InspectorRoom {
  roomId: string;
  gameName: string;
  entities: EntityCollection;
  tickCount: number;
  playerCount: number;
  createdAt: number;
  tickDurations: number[]; // recent tick durations in ms
}

export interface InspectorServerOptions {
  /** Port to listen on. Default: 3002 */
  port?: number;
  /** Override environment check (for testing). Default: process.env.NODE_ENV */
  nodeEnv?: string;
}

type RouteHandler = (params: Record<string, string>) => { status: number; body: any };

/**
 * Lightweight inspector server.
 * Does NOT depend on Express — implements a minimal routing layer
 * so it can be used in tests without a real HTTP server.
 */
export class InspectorServer {
  private rooms: Map<string, InspectorRoom> = new Map();
  private port: number;
  private routes: Map<string, RouteHandler> = new Map();
  private _started = false;

  private constructor(options: InspectorServerOptions = {}) {
    this.port = options.port ?? 3002;
    this.registerRoutes();
  }

  /**
   * Factory method. Returns null in production (tree-shake point).
   */
  static create(options: InspectorServerOptions = {}): InspectorServer | null {
    const env = options.nodeEnv ?? process.env.NODE_ENV;
    if (env === 'production') return null;
    return new InspectorServer(options);
  }

  get isStarted(): boolean {
    return this._started;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  /** Register a room for inspection. */
  addRoom(room: InspectorRoom): void {
    this.rooms.set(room.roomId, room);
  }

  /** Remove a room from inspection. */
  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  /** Record a tick duration for a room. */
  recordTick(roomId: string, durationMs: number): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.tickDurations.push(durationMs);
    // Keep only the last 100 ticks
    if (room.tickDurations.length > 100) {
      room.tickDurations.shift();
    }
  }

  /** Start the inspector (placeholder — real HTTP server would bind here). */
  start(): void {
    this._started = true;
  }

  /** Stop the inspector. */
  stop(): void {
    this._started = false;
  }

  /**
   * Handle a request. Used directly in tests; in production, this would be
   * called from an HTTP request handler.
   */
  handleRequest(path: string): { status: number; body: any } {
    // Match routes
    for (const [pattern, handler] of this.routes) {
      const params = matchRoute(pattern, path);
      if (params !== null) {
        return handler(params);
      }
    }
    return { status: 404, body: { error: 'Not found' } };
  }

  private registerRoutes(): void {
    this.routes.set('/rooms', () => {
      const summaries: InspectorRoomSummary[] = [];
      for (const room of this.rooms.values()) {
        summaries.push({
          roomId: room.roomId,
          gameName: room.gameName,
          playerCount: room.playerCount,
          entityCount: room.entities.count,
          tickCount: room.tickCount,
          uptimeMs: Date.now() - room.createdAt,
        });
      }
      return { status: 200, body: summaries };
    });

    this.routes.set('/rooms/:id/entities', (params) => {
      const room = this.rooms.get(params.id);
      if (!room) return { status: 404, body: { error: 'Room not found' } };

      const entities: InspectorEntityInfo[] = room.entities.all().map(e => ({
        id: e.id,
        type: e.constructor.name,
        isBot: e.isBot,
        schema: e.toSnapshot(),
      }));

      return { status: 200, body: entities };
    });

    this.routes.set('/rooms/:id/stats', (params) => {
      const room = this.rooms.get(params.id);
      if (!room) return { status: 404, body: { error: 'Room not found' } };

      const durations = room.tickDurations;
      const avgTickDurationMs = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
      const maxTickDurationMs = durations.length > 0
        ? Math.max(...durations)
        : 0;

      const stats: InspectorRoomStats = {
        roomId: room.roomId,
        gameName: room.gameName,
        tickCount: room.tickCount,
        avgTickDurationMs,
        maxTickDurationMs,
        entityCount: room.entities.count,
        playerCount: room.playerCount,
        uptimeMs: Date.now() - room.createdAt,
      };

      return { status: 200, body: stats };
    });
  }
}

/** Simple route pattern matcher supporting :param segments. */
function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}
