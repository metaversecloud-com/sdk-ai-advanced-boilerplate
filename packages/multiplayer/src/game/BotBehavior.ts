import type { BotBehaviorDef } from './types.js';

export class BotBehavior {
  static define(def: BotBehaviorDef): BotBehaviorDef {
    return {
      thinkRate: def.thinkRate,
      think: def.think,
      onMyTurn: def.onMyTurn,
    };
  }
}
