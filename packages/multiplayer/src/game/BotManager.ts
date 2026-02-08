import type { BotBehaviorDef, BotConfig, GameRoomContext } from './types.js';

interface ManagedBot {
  id: string;
  name: string;
  behavior: BotBehaviorDef;
  context: { entity: any; sendInput: (input: Record<string, any>) => void };
  thinkAccumulator: number;
}

type SpawnCallback = (name: string) => { entity: any; sendInput: (input: Record<string, any>) => void };

let botCounter = 0;

export class BotManager {
  private bots: Map<string, ManagedBot> = new Map();
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  get botCount(): number {
    return this.bots.size;
  }

  fillBots(humanCount: number, spawn: SpawnCallback): number {
    const fillTo = this.config.fillTo ?? 0;
    const needed = Math.max(0, fillTo - humanCount - this.bots.size);

    for (let i = 0; i < needed; i++) {
      const id = `bot-${++botCounter}`;
      const name = this.config.names?.[this.bots.size % (this.config.names?.length || 1)]
        ?? `Bot ${botCounter}`;
      const behavior = this.config.behaviors[
        Math.floor(Math.random() * this.config.behaviors.length)
      ];

      const { entity, sendInput } = spawn(name);
      entity.isBot = true;

      this.bots.set(id, {
        id,
        name,
        behavior,
        context: { entity, sendInput },
        thinkAccumulator: 0,
      });
    }

    return needed;
  }

  despawnOne(): ManagedBot | null {
    if (this.bots.size === 0) return null;
    const [firstKey] = this.bots.keys();
    const bot = this.bots.get(firstKey)!;
    this.bots.delete(firstKey);
    return bot;
  }

  tick(room: GameRoomContext, delta: number): void {
    for (const bot of this.bots.values()) {
      if (bot.behavior.thinkRate === 0) continue; // event-driven, skip

      const thinkInterval = bot.behavior.thinkRate
        ? 1 / bot.behavior.thinkRate
        : delta; // think every tick by default

      bot.thinkAccumulator += delta;

      if (bot.thinkAccumulator >= thinkInterval) {
        bot.thinkAccumulator -= thinkInterval;
        bot.behavior.think?.(bot.context, room, delta);
      }
    }
  }

  triggerTurn(botId: string, room: GameRoomContext): void {
    const bot = this.bots.get(botId);
    if (bot?.behavior.onMyTurn) {
      bot.behavior.onMyTurn(bot.context, room);
    }
  }

  clear(): void {
    this.bots.clear();
  }
}
