# Leaderboard Implementation

Store and display visitor progress/scores using pipe-delimited strings in asset data objects.

## Data Storage Pattern

All SDK apps use a **pipe-delimited string format** stored in a dropped asset's data object:

```
displayName|metric1|metric2|...
```

### Storage Location

Leaderboards are stored on a "key asset" (the main interactive asset) using:

```ts
keyAsset.dataObject.leaderboard = {
  [profileId]: "displayName|metric1|metric2",
  [profileId2]: "displayName|metric1|metric2",
  // ...
};
```

### Common Formats by Use Case

| Use Case        | Format                            | Example               |
| --------------- | --------------------------------- | --------------------- |
| Collection game | `name\|totalCollected\|streak`    | `"Alice\|42\|5"`      |
| Scavenger hunt  | `name\|cluesFound\|challengeDone` | `"Bob\|8\|true"`      |
| Quiz/Trivia     | `name\|score\|timeElapsed`        | `"Charlie\|8\|02:45"` |
| Race/Time trial | `name\|bestTime`                  | `"Dave\|1:23:45"`     |

## Server Implementation

### Update Leaderboard Utility

```ts
import { Credentials } from "../types.js";
import { DroppedAsset } from "./topiaInit.js";

export const updateLeaderboard = async ({
  credentials,
  keyAssetId,
  cluesCount,
  challengeDone,
}: {
  credentials: Credentials;
  keyAssetId: string;
  cluesCount: number;
  challengeDone: boolean;
}): Promise<void | Error> => {
  try {
    const { displayName, profileId, urlSlug } = credentials;

    const keyAsset = await DroppedAsset.create(keyAssetId, urlSlug, {
      credentials: { ...credentials, assetId: keyAssetId },
    });
    await keyAsset.fetchDataObject();

    // Create the pipe-delimited string
    const resultString = `${displayName}|${cluesCount}|${challengeDone}`;

    if ((keyAsset.dataObject as { leaderboard?: Record<string, string> })?.leaderboard) {
      await keyAsset.updateDataObject({ [`leaderboard.${profileId}`]: resultString });
    } else {
      await keyAsset.updateDataObject({
        leaderboard: { [`${profileId}`]: resultString },
      });
    }
  } catch (error) {
    return error as Error;
  }
};
```

### Fetch and Parse Leaderboard

```ts
// Fetch leaderboard from key asset
const keyAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
await keyAsset.fetchDataObject();
const leaderboardData = (keyAsset.dataObject as { leaderboard?: Record<string, string> })?.leaderboard;

// Parse into typed array
type LeaderboardEntry = {
  name: string;
  cluesCollected: number;
  challengeDone: boolean;
  profileId: string;
};

let leaderboard: LeaderboardEntry[] = [];

if (leaderboardData) {
  for (const visitorProfileId in leaderboardData) {
    const data = leaderboardData[visitorProfileId];
    const [displayName, cluesCount, done] = data.split("|");

    leaderboard.push({
      name: displayName,
      cluesCollected: parseInt(cluesCount) || 0,
      challengeDone: done === "true",
      profileId: visitorProfileId,
    });
  }
}
```

### Sorting Strategies

**By completion status first, then score:**

```ts
leaderboard.sort((a, b) => {
  // Completed entries first
  if (a.challengeDone !== b.challengeDone) {
    return a.challengeDone ? -1 : 1;
  }
  // Then by score descending
  return b.cluesCollected - a.cluesCollected;
});
```

**By score with time as tiebreaker:**

```ts
leaderboard.sort((a, b) => {
  const scoreDiff = b.score - a.score;
  if (scoreDiff === 0) {
    // Parse MM:SS to seconds for comparison
    const parseTime = (time: string) => {
      const [minutes, seconds] = time.split(":").map(Number);
      return minutes * 60 + seconds;
    };
    return parseTime(a.timeElapsed) - parseTime(b.timeElapsed);
  }
  return scoreDiff;
});
```

**By time (racing games):**

```ts
const timeToSeconds = (t: string) => {
  if (!t) return Infinity;
  const [h = "0", m = "0", s = "0"] = t.split(":");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
};

leaderboard.sort((a, b) => timeToSeconds(a.highScore) - timeToSeconds(b.highScore));
```

### Remove Entry (on restart/reset)

```ts
// Remove a visitor's entry from the leaderboard
const keyAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });
await keyAsset.fetchDataObject();
const leaderboardData = (keyAsset.dataObject as { leaderboard?: Record<string, string> })?.leaderboard;

if (leaderboardData && leaderboardData[profileId]) {
  delete leaderboardData[profileId];
  await keyAsset.updateDataObject({ leaderboard: leaderboardData });
}
```

## Client Implementation

### Type Definition

```ts
export type LeaderboardEntryType = {
  name: string;
  cluesCollected: number;
  challengeDone: boolean;
  profileId: string;
};
```

### Context State

Add to `InitialState`:

```ts
export interface InitialState {
  // ... other fields
  leaderboard?: LeaderboardEntryType[];
}
```

Add to reducer `SET_CONFIG` case:

```ts
case SET_CONFIG: {
  return {
    ...state,
    leaderboard: payload?.leaderboard ?? state.leaderboard,
    // ... other fields
  };
}
```

### Table Component

```tsx
const getLeaderboardContent = () => (
  <div className="items-center">
    {!leaderboard || leaderboard.length === 0 ? (
      <p>No results yet.</p>
    ) : (
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th className="h5">Name</th>
            <th className="h5">Items Found</th>
            <th className="h5">Completed</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry: LeaderboardEntryType, index: number) => (
            <tr key={entry.profileId}>
              <td className="p2">{index + 1}</td>
              <td className="p2">{entry.name}</td>
              <td className="p2">{entry.cluesCollected}</td>
              <td className="p2">{entry.challengeDone ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
```

### Personal Stats Section (optional)

```tsx
// Find current visitor in leaderboard
const myStats = leaderboard?.find((entry) => entry.profileId === profileId);
const myRank = leaderboard?.findIndex((entry) => entry.profileId === profileId) + 1;

{
  myStats && (
    <div className="card mb-4">
      <h4>My Stats</h4>
      <p>Rank: #{myRank}</p>
      <p>Items: {myStats.cluesCollected}</p>
      <p>Completed: {myStats.challengeDone ? "Yes" : "No"}</p>
    </div>
  );
}
```

## Analytics Integration

Track completions when updating leaderboard:

```ts
await keyAsset.updateDataObject(
  { [`leaderboard.${profileId}`]: resultString },
  {
    analytics: [{ analyticName: "completions", profileId, uniqueKey: profileId, urlSlug }],
  },
);
```

## Migration from Object Format

If migrating from an older object-based format:

```ts
// Old format: { profileId: { username, highscore } }
// New format: { profileId: "username|highscore" }

if (sceneData.profiles) {
  let leaderboard: Record<string, string> = {};
  for (const profileId in sceneData.profiles) {
    const { username, highscore } = sceneData.profiles[profileId];
    leaderboard[profileId] = `${username}|${highscore}`;
  }
  sceneData.leaderboard = leaderboard;
  delete sceneData.profiles;
  // Save migrated data
  await keyAsset.updateDataObject({ leaderboard });
}
```
