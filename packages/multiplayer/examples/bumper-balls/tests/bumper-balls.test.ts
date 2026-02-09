import { TestRoom } from '../../../src/testing/TestRoom.js';
import { BumperBallsGame } from '../server/bumper-balls-game.js';
import { BallEntity } from '../server/entities/BallEntity.js';
import { PowerUpEntity } from '../server/entities/PowerUpEntity.js';

describe('Bumper Balls', () => {
  describe('game configuration', () => {
    it('uses tick-driven mode at 20 Hz', () => {
      expect(BumperBallsGame.tickRate).toBe(20);
    });

    it('supports up to 8 players', () => {
      expect(BumperBallsGame.maxPlayers).toBe(8);
    });

    it('spawns power-ups on create', () => {
      const room = TestRoom.create(BumperBallsGame);
      const powerUps = room.entities.ofType(PowerUpEntity);
      expect(powerUps.length).toBe(3);
    });

    it('auto-fills bots on create', () => {
      const room = TestRoom.create(BumperBallsGame);
      const balls = room.entities.ofType(BallEntity);
      expect(balls).toHaveLength(4); // fillTo: 4
    });
  });

  describe('player movement', () => {
    it('applies thrust input to ball velocity', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Alice' });

      // Position ball away from walls
      player.entity.x = 300;
      player.entity.y = 300;
      player.entity.vx = 0;
      player.entity.vy = 0;

      room.sendInput(player.id, { thrustX: 2, thrustY: 0 });

      expect(player.entity.vx).toBeGreaterThan(0);
    });

    it('moves ball on tick', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Alice' });

      player.entity.x = 300;
      player.entity.y = 300;
      player.entity.vx = 5;
      player.entity.vy = 0;

      const startX = player.entity.x;
      room.tick();

      expect(player.entity.x).toBeGreaterThan(startX);
    });

    it('applies friction to slow down', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Slider' });

      player.entity.x = 300;
      player.entity.y = 300;
      player.entity.vx = 5;
      player.entity.vy = 0;

      room.tick();
      const vxAfterTick = player.entity.vx;

      // Velocity should decrease due to friction
      expect(vxAfterTick).toBeLessThan(5);
      expect(vxAfterTick).toBeGreaterThan(0);
    });

    it('clamps speed to max', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Speedy' });

      player.entity.vx = 0;
      player.entity.vy = 0;

      // Apply huge thrust
      room.sendInput(player.id, { thrustX: 100, thrustY: 100 });

      const speed = Math.sqrt(
        player.entity.vx * player.entity.vx +
        player.entity.vy * player.entity.vy,
      );
      expect(speed).toBeLessThanOrEqual(8.01); // MAX_SPEED = 8
    });
  });

  describe('wall bounce', () => {
    it('bounces off left wall', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Bouncer' });

      player.entity.x = 5;
      player.entity.y = 300;
      player.entity.vx = -10;
      player.entity.vy = 0;
      player.entity.radius = 20;

      room.tick();

      // Should have bounced: x >= radius and vx > 0
      expect(player.entity.x).toBeGreaterThanOrEqual(player.entity.radius);
      expect(player.entity.vx).toBeGreaterThan(0);
    });

    it('bounces off bottom wall', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Bouncer' });

      player.entity.x = 300;
      player.entity.y = 595;
      player.entity.vx = 0;
      player.entity.vy = 10;
      player.entity.radius = 20;

      room.tick();

      expect(player.entity.y).toBeLessThanOrEqual(600 - player.entity.radius);
      expect(player.entity.vy).toBeLessThan(0);
    });
  });

  describe('ball-to-ball collision', () => {
    it('bounces overlapping balls apart', () => {
      const room = TestRoom.create(BumperBallsGame);
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });

      // Position balls close together, approaching each other
      alice.entity.x = 295;
      alice.entity.y = 300;
      alice.entity.vx = 5;
      alice.entity.vy = 0;
      alice.entity.radius = 20;

      bob.entity.x = 325;
      bob.entity.y = 300;
      bob.entity.vx = -5;
      bob.entity.vy = 0;
      bob.entity.radius = 20;

      room.tick();

      // After collision, Alice should be pushed left, Bob pushed right
      expect(alice.entity.vx).toBeLessThan(5);
      expect(bob.entity.vx).toBeGreaterThan(-5);
    });
  });

  describe('power-up collection', () => {
    it('awards score when collecting a power-up', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Collector' });

      // Remove all existing power-ups
      for (const pu of room.entities.ofType(PowerUpEntity)) {
        room.despawnEntity(pu);
      }

      // Place a power-up at a known position
      const pu = room.spawnEntity(PowerUpEntity, { x: 310, y: 300 });

      player.entity.x = 300;
      player.entity.y = 300;
      player.entity.vx = 0;
      player.entity.vy = 0;
      player.entity.radius = 20;
      player.entity.score = 0;

      room.tick();

      expect(player.entity.score).toBe(1);
    });
  });

  describe('multiplayer', () => {
    it('supports multiple independent players', () => {
      const room = TestRoom.create(BumperBallsGame);
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });

      alice.entity.x = 100;
      alice.entity.y = 300;
      bob.entity.x = 500;
      bob.entity.y = 300;

      room.sendInput(alice.id, { thrustX: 1, thrustY: 0 });
      room.sendInput(bob.id, { thrustX: -1, thrustY: 0 });

      expect(alice.entity.vx).toBeGreaterThan(0);
      expect(bob.entity.vx).toBeLessThan(0);
    });

    it('despawns bot when human joins', () => {
      const room = TestRoom.create(BumperBallsGame);
      const beforeCount = room.entities.ofType(BallEntity).length;
      expect(beforeCount).toBe(4);

      room.addPlayer({ displayName: 'Human' });
      const afterCount = room.entities.ofType(BallEntity).length;
      expect(afterCount).toBe(4); // 3 bots + 1 human
    });

    it('removes player entity on leave', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Leaver' });
      const id = player.entity.id;

      room.removePlayer(player.id);
      expect(room.entities.all().find(e => e.id === id)).toBeUndefined();
    });
  });

  describe('entity snapshots', () => {
    it('serializes ball schema fields correctly', () => {
      const room = TestRoom.create(BumperBallsGame);
      const player = room.addPlayer({ displayName: 'Snapshot' });
      player.entity.x = 150;
      player.entity.y = 250;
      player.entity.vx = 3;
      player.entity.vy = -2;
      player.entity.score = 7;

      const snapshot = player.entity.toSnapshot();
      expect(snapshot.x).toBe(150);
      expect(snapshot.y).toBe(250);
      expect(snapshot.vx).toBe(3);
      expect(snapshot.vy).toBe(-2);
      expect(snapshot.score).toBe(7);
      expect(snapshot.name).toBe('Snapshot');
      expect(snapshot.id).toBeDefined();
    });
  });
});
