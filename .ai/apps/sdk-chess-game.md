# SDK Chess Game

**Repo**: [metaversecloud-com/sdk-chess-game](https://github.com/metaversecloud-com/sdk-chess-game)
**SDK Version**: `@rtsdk/topia@^0.15.8`
**Quality**: Medium — full chess engine integration with real-time sync, but no tests, Redis hard dependency, and hardcoded board positions
**Last Analyzed**: 2026-02-07

## What It Does

A two-player chess game rendered on-canvas using dropped assets for each piece. Integrates chess.js for move validation and game rules. Uses Redis pub/sub with Server-Sent Events (SSE) for real-time move broadcasting between players. Each chess piece is a dropped asset with webhook click handlers, and moves update both the board state (FEN notation) and physical asset positions on the world canvas.

### Game Mechanics

- Full chess rules via chess.js (legal moves, check, checkmate, stalemate, castling, en passant)
- On-canvas board with 32 piece assets positioned via dual-coordinate tracking
- Captured pieces moved to a "dead zone" area off the board
- Real-time move sync via Redis pub/sub + SSE connection pooling
- Single game instance per dropped asset

## Architecture

```
src/
├── controllers/
│   ├── handleMove.ts            Validate + execute move, update asset positions
│   ├── handleNewGame.ts         Initialize board, drop piece assets
│   ├── handleReset.ts           Clear pieces, reset FEN to starting position
│   └── handleGetGameState.ts    Return current board state + player info
├── utils/
│   ├── topiaInit.ts             SDK factory exports
│   ├── redis.ts                 Redis client + pub/sub setup
│   └── sse.ts                   SSE connection pool with stale pruning
├── types/
│   └── gameTypes.ts             Game state, piece, and position interfaces
└── routes.ts                    Endpoints + SSE stream
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Current board state, FEN, players, move history |
| POST | `/api/new-game` | Initialize board, drop all 32 piece assets |
| POST | `/api/move` | Validate and execute a chess move |
| POST | `/api/reset` | Clear board, reset to starting position |
| GET | `/api/events` | SSE stream for real-time move updates |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch board key asset |
| `droppedAsset.updateDataObject(data, { lock })` | Store game state (FEN, players, history) |
| `droppedAsset.updateWebImageLayers(layers)` | Update piece visuals on move |
| `World.create(urlSlug, { credentials })` | World instance for asset operations |
| `world.triggerParticle({ name, duration })` | Celebration on checkmate |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Identify players, admin check |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete pieces on reset |

## Key Patterns

### 1. Time-Bucketed Locking (3-Second Windows)

Uses 3-second time windows as lock IDs to prevent concurrent move conflicts while keeping locks short-lived:

```ts
const lockId = `${assetId}-${Math.floor(Date.now() / 3000)}`;
await keyAsset.updateDataObject(
  { fen: game.fen(), moveHistory, lastMove, lastPlayerTurn: currentPlayer },
  { lock: { lockId, releaseLock: true } }
);
```

This avoids counter-based lock IDs (which require reading state first) and keeps lock granularity tight enough for turn-based play.

### 2. Dual-Coordinate Piece Tracking (Board + World)

Each piece tracks both its chess board position (algebraic notation) and world canvas position (x, y pixels):

```ts
type PiecePosition = {
  square: string;        // "e4" — chess.js board coordinate
  worldX: number;        // Canvas X relative to board origin
  worldY: number;        // Canvas Y relative to board origin
  piece: string;         // "wP" — color + type
  assetId: string;       // Dropped asset ID in world
};

// On move: update both coordinate systems
const worldPos = squareToWorldPosition(move.to, boardOrigin);
await pieceAsset.updatePosition(worldPos.x, worldPos.y);
```

### 3. Dead Zone Pattern for Captured Pieces

Captured pieces are not deleted but relocated to an off-board staging area, preserving asset references for potential undo or game review:

```ts
const DEAD_ZONE = {
  white: { x: boardOrigin.x - 400, y: boardOrigin.y },
  black: { x: boardOrigin.x + 400, y: boardOrigin.y },
};

// On capture: move piece to dead zone instead of deleting
if (move.captured) {
  const capturedAsset = findPieceAsset(move.to, opponentPieces);
  const dzPos = DEAD_ZONE[opponentColor];
  await capturedAsset.updatePosition(dzPos.x, dzPos.y + (captureIndex * 30));
}
```

### 4. SSE Connection Pooling with Stale Pruning

Manages multiple SSE connections per game with periodic cleanup of disconnected clients:

```ts
const connections = new Map<string, { res: Response; lastPing: number }>();

// Prune stale connections every 30s
setInterval(() => {
  const now = Date.now();
  connections.forEach((conn, id) => {
    if (now - conn.lastPing > 60000) {
      conn.res.end();
      connections.delete(id);
    }
  });
}, 30000);

// Broadcast move to all active connections for this game
function broadcastMove(gameId: string, move: MoveData) {
  connections.forEach((conn, id) => {
    if (id.startsWith(gameId)) {
      conn.res.write(`data: ${JSON.stringify(move)}\n\n`);
      conn.lastPing = Date.now();
    }
  });
}
```

### 5. Chess.js Integration for Server-Side Validation

All move validation happens server-side via chess.js — the client sends only source and target squares:

```ts
import { Chess } from "chess.js";

const game = new Chess(currentFen);
const move = game.move({ from: req.body.from, to: req.body.to, promotion: "q" });

if (!move) throw "Invalid move";
if (game.isCheckmate()) { /* trigger win sequence */ }
if (game.isDraw()) { /* trigger draw sequence */ }
```

## Data Structure

```ts
type ChessGameState = {
  fen: string;                          // chess.js FEN string
  moveHistory: { from: string; to: string; piece: string; captured?: string }[];
  player1: { visitorId: string; color: "white"; username: string };
  player2: { visitorId: string; color: "black"; username: string };
  lastPlayerTurn: "white" | "black";
  pieces: PiecePosition[];              // All 32 pieces with dual coordinates
  isGameOver: boolean;
  result?: "checkmate" | "stalemate" | "draw";
  keyAssetId: string;
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Board / Strategy** | Dual-coordinate tracking, chess.js integration, dead zone for captures, on-canvas piece rendering |
| **Racing / Competition** | SSE real-time sync via Redis pub/sub, connection pooling with stale pruning |
| **Turn-Based** | Time-bucketed locking, server-side move validation, turn alternation |
| **Any game type** | SSE connection management pattern, third-party engine integration |

## Weaknesses

- No test coverage
- Redis is a hard dependency — server crashes if Redis is unavailable (no graceful fallback)
- Board positions are hardcoded (square-to-pixel mapping is static)
- Single game per dropped asset (no multi-instance scoping)
- No move timeout — abandoned games stay active indefinitely
- No spectator mode differentiation (all connected clients receive all events)

## Unique Examples Worth Extracting

1. **Time-Bucketed Locking** — 3-second window lock IDs that avoid counter reads. Simpler than counter-based uniqueness for time-sensitive operations.
2. **Dual-Coordinate Tracking** — Mapping between game-logic coordinates and world canvas positions. Reusable for any board game with on-canvas rendering.
3. **Dead Zone Pattern** — Relocating removed game objects instead of deleting them. Useful for undo, history, or visual staging areas.
4. **SSE Connection Pooling** — Managing multiple real-time connections with automatic stale pruning. Reusable for any real-time multiplayer feature.
