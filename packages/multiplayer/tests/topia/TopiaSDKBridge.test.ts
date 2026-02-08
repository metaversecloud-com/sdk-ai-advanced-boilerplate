import { TopiaSDKBridge } from '../../src/topia/TopiaSDKBridge.js';

describe('TopiaSDKBridge', () => {
  it('creates bridge with credentials', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    expect(bridge.urlSlug).toBe('my-world');
  });

  it('defer queues SDK calls without blocking', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    let executed = false;
    bridge.defer(async () => {
      executed = true;
    });

    // Should not execute synchronously
    expect(executed).toBe(false);
  });

  it('tracks deferred calls for testing', () => {
    const bridge = new TopiaSDKBridge({
      urlSlug: 'my-world',
      interactiveKey: 'test-key',
      interactiveSecret: 'test-secret',
    });

    bridge.deferTracked('grantBadge', ['speed-demon']);
    bridge.deferTracked('updateLeaderboard', ['high-scores', { visitorId: 42, score: 100 }]);

    expect(bridge.tracked).toHaveLength(2);
    expect(bridge.tracked[0]).toEqual({ method: 'grantBadge', args: ['speed-demon'] });
  });
});
