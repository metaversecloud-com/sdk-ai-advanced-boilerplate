# XP and Leveling System

> **Source**: sdk-grow-together, virtual-pet
> **SDK Methods**: `visitor.updateDataObject()`, `visitor.triggerParticle()`, `visitor.fireToast()`
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate
> **Tags**: `experience, XP, level, progression, rank, curve, threshold, level-up, milestone`

## When to Use

Add an XP/leveling system when your app needs to track visitor progression through defined stages. This pattern works for any scenario where repeated actions accumulate experience and unlock new tiers, ranks, or abilities. Use it for pet growth, plant stages, skill trees, or any progression mechanic.

## Server Implementation

### Level Calculation Utility

Create `server/utils/getLevelAndAge.ts`:

```ts
import { Credentials } from "../types.js";

/**
 * Level thresholds configuration.
 *
 * Fixed thresholds (virtual-pet style, 31 levels):
 *   Each level requires a fixed XP amount.
 *
 * Quadratic curve (grow-together style, 100 levels):
 *   XP required increases with each level using: base * level^exponent
 */

// --- Fixed Threshold Approach (virtual-pet) ---

interface LevelThreshold {
  level: number;
  xpRequired: number;
  rank?: string;
}

const FIXED_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, rank: "Hatchling" },
  { level: 2, xpRequired: 50, rank: "Hatchling" },
  { level: 3, xpRequired: 120, rank: "Hatchling" },
  { level: 4, xpRequired: 200, rank: "Youngster" },
  { level: 5, xpRequired: 300, rank: "Youngster" },
  { level: 6, xpRequired: 420, rank: "Youngster" },
  { level: 7, xpRequired: 560, rank: "Apprentice" },
  { level: 8, xpRequired: 720, rank: "Apprentice" },
  { level: 9, xpRequired: 900, rank: "Apprentice" },
  { level: 10, xpRequired: 1100, rank: "Journeyman" },
  // ... extend up to level 31
  { level: 15, xpRequired: 2500, rank: "Expert" },
  { level: 20, xpRequired: 5000, rank: "Master" },
  { level: 25, xpRequired: 8500, rank: "Grand Master" },
  { level: 30, xpRequired: 13000, rank: "Legend" },
  { level: 31, xpRequired: 15000, rank: "Mythic" },
];

export const getLevelFromFixedThresholds = (
  totalXp: number,
): { level: number; rank: string; xpForCurrentLevel: number; xpForNextLevel: number; progress: number } => {
  let currentLevel = FIXED_THRESHOLDS[0];

  for (const threshold of FIXED_THRESHOLDS) {
    if (totalXp >= threshold.xpRequired) {
      currentLevel = threshold;
    } else {
      break;
    }
  }

  const currentIndex = FIXED_THRESHOLDS.indexOf(currentLevel);
  const nextThreshold = FIXED_THRESHOLDS[currentIndex + 1];

  const xpForCurrentLevel = currentLevel.xpRequired;
  const xpForNextLevel = nextThreshold ? nextThreshold.xpRequired : currentLevel.xpRequired;
  const xpIntoLevel = totalXp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeededForNext > 0 ? Math.min(xpIntoLevel / xpNeededForNext, 1) : 1;

  return {
    level: currentLevel.level,
    rank: currentLevel.rank || "",
    xpForCurrentLevel,
    xpForNextLevel,
    progress,
  };
};

// --- Quadratic Curve Approach (grow-together) ---

const BASE_XP = 20;
const EXPONENT = 1.8;
const MAX_LEVEL = 100;

export const getXpRequiredForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level, EXPONENT));
};

export const getLevelFromXp = (
  totalXp: number,
): { level: number; xpForCurrentLevel: number; xpForNextLevel: number; progress: number } => {
  let level = 1;

  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (totalXp >= getXpRequiredForLevel(i)) {
      level = i;
    } else {
      break;
    }
  }

  const xpForCurrentLevel = getXpRequiredForLevel(level);
  const xpForNextLevel = level < MAX_LEVEL ? getXpRequiredForLevel(level + 1) : xpForCurrentLevel;
  const xpIntoLevel = totalXp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeededForNext > 0 ? Math.min(xpIntoLevel / xpNeededForNext, 1) : 1;

  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progress,
  };
};
```

### XP Quadratic Curve Reference

| Level | XP Required (base=20, exp=1.8) |
|-------|-------------------------------|
| 1     | 0                             |
| 2     | 69                            |
| 5     | 324                           |
| 10    | 1,261                         |
| 20    | 4,397                         |
| 50    | 22,270                        |
| 100   | 79,432                        |

### Granting XP and Detecting Level-Up

Create `server/utils/grantXp.ts`:

```ts
import { Credentials } from "../types.js";
import { Visitor } from "./topiaInit.js";
import { getLevelFromXp } from "./getLevelAndAge.js";
import { awardBadge } from "./awardBadge.js";

interface GrantXpResult {
  success: boolean;
  totalXp: number;
  xpGranted: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  progress: number;
}

// Badge milestones: level -> badge name
const LEVEL_BADGES: Record<number, string> = {
  5: "Beginner Badge",
  10: "Intermediate Badge",
  25: "Expert Badge",
  50: "Master Badge",
  100: "Legendary Badge",
};

export const grantXp = async ({
  credentials,
  xpAmount,
}: {
  credentials: Credentials;
  xpAmount: number;
}): Promise<GrantXpResult> => {
  const { urlSlug, visitorId, profileId } = credentials;

  const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
  await visitor.fetchDataObject();

  const visitorData = visitor.dataObject as {
    totalXp?: number;
    level?: number;
  };

  const previousXp = visitorData.totalXp || 0;
  const previousLevel = visitorData.level || 1;
  const newTotalXp = previousXp + xpAmount;

  const { level: currentLevel, progress } = getLevelFromXp(newTotalXp);
  const leveledUp = currentLevel > previousLevel;

  // Update visitor data object with new XP and level
  await visitor.updateDataObject(
    {
      totalXp: newTotalXp,
      level: currentLevel,
    },
    {
      analytics: [
        {
          analyticName: "xpEarned",
          incrementBy: xpAmount,
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    },
  );

  // Level-up side effects
  if (leveledUp) {
    // Fire particle effect
    await visitor.triggerParticle({ name: "level_up_sparkle", duration: 3 }).catch(() => {
      console.error("Failed to trigger level-up particle");
    });

    // Fire toast notification
    await visitor
      .fireToast({
        title: "Level Up!",
        text: `You reached level ${currentLevel}!`,
      })
      .catch(() => {
        console.error("Failed to fire level-up toast");
      });

    // Check for badge milestone
    const badgeName = LEVEL_BADGES[currentLevel];
    if (badgeName) {
      await awardBadge({ credentials, visitor, visitorInventory: visitorData, badgeName }).catch(() => {
        console.error(`Failed to award badge: ${badgeName}`);
      });
    }
  }

  return {
    success: true,
    totalXp: newTotalXp,
    xpGranted: xpAmount,
    previousLevel,
    currentLevel,
    leveledUp,
    progress,
  };
};
```

### Controller Example

```ts
// server/controllers/handleGrantXp.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";
import { grantXp } from "../utils/grantXp.js";

export const handleGrantXp = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { xpAmount } = req.body;

    if (!xpAmount || typeof xpAmount !== "number" || xpAmount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid xpAmount" });
    }

    const result = await grantXp({ credentials, xpAmount });
    return res.json(result);
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGrantXp",
      message: "Error granting XP.",
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
export interface XpState {
  totalXp: number;
  level: number;
  progress: number;
  xpForNextLevel: number;
  rank?: string;
}

export interface GrantXpResponse {
  success: boolean;
  totalXp: number;
  xpGranted: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  progress: number;
}
```

### Reducer Update

```ts
// Add to context/types.ts
export interface InitialState {
  // ... existing fields
  xp?: XpState;
}

// Add action type
export const SET_XP = "SET_XP";

// Add to reducer
case SET_XP: {
  return {
    ...state,
    xp: payload,
  };
}
```

### XP Progress Component

```tsx
import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "@context/GlobalContext";

export const XpProgressBar = () => {
  const { xp } = useContext(GlobalStateContext);

  if (!xp) return null;

  const { level, totalXp, progress, xpForNextLevel, rank } = xp;

  return (
    <div className="card">
      <div className="card-details">
        <h3 className="card-title">Level {level}</h3>
        {rank && <p className="p2">{rank}</p>}
        <div style={{ width: "100%", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px" }}>
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              backgroundColor: "#4caf50",
              borderRadius: "4px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p className="p2">
          {totalXp} / {xpForNextLevel} XP
        </p>
      </div>
    </div>
  );
};
```

## Variations

| App             | Levels | Curve     | Thresholds                    | Side Effects                         |
|-----------------|--------|-----------|-------------------------------|--------------------------------------|
| virtual-pet     | 31     | Fixed     | Hand-tuned table              | Toast, particle, evolution stages    |
| grow-together   | 100    | Quadratic | `base * level^1.8`           | Toast, particle, badge check         |
| skill-trainer   | 50     | Linear    | `level * 100`                | Unlock new abilities at milestones   |
| quiz-game       | 20     | Fixed     | Score-based thresholds        | Toast only, leaderboard update       |

## Common Mistakes

- **Not persisting level alongside XP**: Always store both `totalXp` and `level` in the data object. Recalculating level from XP on every request is wasteful and can cause inconsistencies if the threshold table changes.
- **Missing level-up detection**: Always compare the level before and after XP is granted. Without this comparison, particles, toasts, and badges will never fire.
- **Blocking on side effects**: Level-up side effects (particles, toasts, badges) should use `.catch()` to prevent failures from blocking the main XP grant response.
- **Not guarding against negative XP**: Validate that `xpAmount > 0` on the server before processing. Never trust client-provided XP values.
- **Forgetting max level cap**: Ensure the level calculation stops at `MAX_LEVEL` to avoid unexpected behavior.

## Related Examples

- [Award Badge](./award-badge.md) -- awarding badges at level milestones
- [Leaderboard](./leaderboard.md) -- displaying XP-based rankings
- [Action Cooldowns](./action-cooldowns.md) -- rate-limiting XP-granting actions
- [Probability Rewards](./probability-rewards.md) -- randomizing XP amounts from actions

## Related Skills

- [Add Game Mechanic](../skills/add-game-mechanic.md) — Step-by-step runbook for implementing XP, cooldowns, and streaks
