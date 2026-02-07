# Phase 4: Leaderboard

## Prerequisites

- Phase 1 completed (boilerplate, credentials flow)
- Phase 2 completed (controller pattern, key asset)
- Phase 3 completed (data object initialization, locking, dot-notation updates)

## What You Will Build

- Pipe-delimited leaderboard storage on key asset data objects
- Server-side update and parsing utilities
- Multiple sorting strategies (score, time, completion)
- Client-side leaderboard table component
- Personal stats display
- Entry removal for game resets

## Storage Format

All production Topia SDK apps store leaderboard entries as **pipe-delimited strings** keyed by `profileId` on the key asset's data object:

```typescript
keyAsset.dataObject.leaderboard = {
  "profile_abc": "Alice|42|5",
  "profile_def": "Bob|38|3",
  "profile_ghi": "Charlie|55|7",
};
```

The format is: `displayName|metric1|metric2|...`

### Common Formats by Game Type

| Game Type | Format | Example |
|-----------|--------|---------|
| Collection game | `name\|totalCollected\|streak` | `"Alice\|42\|5"` |
| Scavenger hunt | `name\|cluesFound\|challengeDone` | `"Bob\|8\|true"` |
| Quiz / trivia | `name\|score\|timeElapsed` | `"Charlie\|8\|02:45"` |
| Race / time trial | `name\|bestTime` | `"Dave\|1:23:45"` |

### Why Pipe-Delimited?

- Compact storage (smaller data objects)
- Simple parsing with `string.split("|")`
- Consistent pattern across all production apps
- Easy to extend by appending new fields

## Step 1: Update Leaderboard Utility

Create a server utility that writes leaderboard entries:

```typescript
// server/utils/updateLeaderboard.ts
import { DroppedAsset } from "./topiaInit.js";
import { Credentials } from "../types.js";

export const updateLeaderboard = async ({
  credentials,
  keyAssetId,
  score,
  completionStatus,
}: {
  credentials: Credentials;
  keyAssetId: string;
  score: number;
  completionStatus: boolean;
}): Promise<void | Error> => {
  try {
    const { displayName, profileId, urlSlug } = credentials;

    // Get the key asset
    const keyAsset = await DroppedAsset.create(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });
    await keyAsset.fetchDataObject();

    // Build pipe-delimited string
    const resultString = `${displayName}|${score}|${completionStatus}`;

    // Update using dot-notation if leaderboard already exists
    const dataObject = keyAsset.dataObject as { leaderboard?: Record<string, string> };

    if (dataObject?.leaderboard) {
      await keyAsset.updateDataObject({
        [`leaderboard.${profileId}`]: resultString,
      });
    } else {
      // Initialize leaderboard with first entry
      await keyAsset.updateDataObject({
        leaderboard: { [profileId]: resultString },
      });
    }
  } catch (error) {
    return error as Error;
  }
};
```

## Step 2: Fetch and Parse Leaderboard

```typescript
// server/utils/getLeaderboard.ts
import { DroppedAsset } from "./topiaInit.js";
import { Credentials } from "../types.js";

export type LeaderboardEntry = {
  name: string;
  score: number;
  completed: boolean;
  profileId: string;
};

export const getLeaderboard = async ({
  credentials,
}: {
  credentials: Credentials;
}): Promise<LeaderboardEntry[]> => {
  const { assetId, urlSlug } = credentials;

  const keyAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
  await keyAsset.fetchDataObject();

  const leaderboardData = (keyAsset.dataObject as { leaderboard?: Record<string, string> })?.leaderboard;
  const leaderboard: LeaderboardEntry[] = [];

  if (leaderboardData) {
    for (const visitorProfileId in leaderboardData) {
      const data = leaderboardData[visitorProfileId];
      const [displayName, scoreStr, completedStr] = data.split("|");

      leaderboard.push({
        name: displayName,
        score: parseInt(scoreStr) || 0,
        completed: completedStr === "true",
        profileId: visitorProfileId,
      });
    }
  }

  return leaderboard;
};
```

## Step 3: Sorting Strategies

Choose the sorting strategy that fits your game type.

### By Score (Descending)

```typescript
leaderboard.sort((a, b) => b.score - a.score);
```

### By Completion First, Then Score

```typescript
leaderboard.sort((a, b) => {
  // Completed entries first
  if (a.completed !== b.completed) {
    return a.completed ? -1 : 1;
  }
  // Then by score descending
  return b.score - a.score;
});
```

### By Score with Time as Tiebreaker

```typescript
leaderboard.sort((a, b) => {
  const scoreDiff = b.score - a.score;
  if (scoreDiff === 0) {
    const parseTime = (time: string) => {
      const [minutes, seconds] = time.split(":").map(Number);
      return minutes * 60 + seconds;
    };
    return parseTime(a.timeElapsed) - parseTime(b.timeElapsed);
  }
  return scoreDiff;
});
```

### By Time (Racing Games)

```typescript
const timeToSeconds = (t: string) => {
  if (!t) return Infinity;
  const [h = "0", m = "0", s = "0"] = t.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
};

leaderboard.sort((a, b) => timeToSeconds(a.bestTime) - timeToSeconds(b.bestTime));
```

## Step 4: Remove Entry (Reset)

Remove a player's entry when they restart or when an admin resets the game:

```typescript
export const removeLeaderboardEntry = async ({
  credentials,
  profileIdToRemove,
}: {
  credentials: Credentials;
  profileIdToRemove: string;
}) => {
  const { assetId, urlSlug } = credentials;

  const keyAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
  await keyAsset.fetchDataObject();

  const leaderboardData = (keyAsset.dataObject as { leaderboard?: Record<string, string> })?.leaderboard;

  if (leaderboardData && leaderboardData[profileIdToRemove]) {
    delete leaderboardData[profileIdToRemove];
    await keyAsset.updateDataObject({ leaderboard: leaderboardData });
  }
};
```

## Step 5: Controller

```typescript
// server/controllers/handleGetLeaderboard.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";
import { getLeaderboard } from "../utils/getLeaderboard.js";

export const handleGetLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const leaderboard = await getLeaderboard({ credentials });

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    return res.json({ success: true, leaderboard });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetLeaderboard",
      message: "Error loading leaderboard",
      req,
      res,
    });
  }
};
```

## Step 6: Client Implementation

### Type Definition

```typescript
// shared/types.ts or client/src/context/types.ts
export type LeaderboardEntryType = {
  name: string;
  score: number;
  completed: boolean;
  profileId: string;
};
```

### Context Integration

Add to your reducer's state and action handling:

```typescript
// In InitialState interface
leaderboard?: LeaderboardEntryType[];

// In reducer SET_GAME_STATE or SET_CONFIG case
case SET_GAME_STATE: {
  return {
    ...state,
    leaderboard: payload?.leaderboard ?? state.leaderboard,
  };
}
```

### Leaderboard Table Component

```tsx
const getLeaderboardContent = () => (
  <div className="items-center">
    {!leaderboard || leaderboard.length === 0 ? (
      <p className="p2">No results yet.</p>
    ) : (
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th className="h5">Name</th>
            <th className="h5">Score</th>
            <th className="h5">Completed</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry: LeaderboardEntryType, index: number) => (
            <tr key={entry.profileId}>
              <td className="p2">{index + 1}</td>
              <td className="p2">{entry.name}</td>
              <td className="p2">{entry.score}</td>
              <td className="p2">{entry.completed ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
```

### Personal Stats Section

```tsx
const myStats = leaderboard?.find((entry) => entry.profileId === profileId);
const myRank = leaderboard
  ? leaderboard.findIndex((entry) => entry.profileId === profileId) + 1
  : 0;

{myStats && (
  <div className="card mb-4">
    <div className="card-details">
      <h4 className="h4">My Stats</h4>
      <p className="p2">Rank: #{myRank}</p>
      <p className="p2">Score: {myStats.score}</p>
      <p className="p2">Completed: {myStats.completed ? "Yes" : "No"}</p>
    </div>
  </div>
)}
```

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `DroppedAsset.create(id, urlSlug, opts)` | Lightweight access to key asset |
| `droppedAsset.fetchDataObject()` | Load leaderboard data |
| `droppedAsset.updateDataObject(data)` | Write leaderboard entries with dot-notation |

## Related Examples

- `../examples/leaderboard.md` -- complete leaderboard reference with all sorting strategies and migration patterns

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Storing leaderboard as objects instead of pipe-delimited strings | Use the `name\|metric1\|metric2` format for consistency |
| Not initializing the leaderboard object | Check if `leaderboard` exists before using dot-notation updates |
| Sorting on the client only | Sort server-side before sending to client |
| Forgetting to handle missing entries in `split` | Always provide fallback values: `parseInt(val) \|\| 0` |
| Not limiting leaderboard size | Consider returning only top N entries for large player counts |
