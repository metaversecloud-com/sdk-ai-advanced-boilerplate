/**
 * Inspector API — defines the shape of data exposed by the game inspector.
 * Used by both InspectorServer and the Inspector UI client.
 */

export interface InspectorRoomSummary {
  roomId: string;
  gameName: string;
  playerCount: number;
  entityCount: number;
  tickCount: number;
  uptimeMs: number;
}

export interface InspectorEntityInfo {
  id: string;
  type: string;
  isBot: boolean;
  schema: Record<string, any>;
}

export interface InspectorRoomStats {
  roomId: string;
  gameName: string;
  tickCount: number;
  avgTickDurationMs: number;
  maxTickDurationMs: number;
  entityCount: number;
  playerCount: number;
  uptimeMs: number;
}

export interface InspectorRoomDetail {
  summary: InspectorRoomSummary;
  entities: InspectorEntityInfo[];
  stats: InspectorRoomStats;
}

/** Events emitted on the WebSocket stream channel. */
export type InspectorStreamEvent =
  | { type: 'entities'; data: InspectorEntityInfo[] }
  | { type: 'stats'; data: InspectorRoomStats }
  | { type: 'tick'; tickCount: number; durationMs: number };
