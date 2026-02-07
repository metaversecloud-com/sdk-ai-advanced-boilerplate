# Daily Limits and Streaks

> **Source**: sdk-quest, sdk-stride-check-in
> **SDK Methods**: `visitor.updateDataObject()`, `visitor.incrementDataObjectValue()`
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate

## When to Use

Add daily limits and streak tracking when your app needs to cap how many times a visitor can perform an action per day and reward consecutive-day engagement. This pattern is essential for collection games, daily check-ins, quest systems, and any mechanic that encourages repeated daily visits without allowing unlimited farming in a single session.

## Server Implementation

### Date Utility

Create `server/utils/dateUtils.ts`:

```ts
/**
 * Check if two timestamps fall on the same calendar day (UTC).
 */
export const isSameDay = (timestamp1: number, timestamp2: number): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

/**
 * Check if two timestamps are on consecutive calendar days (UTC).
 * Returns true if timestamp2 is exactly one day after timestamp1.
 */
export const isConsecutiveDay = (timestamp1: number, timestamp2: number): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

  // Normalize both to start of day UTC
  const day1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
  const day2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return day2 - day1 === ONE_DAY_MS;
};

/**
 * Get the start of the current day (midnight UTC) as a timestamp.
 */
export const getStartOfDayUTC = (timestamp?: number): number => {
  const date = timestamp ? new Date(timestamp) : new Date();
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};
```

### Visitor Data Object Shape

```ts
interface DailyTrackingData {
  daily: {
    lastActionDate: number;    // timestamp of last action
    actionsToday: number;      // count of actions performed today
    dailyLimit: number;        // max actions per day (set by config)
  };
  streak: {
    currentStreak: number;     // consecutive days
    longestStreak: number;     // all-time best
    lastStreakDate: number;    // timestamp of last streak-counted action
  };
  // ... other visitor data
}

const DEFAULT_DAILY_DATA: DailyTrackingData = {
  daily: {
    lastActionDate: 0,
    actionsToday: 0,
    dailyLimit: 10,
  },
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: 0,
  },
};
```

### Daily Limit and Streak Handler

Create `server/utils/handleDailyAction.ts`:

```ts
import { Credentials } from "../types.js";
import { Visitor } from "./topiaInit.js";
import { isSameDay, isConsecutiveDay } from "./dateUtils.js";

interface DailyActionResult {
  success: boolean;
  actionsToday: number;
  dailyLimit: number;
  remainingToday: number;
  currentStreak: number;
  longestStreak: number;
  streakUpdated: boolean;
}

const DEFAULT_DAILY_LIMIT = 10;

export const handleDailyAction = async ({
  credentials,
  actionValue = 1,
}: {
  credentials: Credentials;
  actionValue?: number;
}): Promise<DailyActionResult> => {
  const { urlSlug, visitorId, profileId } = credentials;

  const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
  await visitor.fetchDataObject();

  const visitorData = visitor.dataObject as {
    daily?: {
      lastActionDate?: number;
      actionsToday?: number;
      dailyLimit?: number;
    };
    streak?: {
      currentStreak?: number;
      longestStreak?: number;
      lastStreakDate?: number;
    };
  };

  const now = Date.now();

  // --- Daily Limit Logic ---

  const lastActionDate = visitorData?.daily?.lastActionDate || 0;
  const dailyLimit = visitorData?.daily?.dailyLimit || DEFAULT_DAILY_LIMIT;
  let actionsToday = visitorData?.daily?.actionsToday || 0;

  // Reset daily count if last action was on a different day
  if (!isSameDay(lastActionDate, now)) {
    actionsToday = 0;
  }

  // Check daily limit
  if (actionsToday >= dailyLimit) {
    return {
      success: false,
      actionsToday,
      dailyLimit,
      remainingToday: 0,
      currentStreak: visitorData?.streak?.currentStreak || 0,
      longestStreak: visitorData?.streak?.longestStreak || 0,
      streakUpdated: false,
    };
  }

  // Increment today's action count
  actionsToday += actionValue;

  // --- Streak Logic ---

  const lastStreakDate = visitorData?.streak?.lastStreakDate || 0;
  let currentStreak = visitorData?.streak?.currentStreak || 0;
  let longestStreak = visitorData?.streak?.longestStreak || 0;
  let streakUpdated = false;

  // Only update streak once per day
  if (!isSameDay(lastStreakDate, now)) {
    if (isConsecutiveDay(lastStreakDate, now)) {
      // Consecutive day: extend streak
      currentStreak += 1;
      streakUpdated = true;
    } else if (lastStreakDate === 0) {
      // First ever action: start streak
      currentStreak = 1;
      streakUpdated = true;
    } else {
      // Streak broken: reset to 1
      currentStreak = 1;
      streakUpdated = true;
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  }

  // Persist updates
  await visitor.updateDataObject(
    {
      "daily.lastActionDate": now,
      "daily.actionsToday": actionsToday,
      ...(streakUpdated
        ? {
            "streak.currentStreak": currentStreak,
            "streak.longestStreak": longestStreak,
            "streak.lastStreakDate": now,
          }
        : {}),
    },
    {
      analytics: [
        {
          analyticName: "dailyAction",
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    },
  );

  return {
    success: true,
    actionsToday,
    dailyLimit,
    remainingToday: dailyLimit - actionsToday,
    currentStreak,
    longestStreak,
    streakUpdated,
  };
};
```

### Controller Example

```ts
// server/controllers/handleCollect.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";
import { handleDailyAction } from "../utils/handleDailyAction.js";

export const handleCollect = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const result = await handleDailyAction({ credentials });

    if (!result.success) {
      return res.status(429).json({
        success: false,
        error: `Daily limit reached (${result.dailyLimit}/${result.dailyLimit}). Come back tomorrow!`,
        actionsToday: result.actionsToday,
        dailyLimit: result.dailyLimit,
      });
    }

    return res.json({
      success: true,
      actionsToday: result.actionsToday,
      remainingToday: result.remainingToday,
      dailyLimit: result.dailyLimit,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      streakUpdated: result.streakUpdated,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCollect",
      message: "Error collecting item.",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Types

```ts
// shared/types.ts
export interface DailyStatus {
  actionsToday: number;
  dailyLimit: number;
  remainingToday: number;
  currentStreak: number;
  longestStreak: number;
}
```

### Reducer Update

```ts
// Add to context/types.ts
export interface InitialState {
  // ... existing fields
  dailyStatus?: DailyStatus;
}

export const SET_DAILY_STATUS = "SET_DAILY_STATUS";

// Add to reducer
case SET_DAILY_STATUS: {
  return {
    ...state,
    dailyStatus: payload,
  };
}
```

### Daily Status Component

```tsx
import { useContext } from "react";
import { GlobalStateContext } from "@context/GlobalContext";

export const DailyStatusDisplay = () => {
  const { dailyStatus } = useContext(GlobalStateContext);

  if (!dailyStatus) return null;

  const { actionsToday, dailyLimit, remainingToday, currentStreak, longestStreak } = dailyStatus;

  return (
    <div className="card">
      <div className="card-details">
        <h3 className="card-title">Daily Progress</h3>
        <p className="p2">
          {actionsToday} / {dailyLimit} actions today ({remainingToday} remaining)
        </p>

        <h4 className="h4">Streak</h4>
        <p className="p2">Current: {currentStreak} day{currentStreak !== 1 ? "s" : ""}</p>
        <p className="p2">Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}</p>

        {remainingToday === 0 && <p className="p1">Daily limit reached. Come back tomorrow!</p>}
      </div>
    </div>
  );
};
```

## Variations

| App                 | Daily Limit       | Streak Mechanic                  | Bonus                            |
|---------------------|-------------------|----------------------------------|----------------------------------|
| sdk-quest           | 10 collections/day | Consecutive day check-in         | Streak badge at 7, 30 days      |
| sdk-stride-check-in | 1 check-in/day    | Consecutive day streak           | Multiplier bonus at milestones  |
| collection-game     | 20 items/day      | Collect on consecutive days      | Bonus item at 5-day streak      |
| quiz-game           | 5 attempts/day    | No streak, daily reset only      | Extra attempt at streak 3       |

## Common Mistakes

- **Using local time instead of UTC**: Always use UTC for day comparisons to avoid timezone-related bugs where a visitor's "day" resets at different times depending on their location.
- **Not resetting daily count on new day**: The daily count must be checked against the current date before incrementing. If `lastActionDate` is on a different day, reset `actionsToday` to 0 before checking the limit.
- **Counting streak multiple times per day**: Only update the streak counter once per calendar day. Use `isSameDay(lastStreakDate, now)` to guard against multiple streak increments.
- **Not tracking longest streak separately**: Always maintain both `currentStreak` and `longestStreak`. When a streak breaks, `currentStreak` resets but `longestStreak` preserves the record.
- **Using `setDataObject` for partial updates**: Use dot-notation with `updateDataObject` (e.g., `"daily.actionsToday"`) to avoid overwriting the entire daily or streak object.

## Related Examples

- [Action Cooldowns](./action-cooldowns.md) -- combining daily limits with per-action cooldowns
- [XP and Leveling](./xp-leveling.md) -- granting XP on daily actions
- [Award Badge](./award-badge.md) -- awarding badges for streak milestones
- [Leaderboard](./leaderboard.md) -- ranking visitors by streak length
