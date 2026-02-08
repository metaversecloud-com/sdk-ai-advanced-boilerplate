import { RoomNaming } from '../../src/topia/RoomNaming.js';

describe('RoomNaming', () => {
  it('generates room ID from game name + sceneDropId', () => {
    const id = RoomNaming.defaultRoomId('wiggle', {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('wiggle:scene-abc-123');
  });

  it('supports custom room ID function', () => {
    const customFn = (topia: { urlSlug: string; sceneDropId: string }) =>
      `${topia.urlSlug}:${topia.sceneDropId}`;

    const id = RoomNaming.resolve('wiggle', customFn, {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('my-world:scene-abc-123');
  });

  it('falls back to default when no custom function', () => {
    const id = RoomNaming.resolve('wiggle', undefined, {
      urlSlug: 'my-world',
      sceneDropId: 'scene-abc-123',
    });

    expect(id).toBe('wiggle:scene-abc-123');
  });
});
