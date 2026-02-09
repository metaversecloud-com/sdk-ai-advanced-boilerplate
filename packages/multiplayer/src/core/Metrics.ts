/**
 * Prometheus-compatible metrics for @topia/multiplayer.
 *
 * Opt-in via config — if not enabled, all methods are no-ops.
 * Exposes a `/metrics` text endpoint for Prometheus scraping.
 *
 * Metrics:
 *   topia_mp_rooms_active          — gauge
 *   topia_mp_players_connected     — gauge
 *   topia_mp_tick_duration_ms      — histogram per game type
 *   topia_mp_network_bytes_out     — counter per room
 *   topia_mp_redis_latency_ms      — histogram
 */

export interface MetricsOptions {
  /** Enable metrics collection. Default: false */
  enabled?: boolean;
  /** Custom metric prefix. Default: 'topia_mp' */
  prefix?: string;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface Histogram {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

const DEFAULT_TICK_BUCKETS = [1, 2, 5, 10, 16, 33, 50, 100];
const DEFAULT_REDIS_BUCKETS = [0.5, 1, 2, 5, 10, 25, 50, 100];

export class Metrics {
  private _enabled: boolean;
  private prefix: string;

  // Gauges
  private _roomsActive = 0;
  private _playersConnected = 0;

  // Histograms (per game type)
  private tickHistograms: Map<string, Histogram> = new Map();
  private redisHistogram: Histogram;

  // Counters (per room)
  private networkBytesOut: Map<string, number> = new Map();

  constructor(options: MetricsOptions = {}) {
    this._enabled = options.enabled ?? false;
    this.prefix = options.prefix ?? 'topia_mp';
    this.redisHistogram = createHistogram(DEFAULT_REDIS_BUCKETS);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  // --- Gauges ---

  get roomsActive(): number {
    return this._roomsActive;
  }

  set roomsActive(value: number) {
    this._roomsActive = value;
  }

  incRooms(): void {
    if (!this._enabled) return;
    this._roomsActive++;
  }

  decRooms(): void {
    if (!this._enabled) return;
    this._roomsActive = Math.max(0, this._roomsActive - 1);
  }

  get playersConnected(): number {
    return this._playersConnected;
  }

  set playersConnected(value: number) {
    this._playersConnected = value;
  }

  incPlayers(): void {
    if (!this._enabled) return;
    this._playersConnected++;
  }

  decPlayers(): void {
    if (!this._enabled) return;
    this._playersConnected = Math.max(0, this._playersConnected - 1);
  }

  // --- Histograms ---

  observeTickDuration(gameName: string, durationMs: number): void {
    if (!this._enabled) return;
    if (!this.tickHistograms.has(gameName)) {
      this.tickHistograms.set(gameName, createHistogram(DEFAULT_TICK_BUCKETS));
    }
    observeHistogram(this.tickHistograms.get(gameName)!, durationMs);
  }

  observeRedisLatency(durationMs: number): void {
    if (!this._enabled) return;
    observeHistogram(this.redisHistogram, durationMs);
  }

  // --- Counters ---

  addNetworkBytesOut(roomId: string, bytes: number): void {
    if (!this._enabled) return;
    this.networkBytesOut.set(roomId, (this.networkBytesOut.get(roomId) ?? 0) + bytes);
  }

  getNetworkBytesOut(roomId: string): number {
    return this.networkBytesOut.get(roomId) ?? 0;
  }

  // --- Export ---

  /**
   * Render all metrics in Prometheus text exposition format.
   */
  toPrometheus(): string {
    if (!this._enabled) return '';

    const lines: string[] = [];
    const p = this.prefix;

    // Gauges
    lines.push(`# HELP ${p}_rooms_active Number of active game rooms`);
    lines.push(`# TYPE ${p}_rooms_active gauge`);
    lines.push(`${p}_rooms_active ${this._roomsActive}`);

    lines.push(`# HELP ${p}_players_connected Number of connected players`);
    lines.push(`# TYPE ${p}_players_connected gauge`);
    lines.push(`${p}_players_connected ${this._playersConnected}`);

    // Tick duration histograms
    lines.push(`# HELP ${p}_tick_duration_ms Server tick duration in milliseconds`);
    lines.push(`# TYPE ${p}_tick_duration_ms histogram`);
    for (const [gameName, histogram] of this.tickHistograms) {
      for (const bucket of histogram.buckets) {
        lines.push(`${p}_tick_duration_ms_bucket{game="${gameName}",le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`${p}_tick_duration_ms_bucket{game="${gameName}",le="+Inf"} ${histogram.count}`);
      lines.push(`${p}_tick_duration_ms_sum{game="${gameName}"} ${histogram.sum}`);
      lines.push(`${p}_tick_duration_ms_count{game="${gameName}"} ${histogram.count}`);
    }

    // Network bytes counter
    lines.push(`# HELP ${p}_network_bytes_out Total bytes sent per room`);
    lines.push(`# TYPE ${p}_network_bytes_out counter`);
    for (const [roomId, bytes] of this.networkBytesOut) {
      lines.push(`${p}_network_bytes_out{room="${roomId}"} ${bytes}`);
    }

    // Redis latency histogram
    lines.push(`# HELP ${p}_redis_latency_ms Redis operation latency in milliseconds`);
    lines.push(`# TYPE ${p}_redis_latency_ms histogram`);
    for (const bucket of this.redisHistogram.buckets) {
      lines.push(`${p}_redis_latency_ms_bucket{le="${bucket.le}"} ${bucket.count}`);
    }
    lines.push(`${p}_redis_latency_ms_bucket{le="+Inf"} ${this.redisHistogram.count}`);
    lines.push(`${p}_redis_latency_ms_sum ${this.redisHistogram.sum}`);
    lines.push(`${p}_redis_latency_ms_count ${this.redisHistogram.count}`);

    return lines.join('\n') + '\n';
  }

  /** Reset all metrics (useful in tests). */
  reset(): void {
    this._roomsActive = 0;
    this._playersConnected = 0;
    this.tickHistograms.clear();
    this.redisHistogram = createHistogram(DEFAULT_REDIS_BUCKETS);
    this.networkBytesOut.clear();
  }
}

function createHistogram(buckets: number[]): Histogram {
  return {
    buckets: buckets.map(le => ({ le, count: 0 })),
    sum: 0,
    count: 0,
  };
}

function observeHistogram(histogram: Histogram, value: number): void {
  histogram.count++;
  histogram.sum += value;
  for (const bucket of histogram.buckets) {
    if (value <= bucket.le) {
      bucket.count++;
    }
  }
}
