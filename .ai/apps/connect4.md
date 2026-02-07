# Connect4

**Repo**: `metaversecloud-com/connect4`
**SDK Version**: `@rtsdk/topia@^0.15.9`
**Quality**: High — complete on-canvas game with sophisticated board rendering and turn validation, but missing tests
**Last Analyzed**: 2026-02-07

## What It Does

A two-player Connect 4 game rendered entirely on-canvas using dropped text and web image assets. Players select a side, drop pieces into 7 columns, and compete to get 4 in a row. The board UI is dynamically generated via 15+ dropped assets with webhook-based click handlers. Moves validated server-side with win detection across 71 pre-computed combinations.

## Architecture

```
src/
├── controllers/
│   ├── handleDropPiece.ts       Column click → validate → spawn piece → check win
│   ├── handlePlayerSelection.ts  Join as player 1 or 2
│   └── handleResetBoard.ts      Clear pieces, reset state (admin or player)
├── utils/
│   ├── droppedAssets/
│   │   ├── dropTextAsset.ts     Drop text asset helper
│   │   ├── dropWebImageAsset.ts Drop image asset helper
│   │   └── getDroppedAssetDataObject.ts  Key asset lookup with world cache
│   ├── generateBoard.ts         Create full board UI (15 assets + webhooks)
│   ├── getGameStatus.ts         Win detection (71 combos)
│   ├── getPosition.ts           Space ID → world coordinates lookup
│   ├── addNewRowToGoogleSheets.ts  JWT-based analytics logging
│   └── topiaInit.ts             SDK factory init
├── types/
│   ├── gameDataInterface.ts     Game state type
│   └── worldDataObjectInterface.ts  World cache type
└── routes.ts                    4 endpoints
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/select-player/:player` | Join as player 1 or 2 |
| POST | `/api/click/:column` | Drop piece, validate, check win |
| POST | `/api/reset` | Reset board (admin or player after 5min) |
| GET | `/api/system/health` | System status |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch key asset |
| `DroppedAsset.drop(asset, options)` | Spawn board, pieces, selectors |
| `droppedAsset.updateDataObject(data, { lock, analytics })` | Game state mutations |
| `droppedAsset.updateCustomTextAsset({}, text)` | Update player names, game text |
| `droppedAsset.addWebhook({ type, title, url })` | Register click handlers on columns/buttons |
| `Asset.create(assetId, { credentials })` | Create asset references before drop |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Admin check |
| `Visitor.create(visitorId, urlSlug, { credentials })` | Particle effects on winner |
| `visitor.triggerParticle({ name, duration })` | crown_float on win |
| `World.create(urlSlug, { credentials })` | World instance |
| `world.triggerActivity({ type, assetId })` | GAME_ON / GAME_WAITING broadcast |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete on reset |
| `world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName })` | Find board assets |

## Key Patterns

### 1. On-Canvas Game Board Generation (UNIQUE)

Entire game UI is dropped assets with webhook click handlers — no iframe needed for gameplay:

```ts
// Generate board: background, text, player buttons, column selectors
await Promise.all([
  dropWebImageAsset({ credentials, layer1: "board.png", position: boardCenter, uniqueName: "board" }),
  dropTextAsset({ credentials, position: gameTextPos, text: "Select a player", uniqueName: "gameText" }),
  dropTextAsset({ credentials, position: p1Pos, text: "", uniqueName: "player1Text" }),
  dropTextAsset({ credentials, position: p2Pos, text: "", uniqueName: "player2Text" }),
]);

// Register webhooks for click-to-play
await column.addWebhook({
  type: "assetClicked",
  title: "Column 3 Clicked",
  url: `${APP_URL}click/2`,
});
```

### 2. Position Lookup Table for Grid Layout

Maps space IDs (0-41) to world coordinates relative to board center:

```ts
const positions = {
  0: { x: -255, y: -130 },   // Column 0, row 0 (bottom)
  6: { x: -170, y: -130 },   // Column 1, row 0
  // ... 42 entries for 7 columns × 6 rows
};

export const getPosition = (space: number, keyAssetPosition) => ({
  x: keyAssetPosition.x + positions[space].x,
  y: keyAssetPosition.y + positions[space].y,
});
```

### 3. Win Detection via Pre-Computed Combinations

Fast O(71) check — no grid iteration:

```ts
const combos = [
  [0, 1, 2, 3],    // Horizontal
  [1, 2, 3, 4],
  // ... all horizontal, vertical, diagonal combos
];

export const getGameStatus = (claimed: number[]) => {
  if (claimed.length < 4) return false;
  return combos.some(combo => combo.every(num => claimed.includes(num)));
};
```

### 4. Scene Drop ID Multi-Instance Scoping

Multiple independent game boards at different world locations using world data object cache:

```ts
const world = World.create(urlSlug, { credentials });
await world.fetchDataObject();

if (dataObject?.[sceneDropId]?.keyAssetId) {
  keyAssetId = dataObject[sceneDropId].keyAssetId; // Cache hit
} else {
  const assets = await world.fetchDroppedAssetsBySceneDropId({
    sceneDropId, uniqueName: "reset",
  });
  keyAssetId = assets[0].id;
  await world.updateDataObject({ [sceneDropId]: { keyAssetId } });
}
```

### 5. Turn-Based Locking with Counter Uniqueness

Uses resetCount + turnCount for lock IDs; increments turnCount even on error to prevent lock reuse:

```ts
await lockDataObject(`${keyAssetId}-${resetCount}-${turnCount}`, keyAsset);

try {
  // ... game logic
} catch (error) {
  await keyAsset.updateDataObject({ turnCount: turnCount + 1 });
  throw error;
}
```

### 6. Admin vs Player Reset Authorization

Admins reset anytime; players only if they're a participant or 5+ minutes elapsed:

```ts
if (!isAdmin &&
    player1.visitorId !== visitorId &&
    player2.visitorId !== visitorId &&
    new Date(lastInteraction).getTime() > resetAllowedDate.getTime()) {
  throw "You must be either a player or admin to reset the board";
}
```

### 7. Google Sheets Analytics via JWT Service Account

```ts
const auth = new JWT({
  email: process.env.GOOGLESHEETS_CLIENT_EMAIL,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

await sheetsClient.spreadsheets.values.append({
  spreadsheetId: process.env.GOOGLESHEETS_SHEET_ID,
  range: "Sheet1",
  valueInputOption: "RAW",
  insertDataOption: "INSERT_ROWS",
  requestBody: { values: [[date, time, identityId, displayName, "Connect 4", event, urlSlug]] },
});
```

## Data Structure

```ts
type GameDataType = {
  columns: { [0-6]: number[] };        // visitorIds stacked per column
  isGameOver: boolean;
  isResetInProgress: boolean;
  keyAssetId: string;
  lastInteraction: Date;
  lastPlayerTurn: number;
  playerCount: number;
  player1: { claimedSpaces: number[], profileId, username, visitorId };
  player2: { claimedSpaces: number[], profileId, username, visitorId };
  resetCount: number;
  turnCount: number;
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Board / Strategy** | On-canvas rendering, position lookup, win detection, turn validation |
| **Racing / Competition** | World activity triggers (GAME_ON/WAITING), celebration effects |
| **Social / Collaborative** | Player selection, multi-instance scoping, admin vs player authorization |
| **Education / Learning** | Google Sheets analytics logging, completion tracking |
| **Any game type** | Lock-based mutation with counter uniqueness, webhook-based interaction |

## Weaknesses

- No test coverage
- Position lookup table is hardcoded (changes require manual coordinate updates)
- Race condition on simultaneous piece drops (both pass lastPlayerTurn check)
- No input sanitization on username from request body
- `isResetInProgress` flag has no timeout (crash during reset = stuck game)
- Google Sheets logging has no retry on failure

## Unique Examples Worth Extracting

1. **On-Canvas Board Game Layout** — Asset generation, position mapping, webhook click handlers. New pattern not in existing examples.
2. **Turn-Based Game State Machine** — Lock-based mutation, turnCount/resetCount uniqueness, admin bypass.
3. **Win Detection via Pre-Computed Combos** — Reusable for any grid-based game.
4. **Google Sheets Analytics Pipeline** — JWT service account, batch logging, graceful fallback.
