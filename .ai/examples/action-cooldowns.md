# Action Cooldowns

> **Source**: virtual-pet
> **SDK Methods**: `visitor.updateDataObject()` with dot-notation timestamps
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate

## When to Use

Add action cooldowns when your app needs to prevent visitors from spamming repeated actions. This pattern enforces server-side time gates on actions like feeding, training, playing, or any interaction that should have a minimum wait period between uses. It prevents exploitation and adds a pacing mechanic to gameplay.

## Server Implementation

### Cooldown Configuration

Create `server/utils/cooldownConfig.ts`:

```ts
/**
 * Cooldown durations in milliseconds for each action type.
 * Adjust these values to tune gameplay pacing.
 */
export const COOLDOWN_MS: Record<string, number> = {
  feed: 30 * 60 * 1000,      // 30 minutes
  play: 15 * 60 * 1000,      // 15 minutes
  sleep: 60 * 60 * 1000,     // 1 hour
  train: 45 * 60 * 1000,     // 45 minutes
  collect: 5 * 60 * 1000,    // 5 minutes
  claim: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Human-readable cooldown labels for toast messages.
 */
export const COOLDOWN_LABELS: Record<string, string> = {
  feed: "30 minutes",
  play: "15 minutes",
  sleep: "1 hour",
  train: "45 minutes",
  collect: "5 minutes",
  claim: "24 hours",
};
```

### Cooldown Validation Utility

Create `server/utils/checkCooldown.ts`:

```ts
import { COOLDOWN_MS } from "./cooldownConfig.js";

export interface CooldownResult {
  onCooldown: boolean;
  remainingMs: number;
  remainingFormatted: string;
}

/**
 * Check if an action is on cooldown for a visitor.
 *
 * @param lastActionTimestamp - The timestamp (ms) of the last action, from visitor data object
 * @param actionType - The action type key matching COOLDOWN_MS
 * @returns CooldownResult with status and remaining time
 */
export const checkCooldown = (lastActionTimestamp: number | undefined, actionType: string): CooldownResult => {
  const cooldownMs = COOLDOWN_MS[actionType];
  if (!cooldownMs) {
    return { onCooldown: false, remainingMs: 0, remainingFormatted: "" };
  }

  if (!lastActionTimestamp) {
    return { onCooldown: false, remainingMs: 0, remainingFormatted: "" };
  }

  const elapsed = Date.now() - lastActionTimestamp;
  const remaining = cooldownMs - elapsed;

  if (remaining <= 0) {
    return { onCooldown: false, remainingMs: 0, remainingFormatted: "" };
  }

  return {
    onCooldown: true,
    remainingMs: remaining,
    remainingFormatted: formatRemainingTime(remaining),
  };
};

/**
 * Format milliseconds into a human-readable string.
 */
export const formatRemainingTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
```

### Visitor Data Object Shape

```ts
// The visitor data object stores timestamps per action type
interface VisitorDataObject {
  cooldowns: {
    feed?: number;    // timestamp of last feed action
    play?: number;    // timestamp of last play action
    sleep?: number;   // timestamp of last sleep action
    train?: number;   // timestamp of last train action
    collect?: number; // timestamp of last collect action
    claim?: number;   // timestamp of last claim action
  };
  // ... other visitor data
}

// Default data object shape
const DEFAULT_VISITOR_DATA = {
  cooldowns: {},
};
```

### Controller with Cooldown Enforcement

```ts
// server/controllers/handlePerformAction.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { checkCooldown } from "../utils/checkCooldown.js";
import { COOLDOWN_LABELS } from "../utils/cooldownConfig.js";

export const handlePerformAction = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { actionType } = req.body;
    const { urlSlug, visitorId, profileId } = credentials;

    // Validate action type
    const validActions = ["feed", "play", "sleep", "train", "collect"];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({ success: false, error: "Invalid action type" });
    }

    // Fetch visitor data
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();

    const visitorData = visitor.dataObject as { cooldowns?: Record<string, number> };
    const lastTimestamp = visitorData?.cooldowns?.[actionType];

    // Check cooldown
    const cooldownResult = checkCooldown(lastTimestamp, actionType);

    if (cooldownResult.onCooldown) {
      return res.status(403).json({
        success: false,
        error: `Action "${actionType}" is on cooldown. Try again in ${cooldownResult.remainingFormatted}.`,
        remainingMs: cooldownResult.remainingMs,
        remainingFormatted: cooldownResult.remainingFormatted,
      });
    }

    // Perform the action (your game logic here)
    // ... e.g., grant XP, update stats, etc.

    // Update the cooldown timestamp using dot-notation
    await visitor.updateDataObject(
      {
        [`cooldowns.${actionType}`]: Date.now(),
      },
      {
        analytics: [
          {
            analyticName: actionType,
            profileId,
            uniqueKey: profileId,
            urlSlug,
          },
        ],
      },
    );

    return res.json({
      success: true,
      actionType,
      message: `${actionType} action completed!`,
      nextAvailableIn: COOLDOWN_LABELS[actionType],
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePerformAction",
      message: "Error performing action.",
      req,
      res,
    });
  }
};
```

### Fetching All Cooldown Statuses

```ts
// server/controllers/handleGetCooldowns.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { checkCooldown } from "../utils/checkCooldown.js";
import { COOLDOWN_MS } from "../utils/cooldownConfig.js";

export const handleGetCooldowns = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();

    const visitorData = visitor.dataObject as { cooldowns?: Record<string, number> };
    const cooldowns: Record<string, { available: boolean; remainingMs: number; remainingFormatted: string }> = {};

    for (const actionType of Object.keys(COOLDOWN_MS)) {
      const lastTimestamp = visitorData?.cooldowns?.[actionType];
      const result = checkCooldown(lastTimestamp, actionType);
      cooldowns[actionType] = {
        available: !result.onCooldown,
        remainingMs: result.remainingMs,
        remainingFormatted: result.remainingFormatted,
      };
    }

    return res.json({ success: true, cooldowns });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetCooldowns",
      message: "Error fetching cooldowns.",
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
export interface CooldownStatus {
  available: boolean;
  remainingMs: number;
  remainingFormatted: string;
}

export interface CooldownMap {
  [actionType: string]: CooldownStatus;
}
```

### Cooldown Timer Hook

```tsx
import { useState, useEffect, useRef } from "react";

/**
 * Hook that manages a client-side countdown timer.
 * Starts with the remaining milliseconds from the server response
 * and counts down to zero.
 */
export const useCooldownTimer = (remainingMs: number): { remaining: string; isReady: boolean } => {
  const [msLeft, setMsLeft] = useState(remainingMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMsLeft(remainingMs);

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (remainingMs > 0) {
      intervalRef.current = setInterval(() => {
        setMsLeft((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remainingMs]);

  const isReady = msLeft <= 0;

  const totalSeconds = Math.ceil(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remaining = isReady ? "" : `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return { remaining, isReady };
};
```

### Action Button Component

```tsx
import { useContext, useState } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { backendAPI, setErrorMessage } from "@utils";
import { useCooldownTimer } from "@/hooks/useCooldownTimer";
import { ErrorType } from "@context/types";

interface ActionButtonProps {
  actionType: string;
  label: string;
  remainingMs: number;
  onSuccess: () => void;
}

export const ActionButton = ({ actionType, label, remainingMs, onSuccess }: ActionButtonProps) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { remaining, isReady } = useCooldownTimer(remainingMs);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!isReady || loading) return;
    setLoading(true);

    try {
      const response = await backendAPI.post("/api/perform-action", { actionType });
      if (response.data.success) {
        onSuccess();
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        // Cooldown response from server -- update the timer
        console.warn(err.response.data.error);
      } else {
        setErrorMessage(dispatch, err as ErrorType);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={`btn ${!isReady ? "btn-outline" : ""}`} onClick={handleClick} disabled={!isReady || loading}>
      {isReady ? label : `${label} (${remaining})`}
    </button>
  );
};
```

## Variations

| App           | Actions                      | Cooldown Range     | Reset Behavior                  |
|---------------|------------------------------|--------------------|---------------------------------|
| virtual-pet   | feed, play, sleep, train     | 15min -- 1hr       | Per-action independent cooldown |
| grow-together | water, fertilize, harvest    | 5min -- 24hr       | Per-action, harvest resets plot |
| quest-game    | collect, search              | 5min -- 30min      | Daily reset at midnight         |
| social-app    | send-gift, poke              | 1hr per recipient  | Per-recipient cooldown          |

## Common Mistakes

- **Client-side only cooldowns**: Never enforce cooldowns only on the client. The server must always validate timestamps. Client timers are purely for display purposes.
- **Using `setDataObject` instead of `updateDataObject`**: When updating a single cooldown timestamp, use dot-notation with `updateDataObject` (e.g., `cooldowns.feed`) to avoid overwriting other cooldown timestamps.
- **Not returning remaining time on 403**: Always include `remainingMs` and `remainingFormatted` in the cooldown rejection response so the client can display an accurate countdown.
- **Clock skew assumptions**: Always use `Date.now()` on the server for both setting and checking timestamps. Never trust client-provided timestamps.
- **Missing default data object**: If the visitor has no `cooldowns` property yet, ensure your code handles `undefined` gracefully rather than throwing.

## Related Examples

- [XP and Leveling](./xp-leveling.md) -- granting XP after cooldown-gated actions
- [Daily Limits and Streaks](./daily-limits-streaks.md) -- combining cooldowns with daily caps
- [Probability Rewards](./probability-rewards.md) -- randomizing rewards from cooldown-gated actions
