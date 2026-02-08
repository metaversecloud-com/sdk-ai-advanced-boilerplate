import type { GameDefinition, BotConfig } from './types.js';

export interface GameConfig {
  name: string;
  tickRate: number;
  maxPlayers: number;
  maxRoomsPerProcess: number;
  spectatorMode?: 'zone' | 'overflow' | 'manual';
  playZone?: string;
  debug: string[];
  bots?: BotConfig;
  hooks: {
    onCreate?: GameDefinition['onCreate'];
    onTick?: GameDefinition['onTick'];
    onPlayerJoin?: GameDefinition['onPlayerJoin'];
    onPlayerLeave?: GameDefinition['onPlayerLeave'];
    onSpectatorJoin?: GameDefinition['onSpectatorJoin'];
    onGameOver?: GameDefinition['onGameOver'];
  };
  roomId?: (topia: { urlSlug: string; sceneDropId: string }) => string;
}

export class TopiaGame {
  static define(definition: GameDefinition): GameConfig {
    return {
      name: definition.name,
      tickRate: definition.tickRate ?? 20,
      maxPlayers: definition.maxPlayers ?? 10,
      maxRoomsPerProcess: definition.maxRoomsPerProcess ?? 20,
      spectatorMode: definition.spectatorMode,
      playZone: definition.playZone,
      debug: definition.debug ?? [],
      bots: definition.bots,
      hooks: {
        onCreate: definition.onCreate,
        onTick: definition.onTick,
        onPlayerJoin: definition.onPlayerJoin,
        onPlayerLeave: definition.onPlayerLeave,
        onSpectatorJoin: definition.onSpectatorJoin,
        onGameOver: definition.onGameOver,
      },
    };
  }
}
