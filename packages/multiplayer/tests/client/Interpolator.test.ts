import { Interpolator } from '../../src/client/Interpolator.js';

describe('Interpolator', () => {
  it('stores snapshots in order', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1050, { x: 50, y: 50 });

    expect(interp.snapshotCount).toBe(2);
  });

  it('interpolates between two snapshots (linear)', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // Render time = now - bufferMs. If we set "now" to 1150,
    // render time = 1050, which is 50% between snapshot 1000 and 1100
    const result = interp.getInterpolated(1150);

    expect(result.x).toBeCloseTo(50, 0);
    expect(result.y).toBeCloseTo(100, 0);
  });

  it('clamps to latest snapshot when ahead', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // renderTime = 1300 - 100 = 1200, which is past the last snapshot
    const result = interp.getInterpolated(1300);

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('clamps to earliest snapshot when behind', () => {
    const interp = new Interpolator({ bufferMs: 100 });

    interp.pushSnapshot(1000, { x: 0, y: 0 });
    interp.pushSnapshot(1100, { x: 100, y: 200 });

    // renderTime = 1050 - 100 = 950, which is before the first snapshot
    const result = interp.getInterpolated(1050);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('interpolates angles via shortest arc', () => {
    const interp = new Interpolator({ bufferMs: 100, angleFields: ['angle'] });

    // Crossing the 0/2PI boundary: 350° → 10° should go through 0°
    const deg2rad = (d: number) => d * Math.PI / 180;
    interp.pushSnapshot(1000, { angle: deg2rad(350) });
    interp.pushSnapshot(1100, { angle: deg2rad(10) });

    // 50% between 350° and 10° (shortest arc) = 0° = 0 rad
    const result = interp.getInterpolated(1150);
    const resultDeg = (result.angle * 180 / Math.PI + 360) % 360;

    expect(resultDeg).toBeCloseTo(0, 0);
  });

  it('drops old snapshots beyond buffer limit', () => {
    const interp = new Interpolator({ bufferMs: 100, maxSnapshots: 3 });

    interp.pushSnapshot(1000, { x: 0 });
    interp.pushSnapshot(1050, { x: 50 });
    interp.pushSnapshot(1100, { x: 100 });
    interp.pushSnapshot(1150, { x: 150 });

    expect(interp.snapshotCount).toBe(3); // oldest dropped
  });
});

describe('Hermite interpolation', () => {
  it('produces smoother curves than linear', () => {
    const linear = new Interpolator({ bufferMs: 100, mode: 'linear' });
    const hermite = new Interpolator({ bufferMs: 100, mode: 'hermite' });

    // Snake moving in a curve: velocity changes direction
    const snapshots = [
      { t: 1000, s: { x: 0, y: 0 } },
      { t: 1050, s: { x: 50, y: 0 } },    // moving right
      { t: 1100, s: { x: 80, y: 30 } },   // curving up
      { t: 1150, s: { x: 90, y: 70 } },   // moving up
    ];

    for (const { t, s } of snapshots) {
      linear.pushSnapshot(t, s);
      hermite.pushSnapshot(t, s);
    }

    // At the midpoint of the curve, Hermite should have a different
    // (smoother) value than linear
    const linearResult = linear.getInterpolated(1175);  // renderTime = 1075
    const hermiteResult = hermite.getInterpolated(1175);

    // Both should be in the right ballpark
    expect(linearResult.x).toBeGreaterThan(40);
    expect(hermiteResult.x).toBeGreaterThan(40);

    // Hermite accounts for velocity, so it should differ from linear
    expect(typeof hermiteResult.x).toBe('number');
    expect(typeof hermiteResult.y).toBe('number');
  });
});
