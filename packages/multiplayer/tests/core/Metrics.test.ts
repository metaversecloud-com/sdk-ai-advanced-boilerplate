import { Metrics } from '../../src/core/Metrics.js';

describe('Metrics', () => {
  describe('disabled mode', () => {
    it('is disabled by default', () => {
      const m = new Metrics();
      expect(m.enabled).toBe(false);
    });

    it('operations are no-ops when disabled', () => {
      const m = new Metrics();
      m.incRooms();
      m.incPlayers();
      m.observeTickDuration('wiggle', 5);
      m.observeRedisLatency(2);
      m.addNetworkBytesOut('room-1', 1024);

      expect(m.roomsActive).toBe(0);
      expect(m.playersConnected).toBe(0);
      expect(m.getNetworkBytesOut('room-1')).toBe(0);
      expect(m.toPrometheus()).toBe('');
    });
  });

  describe('gauges', () => {
    it('tracks rooms active', () => {
      const m = new Metrics({ enabled: true });
      m.incRooms();
      m.incRooms();
      expect(m.roomsActive).toBe(2);

      m.decRooms();
      expect(m.roomsActive).toBe(1);
    });

    it('tracks players connected', () => {
      const m = new Metrics({ enabled: true });
      m.incPlayers();
      m.incPlayers();
      m.incPlayers();
      expect(m.playersConnected).toBe(3);

      m.decPlayers();
      expect(m.playersConnected).toBe(2);
    });

    it('does not go below zero', () => {
      const m = new Metrics({ enabled: true });
      m.decRooms();
      m.decPlayers();
      expect(m.roomsActive).toBe(0);
      expect(m.playersConnected).toBe(0);
    });
  });

  describe('histograms', () => {
    it('observes tick durations per game', () => {
      const m = new Metrics({ enabled: true });
      m.observeTickDuration('wiggle', 2);
      m.observeTickDuration('wiggle', 8);
      m.observeTickDuration('grid-arena', 1);

      const output = m.toPrometheus();
      expect(output).toContain('topia_mp_tick_duration_ms_count{game="wiggle"} 2');
      expect(output).toContain('topia_mp_tick_duration_ms_sum{game="wiggle"} 10');
      expect(output).toContain('topia_mp_tick_duration_ms_count{game="grid-arena"} 1');
    });

    it('populates histogram buckets correctly', () => {
      const m = new Metrics({ enabled: true });
      m.observeTickDuration('wiggle', 3); // fits in le=5, 10, 16, 33, 50, 100
      m.observeTickDuration('wiggle', 12); // fits in le=16, 33, 50, 100

      const output = m.toPrometheus();
      // Bucket le=5 should have 1 (only the 3ms observation)
      expect(output).toContain('topia_mp_tick_duration_ms_bucket{game="wiggle",le="5"} 1');
      // Bucket le=16 should have 2 (both observations)
      expect(output).toContain('topia_mp_tick_duration_ms_bucket{game="wiggle",le="16"} 2');
    });

    it('observes Redis latency', () => {
      const m = new Metrics({ enabled: true });
      m.observeRedisLatency(0.3);
      m.observeRedisLatency(1.5);

      const output = m.toPrometheus();
      expect(output).toContain('topia_mp_redis_latency_ms_count 2');
      expect(output).toContain('topia_mp_redis_latency_ms_sum 1.8');
    });
  });

  describe('counters', () => {
    it('tracks network bytes out per room', () => {
      const m = new Metrics({ enabled: true });
      m.addNetworkBytesOut('room-1', 512);
      m.addNetworkBytesOut('room-1', 256);
      m.addNetworkBytesOut('room-2', 1024);

      expect(m.getNetworkBytesOut('room-1')).toBe(768);
      expect(m.getNetworkBytesOut('room-2')).toBe(1024);
      expect(m.getNetworkBytesOut('nonexistent')).toBe(0);

      const output = m.toPrometheus();
      expect(output).toContain('topia_mp_network_bytes_out{room="room-1"} 768');
      expect(output).toContain('topia_mp_network_bytes_out{room="room-2"} 1024');
    });
  });

  describe('Prometheus output format', () => {
    it('generates valid Prometheus exposition format', () => {
      const m = new Metrics({ enabled: true });
      m.incRooms();
      m.incPlayers();
      m.observeTickDuration('wiggle', 5);

      const output = m.toPrometheus();

      // Verify structure
      expect(output).toContain('# HELP topia_mp_rooms_active');
      expect(output).toContain('# TYPE topia_mp_rooms_active gauge');
      expect(output).toContain('topia_mp_rooms_active 1');

      expect(output).toContain('# HELP topia_mp_players_connected');
      expect(output).toContain('# TYPE topia_mp_players_connected gauge');
      expect(output).toContain('topia_mp_players_connected 1');

      expect(output).toContain('# TYPE topia_mp_tick_duration_ms histogram');
      expect(output).toContain('# TYPE topia_mp_network_bytes_out counter');
      expect(output).toContain('# TYPE topia_mp_redis_latency_ms histogram');

      // Ends with newline
      expect(output.endsWith('\n')).toBe(true);
    });

    it('supports custom prefix', () => {
      const m = new Metrics({ enabled: true, prefix: 'myapp' });
      m.incRooms();

      const output = m.toPrometheus();
      expect(output).toContain('myapp_rooms_active 1');
      expect(output).not.toContain('topia_mp');
    });
  });

  describe('reset', () => {
    it('resets all metrics to zero', () => {
      const m = new Metrics({ enabled: true });
      m.incRooms();
      m.incPlayers();
      m.observeTickDuration('wiggle', 5);
      m.addNetworkBytesOut('room-1', 100);
      m.observeRedisLatency(1);

      m.reset();

      expect(m.roomsActive).toBe(0);
      expect(m.playersConnected).toBe(0);
      expect(m.getNetworkBytesOut('room-1')).toBe(0);

      // Output should only have structure, no data
      const output = m.toPrometheus();
      expect(output).toContain('topia_mp_rooms_active 0');
      expect(output).toContain('topia_mp_players_connected 0');
      expect(output).not.toContain('game="wiggle"');
    });
  });
});
