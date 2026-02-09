interface Snapshot {
  timestamp: number;
  state: Record<string, number>;
}

/** Velocity fields for physics extrapolation mode. */
export interface PhysicsFieldMapping {
  position: string;    // e.g. 'x'
  velocity: string;    // e.g. 'vx'
  acceleration?: string; // e.g. 'ax' (optional)
}

export interface InterpolatorOptions {
  bufferMs?: number;       // How far behind real-time to render (default 100ms)
  maxSnapshots?: number;   // Ring buffer size (default 30)
  angleFields?: string[];  // Fields that use shortest-arc lerp
  mode?: 'linear' | 'hermite' | 'physics';  // Interpolation mode (default 'linear')
  physicsFields?: PhysicsFieldMapping[];  // Required when mode is 'physics'
}

export class Interpolator {
  private snapshots: Snapshot[] = [];
  private bufferMs: number;
  private maxSnapshots: number;
  private angleFields: Set<string>;
  private mode: 'linear' | 'hermite' | 'physics';
  private physicsFields: PhysicsFieldMapping[];

  constructor(options: InterpolatorOptions = {}) {
    this.bufferMs = options.bufferMs ?? 100;
    this.maxSnapshots = options.maxSnapshots ?? 30;
    this.angleFields = new Set(options.angleFields ?? []);
    this.mode = options.mode ?? 'linear';
    this.physicsFields = options.physicsFields ?? [];
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

    // After last snapshot — physics mode extrapolates, others clamp
    if (renderTime >= this.snapshots[this.snapshots.length - 1].timestamp) {
      if (this.mode === 'physics' && this.physicsFields.length > 0) {
        return this.physicsExtrapolate(this.snapshots[this.snapshots.length - 1], renderTime);
      }
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

    if (this.mode === 'physics' && this.physicsFields.length > 0) {
      return this.physicsInterpolate(from, to, t, renderTime);
    }

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

  /**
   * Physics interpolation: lerp positions, but use velocity to improve
   * the estimate between server snapshots.
   */
  private physicsInterpolate(
    from: Snapshot,
    to: Snapshot,
    t: number,
    renderTime: number,
  ): Record<string, number> {
    const result = this.lerp(from.state, to.state, t);

    // For physics-mapped fields, blend in velocity-based prediction
    const dt = (renderTime - from.timestamp) / 1000;

    for (const mapping of this.physicsFields) {
      const vel = from.state[mapping.velocity] ?? 0;
      const acc = mapping.acceleration ? (from.state[mapping.acceleration] ?? 0) : 0;

      // Kinematic prediction from the "from" snapshot
      const posFrom = from.state[mapping.position] ?? 0;
      const predicted = posFrom + vel * dt + 0.5 * acc * dt * dt;

      // Blend between pure lerp and velocity-based prediction
      // Use t as blend factor: at t=0 we trust velocity more, at t=1 we trust the lerp
      result[mapping.position] = result[mapping.position] * t + predicted * (1 - t);
    }

    return result;
  }

  /**
   * Physics extrapolation: project forward from the latest snapshot
   * using velocity and optional acceleration.
   */
  private physicsExtrapolate(
    latest: Snapshot,
    renderTime: number,
  ): Record<string, number> {
    const result = { ...latest.state };
    const dt = (renderTime - latest.timestamp) / 1000;

    for (const mapping of this.physicsFields) {
      const pos = latest.state[mapping.position] ?? 0;
      const vel = latest.state[mapping.velocity] ?? 0;
      const acc = mapping.acceleration ? (latest.state[mapping.acceleration] ?? 0) : 0;

      result[mapping.position] = pos + vel * dt + 0.5 * acc * dt * dt;
    }

    return result;
  }

  reset(): void {
    this.snapshots = [];
  }
}
