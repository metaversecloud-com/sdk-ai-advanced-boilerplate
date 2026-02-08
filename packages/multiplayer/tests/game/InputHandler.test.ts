import { InputHandler } from '../../src/game/InputHandler.js';

describe('InputHandler', () => {
  it('assigns incrementing sequence numbers', () => {
    const handler = new InputHandler();

    const p1 = handler.package({ angle: 1.5 });
    const p2 = handler.package({ angle: 2.0 });

    expect(p1.seq).toBe(1);
    expect(p2.seq).toBe(2);
  });

  it('attaches timestamp to each input', () => {
    const handler = new InputHandler();
    const before = Date.now();
    const pkg = handler.package({ angle: 1.5 });
    const after = Date.now();

    expect(pkg.timestamp).toBeGreaterThanOrEqual(before);
    expect(pkg.timestamp).toBeLessThanOrEqual(after);
  });

  it('wraps the input payload', () => {
    const handler = new InputHandler();
    const pkg = handler.package({ angle: 1.5, boost: true });

    expect(pkg.input).toEqual({ angle: 1.5, boost: true });
  });

  it('tracks unconfirmed inputs', () => {
    const handler = new InputHandler();

    handler.package({ angle: 1.0 });
    handler.package({ angle: 2.0 });
    handler.package({ angle: 3.0 });

    expect(handler.unconfirmed).toHaveLength(3);

    handler.confirmUpTo(2);

    expect(handler.unconfirmed).toHaveLength(1);
    expect(handler.unconfirmed[0].seq).toBe(3);
  });
});
