import { SpectatorManager } from '../../src/game/SpectatorManager.js';

describe('SpectatorManager', () => {
  it('adds spectators', () => {
    const manager = new SpectatorManager();
    manager.add({ id: 's1', topia: { visitorId: 1, displayName: 'Alice' } as any });

    expect(manager.count).toBe(1);
  });

  it('removes spectators', () => {
    const manager = new SpectatorManager();
    manager.add({ id: 's1', topia: { visitorId: 1, displayName: 'Alice' } as any });
    manager.remove('s1');

    expect(manager.count).toBe(0);
  });

  it('determines if visitor should spectate based on zone mode', () => {
    const manager = new SpectatorManager({ mode: 'zone', playZone: 'arena' });

    expect(manager.shouldSpectate(['lobby', 'entrance'])).toBe(true);
    expect(manager.shouldSpectate(['arena'])).toBe(false);
    expect(manager.shouldSpectate(['arena', 'lobby'])).toBe(false);
  });

  it('spectates on overflow when max players reached', () => {
    const manager = new SpectatorManager({ mode: 'overflow', maxPlayers: 2 });

    expect(manager.shouldSpectateOverflow(1)).toBe(false);
    expect(manager.shouldSpectateOverflow(2)).toBe(true);
    expect(manager.shouldSpectateOverflow(3)).toBe(true);
  });
});
