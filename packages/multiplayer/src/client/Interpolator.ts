interface Snapshot {
  timestamp: number;
  state: Record<string, number>;
}

export interface InterpolatorOptions {
  bufferMs?: number;       // How far behind real-time to render (default 100ms)
  maxSnapshots?: number;   // Ring buffer size (default 30)
  angleFields?: string[];  // Fields that use shortest-arc lerp
}

export class Interpolator {
  private snapshots: Snapshot[] = [];
  private bufferMs: number;
  private maxSnapshots: number;
  private angleFields: Set<string>;

  constructor(options: InterpolatorOptions = {}) {
    this.bufferMs = options.bufferMs ?? 100;
    this.maxSnapshots = options.maxSnapshots ?? 30;
    this.angleFields = new Set(options.angleFields ?? []);
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

  private lerpAngle(a: number, b: number, t: number): number {
    const TWO_PI = Math.PI * 2;
    let diff = ((b - a) % TWO_PI + TWO_PI + Math.PI) % TWO_PI - Math.PI;
    return a + diff * t;
  }

  reset(): void {
    this.snapshots = [];
  }
}
