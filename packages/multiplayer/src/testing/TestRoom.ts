import { EntityCollection } from '../core/TopiaRoom.js';
import { Entity } from '../game/Entity.js';
import { DeferQueue } from '../topia/DeferQueue.js';
import type { GameConfig } from '../game/TopiaGame.js';
import type { Player, GameRoomContext } from '../game/types.js';

let testPlayerCounter = 0;

export class TestRoom implements GameRoomContext {
  readonly entities: EntityCollection;
  readonly topia: DeferQueue;
  readonly state: Record<string, any> = {};
  tickCount = 0;

  private gameConfig: GameConfig;
  private players: Map<string, Player> = new Map();
  private logMessages: Array<{ channel: string; message: string }> = [];

  private constructor(gameConfig: GameConfig) {
    this.gameConfig = gameConfig;
    this.entities = new EntityCollection();
    this.topia = new DeferQueue();
  }

  static create(gameConfig: GameConfig): TestRoom {
    const room = new TestRoom(gameConfig);
    gameConfig.hooks.onCreate?.(room);
    return room;
  }

  addPlayer(overrides?: Partial<Player['topia']>): Player {
    const id = `test-player-${++testPlayerCounter}`;
    const player: Player = {
      id,
      entity: null as any,
      topia: {
        visitorId: testPlayerCounter,
        displayName: overrides?.displayName ?? `Player ${testPlayerCounter}`,
        profileId: overrides?.profileId ?? `profile-${testPlayerCounter}`,
        urlSlug: overrides?.urlSlug ?? 'test-world',
        sceneDropId: overrides?.sceneDropId ?? 'test-scene',
        identityId: overrides?.identityId ?? `identity-${testPlayerCounter}`,
      },
    };

    this.players.set(id, player);
    this.gameConfig.hooks.onPlayerJoin?.(this, player);

    // If onPlayerJoin spawned an entity, link it
    const allEntities = this.entities.all();
    if (allEntities.length > 0 && !player.entity) {
      player.entity = allEntities[allEntities.length - 1];
    }

    return player;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      this.gameConfig.hooks.onPlayerLeave?.(this, player);
      this.players.delete(playerId);
    }
  }

  tick(delta?: number): void {
    this.tickCount++;
    this.gameConfig.hooks.onTick?.(this, delta ?? 1 / (this.gameConfig.tickRate || 20));
  }

  spawnEntity<T extends typeof Entity>(
    EntityClass: T,
    initial?: Partial<InstanceType<T>>,
  ): InstanceType<T> {
    const entity = new EntityClass() as InstanceType<T>;
    if (initial) {
      Object.assign(entity, initial);
    }
    this.entities.add(entity);
    return entity;
  }

  despawnEntity(entity: Entity): void {
    this.entities.remove(entity.id);
  }

  spawnBot(behavior: any, initial?: Record<string, any>): any {
    // Phase 2 — stub for now
    return { entity: null, sendInput: () => {} };
  }

  log(channel: string, message: string): void {
    this.logMessages.push({ channel, message });
    if (this.gameConfig.debug.includes(channel)) {
      console.log(`[${channel}] ${message}`);
    }
  }

  getLogs(channel?: string): Array<{ channel: string; message: string }> {
    if (channel) return this.logMessages.filter(l => l.channel === channel);
    return [...this.logMessages];
  }
}
