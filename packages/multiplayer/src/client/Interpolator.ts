interface Snapshot {
  timestamp: number;
  state: Record<string, number>;
}

export interface InterpolatorOptions {
  bufferMs?: number;       // How far behind real-time to render (default 100ms)
  maxSnapshots?: number;   // Ring buffer size (default 30)
  angleFields?: string[];  // Fields that use shortest-arc lerp
  mode?: 'linear' | 'hermite';  // Interpolation mode (default 'linear')
}

export class Interpolator {
  private snapshots: Snapshot[] = [];
  private bufferMs: number;
  private maxSnapshots: number;
  private angleFields: Set<string>;
  private mode: 'linear' | 'hermite';

  constructor(options: InterpolatorOptions = {}) {
    this.bufferMs = options.bufferMs ?? 100;
    this.maxSnapshots = options.maxSnapshots ?? 30;
    this.angleFields = new Set(options.angleFields ?? []);
    this.mode = options.mode ?? 'linear';
  }

  get snapshotCount(): number {
    return this.snapshots.length;
  }

  pushSnapshot(timestamp: number, state: Record<string, number>): void {
    this.snapshots.push({ timestamp, state: { ...state } });
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  getInterpolated(now: number): Record<string, number> {
    if (this.snapshots.length === 0) return {};

    const renderTime = now - this.bufferMs;

    // Before first snapshot
    if (renderTime <= this.snapshots[0].timestamp) {
      return { ...this.snapshots[0].state };
    }

    // After last snapshot
    if (renderTime >= this.snapshots[this.snapshots.length - 1].timestamp) {
      return { ...this.snapshots[this.snapshots.length - 1].state };
    }

    // Find bounding snapshots
    let i = 0;
    for (; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i + 1].timestamp >= renderTime) break;
    }

    const from = this.snapshots[i];
    const to = this.snapshots[i + 1];
    const range = to.timestamp - from.timestamp;
    const t = range === 0 ? 0 : (renderTime - from.timestamp) / range;

    if (this.mode === 'hermite' && this.snapshots.length >= 2) {
      const prev = i > 0 ? this.snapshots[i - 1] : null;
      const next = i + 2 < this.snapshots.length ? this.snapshots[i + 2] : null;
      return this.hermite(prev, from, to, next, t);
    }

    return this.lerp(from.state, to.state, t);
  }

  private lerp(
    from: Record<string, number>,
    to: Record<string, number>,
    t: number,
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const key of Object.keys(to)) {
      const a = from[key] ?? to[key];
      const b = to[key];

      if (this.angleFields.has(key)) {
        result[key] = this.lerpAngle(a, b, t);
      } else {
        result[key] = a + (b - a) * t;
      }
    }

    return result;
  }

  private hermite(
    prev: Snapshot | null,
    from: Snapshot,
    to: Snapshot,
    next: Snapshot | null,
    t: number,
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const key of Object.keys(to.state)) {
      if (this.angleFields.has(key)) {
        // Fall back to linear for angle fields
        const a = from.state[key] ?? to.state[key];
        result[key] = this.lerpAngle(a, to.state[key], t);
        continue;
      }

      const p0 = from.state[key] ?? 0;
      const p1 = to.state[key] ?? 0;

      // Estimate tangents from neighboring snapshots via finite differences
      const m0 = this.estimateTangent(prev, from, to, key);
      const m1 = this.estimateTangent(from, to, next, key);

      // Cubic Hermite spline:
      // P(t) = (2t³ - 3t² + 1)p0 + (t³ - 2t² + t)m0 + (-2t³ + 3t²)p1 + (t³ - t²)m1
      const t2 = t * t;
      const t3 = t2 * t;

      result[key] =
        (2 * t3 - 3 * t2 + 1) * p0 +
        (t3 - 2 * t2 + t) * m0 +
        (-2 * t3 + 3 * t2) * p1 +
        (t3 - t2) * m1;
    }

    return result;
  }

  private estimateTangent(
    prev: Snapshot | null,
    current: Snapshot,
    next: Snapshot | null,
    key: string,
  ): number {
    if (prev && next) {
      // Central difference
      const dt = next.timestamp - prev.timestamp;
      if (dt === 0) return 0;
      return ((next.state[key] ?? 0) - (prev.state[key] ?? 0)) / dt *
        (current.timestamp - prev.timestamp + (next.timestamp - current.timestamp)) / 2;
    }
    if (next) {
      // Forward difference
      const dt = next.timestamp - current.timestamp;
      if (dt === 0) return 0;
      return (next.state[key] ?? 0) - (current.state[key] ?? 0);
    }
    if (prev) {
      // Backward difference
      const dt = current.timestamp - prev.timestamp;
      if (dt === 0) return 0;
      return (current.state[key] ?? 0) - (prev.state[key] ?? 0);
    }
    return 0;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const TWO_PI = Math.PI * 2;
    let diff = ((b - a) % TWO_PI + TWO_PI + Math.PI) % TWO_PI - Math.PI;
    return a + diff * t;
  }

  reset(): void {
    this.snapshots = [];
  }
}
