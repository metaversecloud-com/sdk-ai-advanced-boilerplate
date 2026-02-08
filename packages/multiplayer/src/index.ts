// Core
export { EntityCollection } from './core/TopiaRoom.js';

// Game
export { TopiaGame } from './game/TopiaGame.js';
export type { GameConfig } from './game/TopiaGame.js';
export { Entity, schema } from './game/Entity.js';
export { InputHandler } from './game/InputHandler.js';
export type { InputPackage } from './game/InputHandler.js';
export { BotBehavior } from './game/BotBehavior.js';
export { BotManager } from './game/BotManager.js';
export { SpectatorManager } from './game/SpectatorManager.js';
export type { SpectatorManagerOptions } from './game/SpectatorManager.js';
export { Logger } from './game/Logger.js';
export type { LoggerOptions } from './game/Logger.js';

// Topia integration
export { TopiaCredentials } from './topia/TopiaCredentials.js';
export type { TopiaPlayerCredentials } from './topia/TopiaCredentials.js';
export { RoomNaming } from './topia/RoomNaming.js';
export { DeferQueue } from './topia/DeferQueue.js';
export { TopiaSDKBridge } from './topia/TopiaSDKBridge.js';
export type { TopiaSDKBridgeOptions } from './topia/TopiaSDKBridge.js';

// Testing
export { TestRoom } from './testing/TestRoom.js';

// Types
export type {
  SchemaType,
  GameDefinition,
  PhysicsConfig,
  BotConfig,
  BotBehaviorDef,
  Player,
  Spectator,
  BotContext,
  GameRoomContext,
  EntityCollection as EntityCollectionInterface,
  TopiaRoomBridge,
  TopiaSDKContext,
} from './game/types.js';
