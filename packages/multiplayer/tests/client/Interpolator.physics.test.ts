import { Interpolator } from '../../src/client/Interpolator.js';

describe('Physics interpolation mode', () => {
  it('extrapolates past the last snapshot using velocity', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
        { position: 'y', velocity: 'vy' },
      ],
    });

    // Object at (100, 200) moving at vx=50/s, vy=-30/s
    interp.pushSnapshot(1000, { x: 100, y: 200, vx: 50, vy: -30 });

    // 500ms later: should extrapolate
    const result = interp.getInterpolated(1500);

    // x: 100 + 50 * 0.5 = 125
    expect(result.x).toBeCloseTo(125, 0);
    // y: 200 + (-30) * 0.5 = 185
    expect(result.y).toBeCloseTo(185, 0);
  });

  it('extrapolates with acceleration', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'y', velocity: 'vy', acceleration: 'ay' },
      ],
    });

    // Object at y=0, velocity=0, accelerating down at 100/s²
    interp.pushSnapshot(1000, { y: 0, vy: 0, ay: 100 });

    // 1s later: y = 0 + 0*1 + 0.5*100*1² = 50
    const result = interp.getInterpolated(2000);
    expect(result.y).toBeCloseTo(50, 0);
  });

  it('interpolates between two snapshots using physics blend', () => {
    const interp = new Interpolator({
      bufferMs: 100,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    // Two snapshots 100ms apart
    interp.pushSnapshot(1000, { x: 0, vx: 100 });   // moving right at 100/s
    interp.pushSnapshot(1100, { x: 10, vx: 100 });   // 10 units later

    // renderTime = 1150 - 100 = 1050 (50% between snapshots)
    const result = interp.getInterpolated(1150);

    // Should be between 0 and 10, influenced by velocity
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThan(15);
  });

  it('falls back to clamping for non-physics fields', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    interp.pushSnapshot(1000, { x: 100, vx: 50, score: 10 });

    // score has no physics mapping — should stay at the snapshot value
    const result = interp.getInterpolated(1500);
    expect(result.score).toBe(10);
    // x should extrapolate
    expect(result.x).toBeCloseTo(125, 0);
  });

  it('handles zero velocity (stationary object)', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    interp.pushSnapshot(1000, { x: 50, vx: 0 });

    const result = interp.getInterpolated(2000);
    expect(result.x).toBeCloseTo(50, 0);
  });

  it('handles missing velocity field gracefully', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    // Snapshot has x but no vx
    interp.pushSnapshot(1000, { x: 50 });

    const result = interp.getInterpolated(2000);
    // With no velocity, position stays put
    expect(result.x).toBeCloseTo(50, 0);
  });

  it('works with bufferMs delay', () => {
    const interp = new Interpolator({
      bufferMs: 200,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    interp.pushSnapshot(1000, { x: 0, vx: 100 });

    // now=1300, renderTime=1100, 100ms past snapshot → extrapolate
    const result = interp.getInterpolated(1300);
    // x = 0 + 100 * 0.1 = 10
    expect(result.x).toBeCloseTo(10, 0);
  });

  it('blends correctly at snapshot boundaries during interpolation', () => {
    const interp = new Interpolator({
      bufferMs: 100,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
      ],
    });

    interp.pushSnapshot(1000, { x: 0, vx: 200 });
    interp.pushSnapshot(1100, { x: 20, vx: 200 });

    // At t=0 (renderTime = 1000), should be exactly at from snapshot
    const atFrom = interp.getInterpolated(1100);
    expect(atFrom.x).toBeCloseTo(0, 0);

    // At t=1 (renderTime = 1100), should be close to the "to" snapshot
    const atTo = interp.getInterpolated(1200);
    expect(atTo.x).toBeCloseTo(20, 0);
  });

  it('multiple physics fields work independently', () => {
    const interp = new Interpolator({
      bufferMs: 0,
      mode: 'physics',
      physicsFields: [
        { position: 'x', velocity: 'vx' },
        { position: 'y', velocity: 'vy', acceleration: 'ay' },
      ],
    });

    interp.pushSnapshot(1000, { x: 0, y: 0, vx: 100, vy: 0, ay: -200 });

    // 1s later
    const result = interp.getInterpolated(2000);

    // x = 0 + 100*1 = 100
    expect(result.x).toBeCloseTo(100, 0);
    // y = 0 + 0*1 + 0.5*(-200)*1 = -100
    expect(result.y).toBeCloseTo(-100, 0);
  });
});
