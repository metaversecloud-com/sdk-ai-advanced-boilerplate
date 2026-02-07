# SDK Tic-Tac-Toe

**Repo**: [metaversecloud-com/sdk-tictactoe](https://github.com/metaversecloud-com/sdk-tictactoe)
**SDK Version**: `@rtsdk/topia@^0.15.8`
**Quality**: Medium — clean turn-based game with dual-layer analytics, but no tests, tight coupling, and hardcoded cooldowns
**Last Analyzed**: 2026-02-07

## What It Does

A two-player tic-tac-toe game rendered on-canvas using dropped assets. Players select a side (X or O), take turns clicking cells, and compete to get 3 in a row. Win detection checks 8 combinations (3 rows, 3 columns, 2 diagonals). Features dual-layer analytics tracking both per-game state and aggregate world statistics, with atomic counter increments for world-level stats.

### Game Mechanics

- 3x3 grid of clickable cell assets with webhook handlers
- 8 winning combinations checked after each move
- Finish line drawn across winning cells on victory
- Particle effects on win
- Activity broadcast (GAME_ON / GAME_WAITING) for world awareness
- 5-minute cooldown before non-player/non-admin reset

## Architecture

```
src/
├── controllers/
│   ├── handleSelectPlayer.ts     Join as X or O
│   ├── handleClickCell.ts        Place mark, check win, update analytics
│   └── handleReset.ts            Clear board, reset state
├── utils/
│   ├── topiaInit.ts              SDK factory exports
│   ├── checkWin.ts               8-combo win detection
│   └── drawFinishLine.ts         Drop line asset across winning cells
├── types/
│   └── gameTypes.ts              Game state and analytics interfaces
└── routes.ts                     3 endpoints
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/select-player/:side` | Join as X or O |
| POST | `/api/click/:cell` | Place mark on cell (0-8), validate turn, check win |
| POST | `/api/reset` | Reset board (admin anytime, players after 5min) |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch key asset for game state |
| `droppedAsset.updateDataObject(data, { lock, analytics })` | Game state mutations with analytics piggyback |
| `World.create(urlSlug, { credentials })` | World instance |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Remove marks and finish line on reset |
| `world.triggerParticle({ name, duration })` | Celebration on win |
| `world.triggerActivity({ type, assetId })` | GAME_ON / GAME_WAITING broadcast |
| `world.incrementDataObjectValue(path, amount, options)` | Atomic counter increment for aggregate stats |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Identify player, admin check |
| `visitor.triggerParticle({ name, duration })` | Winner-specific particle effect |

## Key Patterns

### 1. Optimistic Locking with 409 Conflict Response

Uses optimistic locking that returns a 409 status on conflicts, letting the client retry:

```ts
try {
  await keyAsset.updateDataObject(
    { ...updatedState, turnCount: turnCount + 1 },
    { lock: { lockId: `${keyAssetId}-${resetCount}-${turnCount}`, releaseLock: true } }
  );
} catch (error) {
  if (error.status === 409) {
    return res.status(409).json({
      success: false,
      message: "Another move was made simultaneously. Please try again.",
    });
  }
  throw error;
}
```

### 2. Dual-Layer Analytics (Game State + Aggregate World Stats)

Tracks analytics at two levels: per-game state on the dropped asset, and aggregate statistics on the world data object using atomic increments:

```ts
// Layer 1: Per-game analytics on dropped asset (via analytics option)
await keyAsset.updateDataObject(
  { board, lastPlayerTurn: currentSide, turnCount: turnCount + 1 },
  {
    lock: { lockId, releaseLock: true },
    analytics: [{ analyticName: "moves", urlSlug, uniqueKey: visitorId }],
  }
);

// Layer 2: Aggregate world stats via atomic increment
if (isGameOver) {
  await world.incrementDataObjectValue(
    `stats.totalGamesPlayed`, 1, {}
  );
  await world.incrementDataObjectValue(
    `stats.${winner === "X" ? "xWins" : "oWins"}`, 1, {}
  );
}
```

### 3. Atomic Counter Increments via incrementDataObjectValue

Uses the SDK's atomic increment to avoid read-modify-write race conditions on aggregate counters:

```ts
// No need to read current value — atomic server-side increment
await world.incrementDataObjectValue("stats.totalGamesPlayed", 1, {});
await world.incrementDataObjectValue("stats.totalMoves", moveCount, {});

// Also tracks per-player stats
await world.incrementDataObjectValue(
  `playerStats.${visitorId}.gamesPlayed`, 1, {}
);
```

### 4. Finish Line Drawing on Win

Drops a line asset across the three winning cells to visually indicate the win:

```ts
function drawFinishLine(winCombo: number[], cellPositions: Position[], boardOrigin: Position) {
  const startCell = cellPositions[winCombo[0]];
  const endCell = cellPositions[winCombo[2]];

  const midX = (startCell.x + endCell.x) / 2 + boardOrigin.x;
  const midY = (startCell.y + endCell.y) / 2 + boardOrigin.y;

  // Calculate rotation angle based on line direction
  const angle = Math.atan2(endCell.y - startCell.y, endCell.x - startCell.x);

  return DroppedAsset.drop({
    position: { x: midX, y: midY },
    rotation: angle * (180 / Math.PI),
    uniqueName: "finishLine",
    // ... asset config
  });
}
```

### 5. Win Detection (8 Combinations)

Simple constant-time check against all possible winning lines:

```ts
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Columns
  [0, 4, 8], [2, 4, 6],              // Diagonals
];

function checkWin(claimedCells: number[]): number[] | null {
  if (claimedCells.length < 3) return null;
  return WIN_COMBOS.find(combo =>
    combo.every(cell => claimedCells.includes(cell))
  ) || null;
}
```

## Data Structure

```ts
// Dropped asset data object — per-game state
type GameState = {
  board: (string | null)[];             // 9-cell array: "X", "O", or null
  playerX: { visitorId: string; username: string };
  playerO: { visitorId: string; username: string };
  lastPlayerTurn: "X" | "O";
  isGameOver: boolean;
  winner?: "X" | "O" | "draw";
  winCombo?: number[];                  // Indices of winning cells
  turnCount: number;
  resetCount: number;
  lastInteraction: string;
  keyAssetId: string;
};

// World data object — aggregate analytics
type WorldStats = {
  stats: {
    totalGamesPlayed: number;
    totalMoves: number;
    xWins: number;
    oWins: number;
    draws: number;
  };
  playerStats: {
    [visitorId: string]: {
      gamesPlayed: number;
      wins: number;
      losses: number;
    };
  };
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Turn-Based** | Optimistic locking with 409 conflicts, turn validation, 8-combo win detection |
| **2-Player Competitive** | Player selection, alternating turns, finish line visualization |
| **Canvas Game** | On-canvas cell rendering, webhook click handlers, finish line drawing |
| **Any game type** | Dual-layer analytics, atomic counter increments, activity broadcasts, 5-min reset cooldown |

## Weaknesses

- No test coverage
- Tight coupling between controllers and utility functions (hard to unit test)
- 5-minute reset cooldown is hardcoded (not configurable)
- No move timeout — a player can stall the game indefinitely
- No spectator view differentiation
- Win detection re-runs full check each turn (minor inefficiency, acceptable for 8 combos)
- No draw detection separate from "no more moves" (relies on board full check only)

## Unique Examples Worth Extracting

1. **Dual-Layer Analytics** — Per-game state on dropped asset + aggregate counters on world. Reusable pattern for any game that needs both session-level and lifetime statistics.
2. **Atomic Counter Increments** — Using `incrementDataObjectValue` for race-condition-free aggregate stats. Simpler and safer than read-modify-write for counters.
3. **Optimistic Locking with 409** — Returning conflict status to the client for retry, rather than blocking. Good pattern for responsive turn-based games.
4. **Finish Line Drawing** — Calculating position and rotation for a visual line across grid cells. Reusable for any grid game that needs to highlight winning lines.
