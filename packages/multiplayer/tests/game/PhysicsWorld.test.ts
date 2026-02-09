import { PhysicsWorld, MatterModule, MatterEngine, MatterBody, MatterWorld } from '../../src/game/PhysicsWorld.js';
import { Entity, schema } from '../../src/game/Entity.js';

// --- Mock Matter module ---

let bodyIdCounter = 0;

function createMockBody(x: number, y: number, options?: Record<string, any>): MatterBody {
  return {
    id: ++bodyIdCounter,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle: 0,
    angularVelocity: 0,
    isStatic: options?.isStatic ?? false,
  };
}

const mockMatter: MatterModule = {
  Engine: {
    create(): MatterEngine {
      return {
        world: {
          gravity: { x: 0, y: 1 },
          bodies: [],
        },
      };
    },
    update(engine: MatterEngine, deltaMs: number): void {
      // Simple integration: apply gravity to all non-static bodies
      const dt = deltaMs / 1000;
      for (const body of engine.world.bodies) {
        if (body.isStatic) continue;
        body.velocity.x += engine.world.gravity.x * dt;
        body.velocity.y += engine.world.gravity.y * dt;
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;
      }
    },
  },
  World: {
    add(world: MatterWorld, body: MatterBody | MatterBody[]): void {
      const bodies = Array.isArray(body) ? body : [body];
      world.bodies.push(...bodies);
    },
    remove(world: MatterWorld, body: MatterBody): void {
      const idx = world.bodies.indexOf(body);
      if (idx !== -1) world.bodies.splice(idx, 1);
    },
  },
  Bodies: {
    circle(x: number, y: number, _radius: number, options?: Record<string, any>): MatterBody {
      return createMockBody(x, y, options);
    },
    rectangle(x: number, y: number, _width: number, _height: number, options?: Record<string, any>): MatterBody {
      return createMockBody(x, y, options);
    },
  },
  Body: {
    setVelocity(body: MatterBody, velocity: { x: number; y: number }): void {
      body.velocity.x = velocity.x;
      body.velocity.y = velocity.y;
    },
    applyForce(body: MatterBody, _position: { x: number; y: number }, force: { x: number; y: number }): void {
      // Simplified: treat force as direct velocity change
      body.velocity.x += force.x;
      body.velocity.y += force.y;
    },
    setPosition(body: MatterBody, position: { x: number; y: number }): void {
      body.position.x = position.x;
      body.position.y = position.y;
    },
    setAngle(body: MatterBody, angle: number): void {
      body.angle = angle;
    },
  },
};

// --- Test entities ---

class BallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('float32') angle = 0;
  @schema('int16') score = 0;
}

class WallEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

// --- Tests ---

describe('PhysicsWorld', () => {
  beforeEach(() => {
    bodyIdCounter = 0;
  });

  it('creates with custom gravity', () => {
    const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
    expect(physics.matterEngine.world.gravity.x).toBe(0);
    expect(physics.matterEngine.world.gravity.y).toBe(0);
  });

  it('creates with default gravity when not specified', () => {
    const physics = PhysicsWorld.create({ matter: mockMatter });
    // Mock Matter starts with gravity { x: 0, y: 1 } — unchanged
    expect(physics.matterEngine.world.gravity.y).toBe(1);
  });

  describe('addCircle', () => {
    it('adds a circle body linked to an entity', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      ball.x = 100;
      ball.y = 200;

      const body = physics.addCircle(ball, 20);

      expect(body.id).toBe(ball.id);
      expect(body.entity).toBe(ball);
      expect(body.matterBody.position.x).toBe(100);
      expect(body.matterBody.position.y).toBe(200);
      expect(body.isStatic).toBe(false);
      expect(physics.bodyCount).toBe(1);
    });

    it('supports static circle bodies', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const entity = new BallEntity();
      const body = physics.addCircle(entity, 10, { isStatic: true });
      expect(body.isStatic).toBe(true);
    });
  });

  describe('addRectangle', () => {
    it('adds a rectangle body (default static)', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const wall = new WallEntity();
      wall.x = 400;
      wall.y = 300;

      const body = physics.addRectangle(wall, 800, 20);

      expect(body.isStatic).toBe(true);
      expect(body.matterBody.position.x).toBe(400);
    });
  });

  describe('remove', () => {
    it('removes a body by entity ID', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      physics.addCircle(ball, 20);
      expect(physics.bodyCount).toBe(1);

      physics.remove(ball.id);
      expect(physics.bodyCount).toBe(0);
    });

    it('is a no-op for unknown entity IDs', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      physics.remove('nonexistent');
      expect(physics.bodyCount).toBe(0);
    });
  });

  describe('setVelocity', () => {
    it('sets velocity on a physics body', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      physics.addCircle(ball, 20);

      physics.setVelocity(ball.id, 5, -3);

      const body = physics.getBody(ball.id);
      expect(body?.matterBody.velocity.x).toBe(5);
      expect(body?.matterBody.velocity.y).toBe(-3);
    });
  });

  describe('applyForce', () => {
    it('applies force to a physics body', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      physics.addCircle(ball, 20);

      physics.applyForce(ball.id, 0.01, 0);

      const body = physics.getBody(ball.id);
      expect(body?.matterBody.velocity.x).toBeGreaterThan(0);
    });
  });

  describe('step + sync', () => {
    it('steps physics and syncs positions back to entities', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      ball.x = 100;
      ball.y = 100;
      physics.addCircle(ball, 20);

      physics.setVelocity(ball.id, 10, 0);
      physics.step(1); // 1 second

      // After 1s at velocity 10, x should advance
      expect(ball.x).toBeGreaterThan(100);
      expect(ball.y).toBe(100); // no y velocity, no gravity
    });

    it('applies gravity over time', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 10 } });
      const ball = new BallEntity();
      ball.x = 0;
      ball.y = 0;
      physics.addCircle(ball, 20);

      physics.step(1); // 1 second

      expect(ball.y).toBeGreaterThan(0); // gravity pulled it down
    });

    it('does not sync static bodies', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 10 } });
      const wall = new WallEntity();
      wall.x = 400;
      wall.y = 300;
      physics.addRectangle(wall, 800, 20, { isStatic: true });

      physics.step(1);

      expect(wall.x).toBe(400);
      expect(wall.y).toBe(300);
    });
  });

  describe('syncFromEntities', () => {
    it('syncs entity positions to physics bodies', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      ball.x = 0;
      ball.y = 0;
      physics.addCircle(ball, 20);

      // Manually move entity
      ball.x = 300;
      ball.y = 400;
      physics.syncFromEntities();

      const body = physics.getBody(ball.id);
      expect(body?.matterBody.position.x).toBe(300);
      expect(body?.matterBody.position.y).toBe(400);
    });
  });

  describe('getVelocity', () => {
    it('returns velocity of a body', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball = new BallEntity();
      physics.addCircle(ball, 20);
      physics.setVelocity(ball.id, 3, -7);

      const vel = physics.getVelocity(ball.id);
      expect(vel).toEqual({ x: 3, y: -7 });
    });

    it('returns null for unknown entity', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      expect(physics.getVelocity('nope')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all bodies', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      physics.addCircle(new BallEntity(), 20);
      physics.addCircle(new BallEntity(), 20);
      expect(physics.bodyCount).toBe(2);

      physics.clear();
      expect(physics.bodyCount).toBe(0);
    });
  });

  describe('multiple entities', () => {
    it('tracks and updates multiple entities independently', () => {
      const physics = PhysicsWorld.create({ matter: mockMatter, gravity: { x: 0, y: 0 } });
      const ball1 = new BallEntity();
      const ball2 = new BallEntity();
      ball1.x = 0; ball1.y = 0;
      ball2.x = 100; ball2.y = 100;

      physics.addCircle(ball1, 20);
      physics.addCircle(ball2, 20);

      physics.setVelocity(ball1.id, 10, 0);
      physics.setVelocity(ball2.id, 0, -10);

      physics.step(1);

      expect(ball1.x).toBeGreaterThan(0);
      expect(ball1.y).toBe(0);
      expect(ball2.x).toBe(100);
      expect(ball2.y).toBeLessThan(100);
    });
  });
});
