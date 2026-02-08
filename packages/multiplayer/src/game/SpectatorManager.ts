import type { Spectator } from './types.js';

export interface SpectatorManagerOptions {
  mode?: 'zone' | 'overflow' | 'manual';
  playZone?: string;
  maxPlayers?: number;
}

export class SpectatorManager {
  private spectators: Map<string, Spectator> = new Map();
  private mode: SpectatorManagerOptions['mode'];
  private playZone?: string;
  private maxPlayers: number;

  constructor(options: SpectatorManagerOptions = {}) {
    this.mode = options.mode ?? 'manual';
    this.playZone = options.playZone;
    this.maxPlayers = options.maxPlayers ?? Infinity;
  }

  get count(): number {
    return this.spectators.size;
  }

  add(spectator: Spectator): void {
    this.spectators.set(spectator.id, spectator);
  }

  remove(id: string): boolean {
    return this.spectators.delete(id);
  }

  get(id: string): Spectator | undefined {
    return this.spectators.get(id);
  }

  all(): Spectator[] {
    return Array.from(this.spectators.values());
  }

  /** Zone mode: spectate if visitor is NOT in the play zone */
  shouldSpectate(visitorZones: string[]): boolean {
    if (this.mode !== 'zone' || !this.playZone) return false;
    return !visitorZones.includes(this.playZone);
  }

  /** Overflow mode: spectate if current player count >= maxPlayers */
  shouldSpectateOverflow(currentPlayerCount: number): boolean {
    if (this.mode !== 'overflow') return false;
    return currentPlayerCount >= this.maxPlayers;
  }

  clear(): void {
    this.spectators.clear();
  }
}
