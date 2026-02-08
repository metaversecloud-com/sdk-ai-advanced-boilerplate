import { TopiaCredentials } from '../../src/topia/TopiaCredentials.js';

describe('TopiaCredentials', () => {
  const validParams = new URLSearchParams({
    assetId: 'asset-123',
    displayName: 'Alice',
    identityId: 'ident-456',
    interactiveNonce: 'nonce-789',
    interactivePublicKey: 'pk-abc',
    profileId: 'profile-def',
    sceneDropId: 'scene-ghi',
    uniqueName: 'my-game',
    urlSlug: 'my-world',
    username: 'alice',
    visitorId: '42',
  });

  it('extracts credentials from URL search params', () => {
    const creds = TopiaCredentials.fromURLParams(validParams);

    expect(creds.assetId).toBe('asset-123');
    expect(creds.visitorId).toBe(42);
    expect(creds.urlSlug).toBe('my-world');
    expect(creds.sceneDropId).toBe('scene-ghi');
    expect(creds.displayName).toBe('Alice');
  });

  it('extracts from a full iframe URL', () => {
    const url = 'https://myapp.com/?assetId=a1&visitorId=7&urlSlug=world&interactiveNonce=n&interactivePublicKey=k&sceneDropId=s1&identityId=i1&profileId=p1&uniqueName=u1&username=bob&displayName=Bob';
    const creds = TopiaCredentials.fromURL(url);

    expect(creds.visitorId).toBe(7);
    expect(creds.urlSlug).toBe('world');
    expect(creds.displayName).toBe('Bob');
  });

  it('throws on missing required fields', () => {
    const incomplete = new URLSearchParams({ assetId: 'a1' });
    expect(() => TopiaCredentials.fromURLParams(incomplete)).toThrow(
      /Missing required Topia credential/
    );
  });

  it('extracts from Socket.io auth handshake', () => {
    const auth = {
      assetId: 'asset-123',
      visitorId: '42',
      urlSlug: 'my-world',
      interactiveNonce: 'nonce-789',
      interactivePublicKey: 'pk-abc',
      sceneDropId: 'scene-ghi',
      identityId: 'ident-456',
      profileId: 'profile-def',
      uniqueName: 'my-game',
      username: 'alice',
      displayName: 'Alice',
    };
    const creds = TopiaCredentials.fromSocketAuth(auth);

    expect(creds.visitorId).toBe(42);
    expect(creds.urlSlug).toBe('my-world');
  });
});
