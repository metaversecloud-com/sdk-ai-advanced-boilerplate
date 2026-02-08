export type SchemaType = 'float32' | 'float64' | 'int8' | 'int16' | 'int32' | 'uint8' | 'uint16' | 'uint32' | 'string' | 'boolean';

export interface SchemaField {
  type: SchemaType;
  propertyKey: string;
}

export interface GameDefinition {
  name: string;
  tickRate?: number;          // Server Hz, 0 = event-driven
  maxPlayers?: number;
  physics?: PhysicsConfig;
  bots?: BotConfig;
  spectatorMode?: 'zone' | 'overflow' | 'manual';
  playZone?: string;
  debug?: string[];
  maxRoomsPerProcess?: number;

  onCreate?(room: GameRoomContext): void | Promise<void>;
  onTick?(room: GameRoomContext, delta: number): void;
  onPlayerJoin?(room: GameRoomContext, player: Player): void | Promise<void>;
  onPlayerLeave?(room: GameRoomContext, player: Player): void;
  onSpectatorJoin?(room: GameRoomContext, spectator: Spectator): void;
  onGameOver?(room: GameRoomContext, winner?: Player): void | Promise<void>;
}

export interface PhysicsConfig {
  engine: 'matter' | 'rapier';
  gravity?: { x: number; y: number };
}

export interface BotConfig {
  fillTo?: number;
  behaviors: BotBehaviorDef[];
  despawnOnJoin?: boolean;
  names?: string[];
}

export interface BotBehaviorDef {
  thinkRate?: number;   // Hz, 0 = event-driven
  think?(bot: BotContext, room: GameRoomContext, delta: number): void;
  onMyTurn?(bot: BotContext, room: GameRoomContext): void;
}

export interface Player {
  id: string;
  entity: any;
  topia: {
    visitorId: number;
    displayName: string;
    profileId: string;
    urlSlug: string;
    sceneDropId: string;
    identityId: string;
  };
}

export interface Spectator {
  id: string;
  topia: Player['topia'];
}

export interface BotContext {
  entity: any;
  sendInput(input: Record<string, any>): void;
}

export interface GameRoomContext {
  tickCount: number;
  entities: EntityCollection;
  topia: TopiaRoomBridge;
  state: any;
  spawnEntity<T extends typeof Entity>(
    EntityClass: T,
    initial?: Partial<InstanceType<T>>
  ): InstanceType<T>;
  despawnEntity(entity: any): void;
  spawnBot(behavior: BotBehaviorDef, initial?: Record<string, any>): BotContext;
  log(channel: string, message: string): void;
}

export interface EntityCollection {
  count: number;
  all(): Entity[];
  ofType<T extends Entity>(EntityClass: new (...args: any[]) => T): T[];
  nearest<T extends Entity>(origin: Entity, EntityClass: new (...args: any[]) => T, opts?: { exclude?: (e: T) => boolean }): T | null;
}

export interface TopiaRoomBridge {
  defer(fn: (() => Promise<void>) | ((sdk: TopiaSDKContext) => Promise<void>)): void;
  deferTracked(method: string, args: any[]): void;
  tracked: readonly { method: string; args: any[] }[];
}

export interface TopiaSDKContext {
  world: any;       // World SDK instance
  visitor(visitorId: number): any;  // Visitor SDK instance
}

// Forward reference for types — actual class is in Entity.ts
import type { Entity } from './Entity.js';
