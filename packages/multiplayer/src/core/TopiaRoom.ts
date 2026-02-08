import { Entity } from '../game/Entity.js';

export class EntityCollection {
  private entities: Map<string, Entity> = new Map();

  get count(): number {
    return this.entities.size;
  }

  add(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  all(): Entity[] {
    return Array.from(this.entities.values());
  }

  ofType<T extends Entity>(EntityClass: new (...args: any[]) => T): T[] {
    return this.all().filter((e): e is T => e instanceof EntityClass);
  }

  nearest<T extends Entity>(
    origin: Entity,
    EntityClass: new (...args: any[]) => T,
    opts?: { exclude?: (e: T) => boolean },
  ): T | null {
    const candidates = this.ofType(EntityClass).filter(e => {
      if (e.id === origin.id) return false;
      if (opts?.exclude?.(e)) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    let closest: T | null = null;
    let closestDist = Infinity;

    const ox = (origin as any).x ?? 0;
    const oy = (origin as any).y ?? 0;

    for (const candidate of candidates) {
      const cx = (candidate as any).x ?? 0;
      const cy = (candidate as any).y ?? 0;
      const dist = (cx - ox) ** 2 + (cy - oy) ** 2;
      if (dist < closestDist) {
        closestDist = dist;
        closest = candidate;
      }
    }

    return closest;
  }

  clear(): void {
    this.entities.clear();
  }

  /** Get all entity snapshots for network sync */
  toSnapshots(): Array<{ type: string; snapshot: Record<string, any> }> {
    return this.all().map(e => ({
      type: e.constructor.name,
      snapshot: e.toSnapshot(),
    }));
  }
}
