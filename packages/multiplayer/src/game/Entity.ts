import { schema, getSchemaFields } from './schema.js';
import type { SchemaType } from './types.js';

export { schema };

let entityIdCounter = 0;

export class Entity {
  readonly id: string;
  isBot = false;

  constructor(id?: string) {
    this.id = id ?? `entity-${++entityIdCounter}`;
  }

  static getSchemaFields(): Record<string, SchemaType> {
    return getSchemaFields(this);
  }

  /** Called when this entity's owner sends input. Override in subclass. */
  onInput(input: Record<string, any>): void {}

  /** Serialize schema fields to a plain object for network sync. */
  toSnapshot(): Record<string, any> {
    const fields = (this.constructor as typeof Entity).getSchemaFields();
    const snapshot: Record<string, any> = { id: this.id };
    for (const key of Object.keys(fields)) {
      snapshot[key] = (this as any)[key];
    }
    return snapshot;
  }

  /** Apply a snapshot from the server. */
  applySnapshot(snapshot: Record<string, any>): void {
    const fields = (this.constructor as typeof Entity).getSchemaFields();
    for (const key of Object.keys(fields)) {
      if (key in snapshot) {
        (this as any)[key] = snapshot[key];
      }
    }
  }
}
