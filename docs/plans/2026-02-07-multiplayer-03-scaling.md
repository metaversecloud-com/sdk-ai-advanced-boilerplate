> **Part of**: [@topia/multiplayer Implementation Plan](./2026-02-07-multiplayer-00-overview.md)
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 3: Scaling + Second Game

> Prove the framework generalizes beyond Wiggle. Add Redis scaling, build a grid-based game, add dev tooling.

### Task 21: Redis Adapter Integration

**Files:**
- Create: `packages/multiplayer/src/core/RedisAdapter.ts`
- Create: `packages/multiplayer/tests/core/RedisAdapter.test.ts`

Implement the Redis room registry and Socket.io adapter configuration. The adapter is opt-in — if `REDIS_URL` is not set, fall back to in-memory mode. Key behaviors:
- Room registry in Redis (which process owns which room)
- Heartbeat for process liveness (5s timeout)
- State checkpoints every 30s
- `@socket.io/redis-adapter` for cross-process message routing

**Testing note:** Use `ioredis-mock` for unit tests. Integration tests require a real Redis (mark with `@integration` tag, skip in CI unless Redis is available).

**Commit message:** `feat(multiplayer): add Redis adapter for horizontal scaling`

---

### Task 22: Graceful Failover + Reconnection

**Files:**
- Create: `packages/multiplayer/src/core/FailoverManager.ts`
- Create: `packages/multiplayer/tests/core/FailoverManager.test.ts`

Implement:
- Process heartbeat via Redis `SET` with TTL
- Orphan detection on heartbeat timeout
- Room state checkpoint loading
- Client-side auto-reconnect (Socket.io handles this, but we need to re-subscribe to room state)

**Commit message:** `feat(multiplayer): add graceful failover with Redis state checkpoints`

---

### Task 23: Event-Driven Mode (tickRate 0)

**Files:**
- Modify: `packages/multiplayer/src/core/TopiaRoom.ts`
- Create: `packages/multiplayer/tests/core/TopiaRoom.eventDriven.test.ts`

When `tickRate: 0`, the room does NOT run a setInterval game loop. Instead, game state only updates when an input is received. This is critical for grid-based games where nothing happens between player actions.

**Step 1: Write failing test**

```typescript
describe('Event-driven room (tickRate 0)', () => {
  it('does not call onTick automatically', () => {
    const tickFn = jest.fn();
    const game = TopiaGame.define({ name: 'grid', tickRate: 0, onTick: tickFn });
    const room = TestRoom.create(game);

    // Even after simulated time passes, onTick should not be called
    // (TestRoom.tick() is manual anyway, but verify the config is stored)
    expect(game.tickRate).toBe(0);
  });

  it('processes input immediately', () => {
    // Grid game: input moves piece, state updates, response sent
    // No tick needed
  });
});
```

**Commit message:** `feat(multiplayer): support event-driven mode (tickRate 0) for grid-based games`

---

### Task 24: Second Game — Grid Arena

**Files:**
- Create: `packages/multiplayer/examples/grid-arena/server/grid-arena-game.ts`
- Create: `packages/multiplayer/examples/grid-arena/server/entities/PlayerEntity.ts`
- Create: `packages/multiplayer/examples/grid-arena/server/entities/GemEntity.ts`
- Create: `packages/multiplayer/examples/grid-arena/tests/grid-arena.test.ts`

A simple grid-based multiplayer game: players move on a grid, collect gems, avoid traps. Validates that the framework works for discrete-move games (not just continuous movement).

Key differences from Wiggle:
- `tickRate: 0` — event-driven
- `interpolate: false` on client — snap positions
- Input is `{ action: 'move', direction: 'north' }` not `{ angle: 1.5 }`
- Grid collision uses coordinate matching, not distance

**Commit message:** `feat(multiplayer): add Grid Arena example game validating event-driven mode`

---

### Task 25: Game Inspector Dev Tool (Server)

**Files:**
- Create: `packages/multiplayer/src/dev/InspectorServer.ts`
- Create: `packages/multiplayer/src/dev/InspectorAPI.ts`

A dev-only HTTP + WebSocket server on a separate port (default 3002) that exposes:
- `GET /rooms` — list of active rooms with player counts
- `GET /rooms/:id/entities` — entity list with schema values
- `GET /rooms/:id/stats` — tick timing, network bytes, interpolation health
- WebSocket `/rooms/:id/stream` — real-time entity updates for the inspector UI

Tree-shaken from production builds via `process.env.NODE_ENV` check.

**Commit message:** `feat(multiplayer): add game inspector dev server`

---

### Task 26: Game Inspector Dev Tool (Client UI)

**Files:**
- Create: `packages/multiplayer/src/dev/inspector-ui/` (standalone Vite app)

A browser-based React app served at `localhost:3002` that visualizes:
- Room list with player count badges
- Entity table with live-updating schema values
- Network stats graph (bytes/sec, packet loss)
- Tick timeline (server tick duration vs target)
- Slow-mo slider and step-by-step tick button

This is a nice-to-have for Phase 3 — if time is short, defer to Phase 4.

**Commit message:** `feat(multiplayer): add game inspector browser UI`

---

### Task 27: Prometheus Metrics

**Files:**
- Create: `packages/multiplayer/src/core/Metrics.ts`
- Create: `packages/multiplayer/tests/core/Metrics.test.ts`

Expose Prometheus-compatible metrics at `/metrics` on the game server:
- `topia_mp_rooms_active` — gauge
- `topia_mp_players_connected` — gauge
- `topia_mp_tick_duration_ms` — histogram per game type
- `topia_mp_network_bytes_out` — counter per room
- `topia_mp_redis_latency_ms` — histogram

Use `prom-client` library. Metrics are opt-in via config.

**Commit message:** `feat(multiplayer): add Prometheus metrics endpoint`

---

### Task 28: Phase 3 Integration Test

**Files:**
- Create: `packages/multiplayer/tests/integration/full-lifecycle.test.ts`

End-to-end test that:
1. Creates a TopiaGameServer with the Wiggle game
2. Connects 3 simulated clients
3. Sends input from each
4. Verifies state sync to all clients
5. Disconnects one client
6. Verifies cleanup

Uses real Colyseus transport (localhost) but no Redis.

**Commit message:** `test(multiplayer): add full lifecycle integration test`

---

