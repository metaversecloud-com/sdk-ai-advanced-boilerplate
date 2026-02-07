---
name: Add Leaderboard
description: Implement a leaderboard that tracks and displays visitor rankings. Use when you need pipe-delimited score tracking, sorted rankings, or competitive displays.
---

# Implement a Leaderboard

> **Prerequisites**: [add-route](./add-route.md), [add-component](./add-component.md), [add-data-object](./add-data-object.md)

## Inputs Needed

- [ ] **Metrics to track**: score, time, items collected, completion?
- [ ] **Pipe format**: field order, e.g., `"displayName|score|completed"`
- [ ] **Sorting**: By score (desc)? Time (asc)? Completion then score?
- [ ] **Reset behavior**: Can visitors restart? Remove their entry?
- [ ] **Key asset**: Which dropped asset stores the leaderboard?

## Steps

### 1. Define the pipe-delimited format

→ See `../examples/leaderboard.md` → "Common Formats by Use Case"

Document your format. All entries are stored as `leaderboard.{profileId}: "field1|field2|field3"` in the key asset data object.

### 2. Create update leaderboard utility

Create `server/utils/updateLeaderboard.ts`:
- Get key asset by ID, fetch its data object
- Build the pipe-delimited string
- If `data.leaderboard` exists: `updateDataObject({ ["leaderboard.${profileId}"]: resultString })`
- If not: `updateDataObject({ leaderboard: { [profileId]: resultString } })`

→ See `../examples/leaderboard.md` → "Update Leaderboard Utility" for full implementation

Export from `server/utils/index.ts`.

### 3. Create fetch/parse logic

In your game state controller: fetch key asset, split pipe strings into typed objects, sort.

→ See `../examples/leaderboard.md` → "Fetch and Parse Leaderboard" and "Sorting Strategies"

### 4. Add entry removal (if restart supported)

Delete `leaderboard[profileId]` then update.

→ See `../examples/leaderboard.md` → "Remove Entry"

### 5. Add analytics

Piggyback on the leaderboard write call.

→ See `./add-analytics.md`

### 6. Client types and context

Add `LeaderboardEntryType` to types, add to reducer via `SET_GAME_STATE`.

→ See `./add-component.md` → Step 1

### 7. Build leaderboard table

Render sorted entries with SDK CSS classes (`table`, `h5`, `p2`).

→ See `../examples/leaderboard.md` → "Table Component"

## Common Mistakes

- **Inconsistent pipe field order**: Document format and stick to it. Parsing in wrong order garbles data.
- **Missing initial `leaderboard` object**: First write must create the object. Check existence before dot-notation.
- **`setDataObject` for single entry update**: Replaces entire leaderboard. Use `updateDataObject` with dot-notation.
- **Client-side sorting**: Sort server-side and return sorted array.
