import { Entity } from './Entity.js';
import type { PhysicsConfig, EntityCollection } from './types.js';
import { getSchemaFields } from './schema.js';

/**
 * A physics body tracked by PhysicsWorld, backed by Matter.js.
 * Links a game Entity to a physics body for automatic sync.
 */
export interface PhysicsBody {
  id: string;
  entity: Entity;
  matterBody: MatterBody;
  isStatic: boolean;
}

/** Minimal subset of Matter.js Body used by PhysicsWorld. */
export interface MatterBody {
  id: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  angle: number;
  angularVelocity: number;
  isStatic: boolean;
}

/** Minimal subset of Matter.js Engine used by PhysicsWorld. */
export interface MatterEngine {
  world: MatterWorld;
}

/** Minimal subset of Matter.js World (Composite). */
export interface MatterWorld {
  gravity: { x: number; y: number };
  bodies: MatterBody[];
}

/**
 * Abstraction over a Matter.js-like physics engine.
 * Consumers pass in the actual Matter module to avoid bundling it
 * when physics are not used.
 */
export interface MatterModule {
  Engine: {
    create(): MatterEngine;
    update(engine: MatterEngine, delta: number): void;
  };
  World: {
    add(world: MatterWorld, body: MatterBody | MatterBody[]): void;
    remove(world: MatterWorld, body: MatterBody): void;
  };
  Bodies: {
    circle(x: number, y: number, radius: number, options?: Record<string, any>): MatterBody;
    rectangle(x: number, y: number, width: number, height: number, options?: Record<string, any>): MatterBody;
  };
  Body: {
    setVelocity(body: MatterBody, velocity: { x: number; y: number }): void;
    applyForce(body: MatterBody, position: { x: number; y: number }, force: { x: number; y: number }): void;
    setPosition(body: MatterBody, position: { x: number; y: number }): void;
    setAngle(body: MatterBody, angle: number): void;
  };
}

export interface PhysicsWorldOptions {
  gravity?: { x: number; y: number };
  matter: MatterModule;
}

export class PhysicsWorld {
  private engine: MatterEngine;
  private matter: MatterModule;
  private bodies: Map<string, PhysicsBody> = new Map();

  private constructor(options: PhysicsWorldOptions) {
    this.matter = options.matter;
    this.engine = this.matter.Engine.create();
    if (options.gravity) {
      this.engine.world.gravity.x = options.gravity.x;
      this.engine.world.gravity.y = options.gravity.y;
    }
  }

  static create(options: PhysicsWorldOptions): PhysicsWorld {
    return new PhysicsWorld(options);
  }

  /** The underlying Matter.js engine (for advanced config). */
  get matterEngine(): MatterEngine {
    return this.engine;
  }

  /** Number of tracked physics bodies. */
  get bodyCount(): number {
    return this.bodies.size;
  }

  /**
   * Add a circle body for an entity.
   * The body position is initialized from entity's x/y schema fields.
   */
  addCircle(entity: Entity, radius: number, options?: { isStatic?: boolean; restitution?: number; friction?: number; frictionAir?: number; density?: number }): PhysicsBody {
    const e = entity as any;
    const x = typeof e.x === 'number' ? e.x : 0;
    const y = typeof e.y === 'number' ? e.y : 0;

    const matterBody = this.matter.Bodies.circle(x, y, radius, {
      isStatic: options?.isStatic ?? false,
      restitution: options?.restitution,
      friction: options?.friction,
      frictionAir: options?.frictionAir,
      density: options?.density,
    });

    const physicsBody: PhysicsBody = {
      id: entity.id,
      entity,
      matterBody,
      isStatic: options?.isStatic ?? false,
    };

    this.matter.World.add(this.engine.world, matterBody);
    this.bodies.set(entity.id, physicsBody);
    return physicsBody;
  }

  /**
   * Add a rectangle body for an entity (e.g., walls).
   */
  addRectangle(entity: Entity, width: number, height: number, options?: { isStatic?: boolean; restitution?: number; friction?: number }): PhysicsBody {
    const e = entity as any;
    const x = typeof e.x === 'number' ? e.x : 0;
    const y = typeof e.y === 'number' ? e.y : 0;

    const matterBody = this.matter.Bodies.rectangle(x, y, width, height, {
      isStatic: options?.isStatic ?? true,
      restitution: options?.restitution,
      friction: options?.friction,
    });

    const physicsBody: PhysicsBody = {
      id: entity.id,
      entity,
      matterBody,
      isStatic: options?.isStatic ?? true,
    };

    this.matter.World.add(this.engine.world, matterBody);
    this.bodies.set(entity.id, physicsBody);
    return physicsBody;
  }

  /** Remove a physics body by entity ID. */
  remove(entityId: string): void {
    const body = this.bodies.get(entityId);
    if (body) {
      this.matter.World.remove(this.engine.world, body.matterBody);
      this.bodies.delete(entityId);
    }
  }

  /** Get a physics body by entity ID. */
  getBody(entityId: string): PhysicsBody | undefined {
    return this.bodies.get(entityId);
  }

  /** Set velocity on an entity's physics body. */
  setVelocity(entityId: string, vx: number, vy: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      this.matter.Body.setVelocity(body.matterBody, { x: vx, y: vy });
    }
  }

  /** Apply a force to an entity's physics body. */
  applyForce(entityId: string, fx: number, fy: number): void {
    const body = this.bodies.get(entityId);
    if (body) {
      this.matter.Body.applyForce(
        body.matterBody,
        body.matterBody.position,
        { x: fx, y: fy },
      );
    }
  }

  /**
   * Step the physics simulation forward by `delta` seconds.
   * After stepping, syncs all entity schema fields (x, y, angle)
   * from their physics body positions.
   */
  step(delta: number): void {
    // Matter.js expects milliseconds
    this.matter.Engine.update(this.engine, delta * 1000);
    this.syncToEntities();
  }

  /**
   * Sync physics body positions back to entity schema fields.
   * Only syncs x, y, and angle if the entity has those schema fields.
   */
  private syncToEntities(): void {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;

      const entity = body.entity as any;
      const fields = getSchemaFields(entity.constructor);

      if ('x' in fields) {
        entity.x = body.matterBody.position.x;
      }
      if ('y' in fields) {
        entity.y = body.matterBody.position.y;
      }
      if ('angle' in fields) {
        entity.angle = body.matterBody.angle;
      }
    }
  }

  /**
   * Sync entity positions back to physics bodies.
   * Call this when you manually set entity x/y and want physics to match.
   */
  syncFromEntities(): void {
    for (const body of this.bodies.values()) {
      const entity = body.entity as any;
      const x = typeof entity.x === 'number' ? entity.x : body.matterBody.position.x;
      const y = typeof entity.y === 'number' ? entity.y : body.matterBody.position.y;
      this.matter.Body.setPosition(body.matterBody, { x, y });

      if (typeof entity.angle === 'number') {
        this.matter.Body.setAngle(body.matterBody, entity.angle);
      }
    }
  }

  /** Get velocity of a physics body (useful for client-side extrapolation). */
  getVelocity(entityId: string): { x: number; y: number } | null {
    const body = this.bodies.get(entityId);
    if (!body) return null;
    return { x: body.matterBody.velocity.x, y: body.matterBody.velocity.y };
  }

  /** Remove all bodies and reset. */
  clear(): void {
    for (const body of this.bodies.values()) {
      this.matter.World.remove(this.engine.world, body.matterBody);
    }
    this.bodies.clear();
  }
}
