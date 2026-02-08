import { DeferQueue } from '../../src/topia/DeferQueue.js';

describe('DeferQueue', () => {
  it('queues and executes deferred functions', async () => {
    const queue = new DeferQueue();
    const results: string[] = [];

    queue.defer(async () => { results.push('a'); });
    queue.defer(async () => { results.push('b'); });

    await queue.flush();

    expect(results).toEqual(['a', 'b']);
  });

  it('does not block the caller', () => {
    const queue = new DeferQueue();
    let executed = false;

    queue.defer(async () => {
      await new Promise(r => setTimeout(r, 50));
      executed = true;
    });

    // Should return immediately, not wait for the deferred fn
    expect(executed).toBe(false);
  });

  it('retries failed calls with backoff', async () => {
    const queue = new DeferQueue({ maxRetries: 2, baseDelayMs: 10 });
    let attempts = 0;

    queue.defer(async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
    });

    await queue.flush();
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it('logs and drops after max retries', async () => {
    const errors: Error[] = [];
    const queue = new DeferQueue({
      maxRetries: 1,
      baseDelayMs: 10,
      onError: (err) => errors.push(err),
    });

    queue.defer(async () => { throw new Error('permanent'); });

    await queue.flush();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('permanent');
  });

  it('tracks deferred calls for testing', () => {
    const queue = new DeferQueue();

    queue.deferTracked('grantBadge', ['wiggle-champion']);
    queue.deferTracked('triggerParticle', [{ name: 'firework', duration: 3000 }]);

    expect(queue.tracked).toEqual([
      { method: 'grantBadge', args: ['wiggle-champion'] },
      { method: 'triggerParticle', args: [{ name: 'firework', duration: 3000 }] },
    ]);
  });
});
