# SDK Poll

**Repo**: [metaversecloud-com/sdk-poll](https://github.com/metaversecloud-com/sdk-poll)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-poll/`
**Quality**: Medium — real app with good voting logic, but no server-side admin checks, race conditions in votes, no tests
**SDK Version**: `@rtsdk/topia@^0.15.8` (older)

## What It Does

In-world poll app. Admins create polls with configurable questions and 2-10 answer options. Visitors cast a single vote (can change it) and view results as percentages or counts. Embedded as a drawer app triggered by clicking a key asset.

### User Flow

1. Click key asset -> opens iframe
2. App fetches `/api/visitor` for admin status, then `/api/poll` for poll data
3. **Regular users**: See question + answer buttons. After voting, see results (% or count). Can change vote. Refresh button re-fetches
4. **Admins**: Settings cog toggles AdminView where they can set question (150 char max), 2-10 options (100 char max), display mode (percentage/count), save/reset with confirmation modals

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/visitor` | Get visitor info (isAdmin, profileId) |
| GET | `/api/poll` | Get poll state from data object + fire "starts" analytic |
| PUT | `/api/poll` | Update poll config (crucial=question/answers changed, non-crucial=display mode only) |
| POST | `/api/vote` | Cast/change vote |
| POST | `/api/admin/reset` | Reset poll to defaults |

## Data Object

```typescript
// Default poll structure (server/constants.ts)
const defaultPoll = {
  question: "",
  answers: [],                    // string[]
  displayMode: "percentage",      // "percentage" | "count"
  options: {},                    // { [optionIndex: string]: { votes: number } }
  results: {},                    // { [profileId: string]: { answer: number } }
};
```

### Concrete Example
```json
{
  "question": "What is your favorite color?",
  "answers": ["Red", "Blue", "Green"],
  "displayMode": "percentage",
  "options": { "0": { "votes": 5 }, "1": { "votes": 3 }, "2": { "votes": 2 } },
  "results": { "profileId_abc": { "answer": 0 }, "profileId_def": { "answer": 1 } }
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch key asset |
| `droppedAsset.fetchDataObject()` | Refresh data object |
| `droppedAsset.setDataObject(defaultPoll, { lock })` | Initialize on first use |
| `droppedAsset.updateDataObject(payload, { lock, analytics })` | Update poll config/votes |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Check admin status |

## Key Patterns

### Vote with Previous Vote Reversal
```typescript
if (previousVote !== undefined) {
  if (newOptions[previousVote] && typeof newOptions[previousVote].votes === "number") {
    newOptions[previousVote] = { votes: Math.max(newOptions[previousVote].votes - 1, 0) };
  }
}
newOptions[optionId] = { votes: (newOptions[optionId]?.votes || 0) + 1 };
newResults[profileId] = { answer: optionId };
```

### Crucial vs Non-Crucial Updates
- **crucial=true**: Question/answers changed -> resets `options` (vote counts) and `results` (vote records). Destructive.
- **crucial=false**: Only displayMode changed -> preserves all existing data

### Different Lock Strategies
```typescript
// Poll update: unique per request (no dedup)
lockId = `${assetId}-pollUpdate-${Date.now()}`;
// Vote: 10-second window dedup
lockId = `${assetId}-voteUpdate-${roundedTo10Seconds}`;
// Initialization: 1-minute window dedup
lockId = `${droppedAsset.id}-${roundedToMinute}`;
```

### Auto-Detect Destructive Changes (Client)
```typescript
useEffect(() => {
  const questionChanged = question.trim() !== origQuestion.trim();
  const optionsChanged = /* length or content differs */;
  if (questionChanged || optionsChanged) setModalType("crucialSave");
  else setModalType("nonCrucialSave");
}, [question, options, origQuestion, origOptions]);
```

### Result Visibility
Results only shown to admins or users who have already voted:
```typescript
{isAdmin || selectedOption !== null ? voteText : ""}
```

## RPG Relevance

- **Voting/trading mechanics**: The vote reversal pattern (decrement old, increment new) is directly applicable to item trading
- **Per-user tracking via profileId keys**: The `results: { [profileId]: { answer } }` pattern is reusable for tracking any per-player state
- **Crucial vs non-crucial update pattern**: Useful for distinguishing destructive admin actions from safe config changes

## Weaknesses

- No server-side admin check on update/reset endpoints (client-only gating)
- Race condition: read-modify-write pattern for votes, lock windows don't fully prevent
- `handleResetScene` uses `updateDataObject` instead of `setDataObject` (stale keys can persist)
- Copy-paste error in error handler function names
- Unused `AssetFactory`, `UserFactory`, `WorldFactory`, `@googleapis/sheets`
- No tests
- Older SDK version (0.15.8)
