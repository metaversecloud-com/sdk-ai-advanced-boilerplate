import { TestRoom } from '../../../src/testing/TestRoom.js';
import { GridArenaGame } from '../server/grid-arena-game.js';
import { PlayerEntity } from '../server/entities/PlayerEntity.js';
import { GemEntity } from '../server/entities/GemEntity.js';

describe('Grid Arena', () => {
  describe('game configuration', () => {
    it('uses event-driven mode (tickRate 0)', () => {
      expect(GridArenaGame.tickRate).toBe(0);
    });

    it('spawns gems on create', () => {
      const room = TestRoom.create(GridArenaGame);
      const gems = room.entities.ofType(GemEntity);
      expect(gems.length).toBeGreaterThan(0);
    });

    it('auto-fills bots on create', () => {
      const room = TestRoom.create(GridArenaGame);
      const players = room.entities.ofType(PlayerEntity);
      expect(players).toHaveLength(4); // fillTo: 4
    });
  });

  describe('player movement', () => {
    it('moves player on grid via input', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Alice' });

      // Set known starting position away from edges
      player.entity.gridX = 5;
      player.entity.gridY = 5;

      room.sendInput(player.id, { action: 'move', direction: 'east' });
      expect(player.entity.gridX).toBe(6);
      expect(player.entity.gridY).toBe(5);
    });

    it('does not move outside grid bounds', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Border' });

      // Force to corner (0, 0)
      player.entity.gridX = 0;
      player.entity.gridY = 0;

      // Try to move out of bounds
      room.sendInput(player.id, { action: 'move', direction: 'north' });
      expect(player.entity.gridY).toBe(0); // Clamped

      room.sendInput(player.id, { action: 'move', direction: 'west' });
      expect(player.entity.gridX).toBe(0); // Clamped
    });

    it('dead players cannot move', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Dead' });
      player.entity.isAlive = false;
      const startX = player.entity.gridX;

      room.sendInput(player.id, { action: 'move', direction: 'east' });
      expect(player.entity.gridX).toBe(startX); // Unchanged
    });
  });

  describe('gem collection', () => {
    it('collects gem at same grid position', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Collector' });

      // Remove all existing gems and place one at a known position
      for (const gem of room.entities.ofType(GemEntity)) {
        room.despawnEntity(gem);
      }
      room.spawnEntity(GemEntity, { gridX: 1, gridY: 0, value: 5 });

      // Move player to gem
      player.entity.gridX = 0;
      player.entity.gridY = 0;
      player.entity.score = 0;
      room.sendInput(player.id, { action: 'move', direction: 'east' });

      expect(player.entity.gridX).toBe(1);
      expect(player.entity.score).toBe(5);
    });
  });

  describe('trap collision', () => {
    it('kills player that steps on a trap', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Unlucky' });

      // Trap at (4, 4) — position player adjacent
      player.entity.gridX = 3;
      player.entity.gridY = 4;
      player.entity.isAlive = true;

      room.sendInput(player.id, { action: 'move', direction: 'east' });
      expect(player.entity.gridX).toBe(4);
      expect(player.entity.gridY).toBe(4);
      expect(player.entity.isAlive).toBe(false);
    });
  });

  describe('multiplayer', () => {
    it('supports multiple independent players', () => {
      const room = TestRoom.create(GridArenaGame);
      const alice = room.addPlayer({ displayName: 'Alice' });
      const bob = room.addPlayer({ displayName: 'Bob' });

      alice.entity.gridX = 0;
      alice.entity.gridY = 0;
      bob.entity.gridX = 5;
      bob.entity.gridY = 5;

      room.sendInput(alice.id, { action: 'move', direction: 'east' });
      room.sendInput(bob.id, { action: 'move', direction: 'north' });

      expect(alice.entity.gridX).toBe(1);
      expect(bob.entity.gridY).toBe(4);
    });

    it('despawns bot when human joins', () => {
      const room = TestRoom.create(GridArenaGame);
      const beforeCount = room.entities.ofType(PlayerEntity).length;
      expect(beforeCount).toBe(4); // 4 bots

      room.addPlayer({ displayName: 'Human' });
      const afterCount = room.entities.ofType(PlayerEntity).length;
      expect(afterCount).toBe(4); // 3 bots + 1 human
    });

    it('removes player entity on leave', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Leaver' });
      const id = player.entity.id;

      room.removePlayer(player.id);
      expect(room.entities.all().find(e => e.id === id)).toBeUndefined();
    });
  });

  describe('entity snapshots', () => {
    it('serializes player schema fields correctly', () => {
      const room = TestRoom.create(GridArenaGame);
      const player = room.addPlayer({ displayName: 'Snapshot' });
      player.entity.gridX = 3;
      player.entity.gridY = 7;
      player.entity.score = 15;

      const snapshot = player.entity.toSnapshot();
      expect(snapshot.gridX).toBe(3);
      expect(snapshot.gridY).toBe(7);
      expect(snapshot.score).toBe(15);
      expect(snapshot.name).toBe('Snapshot');
      expect(snapshot.id).toBeDefined();
    });
  });
});
