# World Activity Trigger Pattern

> **Source**: sdk-race, sdk-grow-together
> **SDK Methods**: `world.triggerActivity({ type, assetId })`
> **Guide Phase**: Phase 7
> **Difficulty**: Starter
> **Tags**: `activity, signal, platform, event, notification, game-state`

## When to Use

Use this pattern to trigger visual and audio effects across the entire world in response to game state changes. World activities can play sounds, show animations, or trigger particle effects that all visitors see simultaneously, creating shared moments and increasing engagement.

## Server Implementation

### Basic Pattern: Instance Method

```ts
// server/controllers/handleGameComplete.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, World, Visitor } from "../utils/index.js";
import { WorldActivityType } from "@rtsdk/topia";

export const handleGameComplete = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId, uniqueName } = credentials;

    const world = World.create(urlSlug, {
      credentials,
    });

    const visitor = Visitor.create(visitorId, urlSlug, {
      credentials,
    });

    // Update completion count
    await visitor.incrementDataObjectValue("completions", 1, {
      analytics: [
        {
          analyticName: "completions",
          incrementBy: 1,
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    });

    // Trigger celebration activity (fire-and-forget pattern)
    world
      .triggerActivity({
        type: WorldActivityType.GAME_ON,
        assetId: credentials.assetId,
      })
      .catch(() => {
        // Swallow errors — activity triggers are non-critical
      });

    // Show success toast
    await visitor.fireToast({
      title: "Congratulations!",
      text: "You completed the game!",
    });

    return res.json({
      success: true,
      data: {
        message: "Game completed successfully",
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGameComplete",
      message: "Failed to complete game",
      req,
      res,
    });
  }
};
```

### Advanced Pattern: Static Method

```ts
// server/controllers/handleHighScore.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, World, Visitor } from "../utils/index.js";

export const handleHighScore = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;
    const { score } = req.body;

    // Validate score
    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid score provided",
      });
    }

    const world = World.create(urlSlug, {
      credentials,
    });

    // Get current high score from world data object
    await world.fetchDataObject();
    const currentHighScore = (world.dataObject as any)?.highScore ?? 0;

    // Check if new high score
    if (score > currentHighScore) {
      // Update world data object
      const lockId = `high-score-${Date.now()}`;
      await world.updateDataObject(
        {
          highScore: score,
          highScoreHolder: visitorId,
          highScoreTimestamp: Date.now(),
        },
        {
          lock: { lockId, releaseLock: true },
        },
      );

      // Trigger high score celebration activity (fire-and-forget)
      world.triggerActivity({
        type: WorldActivityType.GAME_HIGH_SCORE,
        assetId: credentials.assetId,
      }).catch(() => {});

      // Notify via toast
      await world.fireToast({
        groupId: "high-score",
        title: "New High Score!",
        text: `Someone scored ${score} points!`,
      });

      return res.json({
        success: true,
        data: {
          isNewHighScore: true,
          score,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        isNewHighScore: false,
        score,
        currentHighScore,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleHighScore",
      message: "Failed to process high score",
      req,
      res,
    });
  }
};
```

### Multiple Activities Pattern

```ts
// server/controllers/handleGameStateChange.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, World } from "../utils/index.js";
import { WorldActivityType } from "@rtsdk/topia";

type GamePhase = "WAITING" | "ACTIVE" | "COMPLETE";

const ACTIVITY_MAP: Record<GamePhase, WorldActivityType> = {
  WAITING: WorldActivityType.GAME_WAITING,
  ACTIVE: WorldActivityType.GAME_ON,
  COMPLETE: WorldActivityType.GAME_HIGH_SCORE, // Closest available type
};

export const handleGameStateChange = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;
    const { phase } = req.body as { phase: GamePhase };

    // Validate phase
    if (!ACTIVITY_MAP[phase]) {
      return res.status(400).json({
        success: false,
        error: "Invalid game phase",
      });
    }

    const world = World.create(urlSlug, {
      credentials,
    });

    // Trigger corresponding activity
    const activityType = ACTIVITY_MAP[phase];
    world
      .triggerActivity({
        type: activityType,
        assetId: credentials.assetId,
      })
      .catch(() => {});

    return res.json({
      success: true,
      data: {
        phase,
        activityTriggered: activityName,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGameStateChange",
      message: "Failed to change game state",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Types

```ts
// client/src/context/types.ts
export interface GameState {
  phase: "WAITING" | "ACTIVE" | "COMPLETE";
  highScore?: number;
  completions?: number;
  // ... other fields
}

export type Action =
  | { type: "SET_GAME_STATE"; payload: GameState }
  | { type: "UPDATE_GAME_PHASE"; payload: "WAITING" | "ACTIVE" | "COMPLETE" };
// ... other actions
```

### Component Usage

```tsx
// client/src/components/GameControl.tsx
import { useContext, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const GameControl = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { gameState } = useContext(GlobalStateContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      const response = await backendAPI.post("/api/game/state", {
        phase: "ACTIVE",
      });

      if (response.data.success) {
        dispatch({
          type: "UPDATE_GAME_PHASE",
          payload: "ACTIVE",
        });
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGame = async () => {
    setIsLoading(true);
    try {
      const response = await backendAPI.post("/api/game/complete");

      if (response.data.success) {
        dispatch({
          type: "UPDATE_GAME_PHASE",
          payload: "COMPLETE",
        });
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-details">
        <h3 className="card-title">Game Control</h3>
        <p className="card-description p2">Current Phase: {gameState?.phase}</p>
        <div className="card-actions">
          {gameState?.phase === "WAITING" && (
            <button className="btn" onClick={handleStartGame} disabled={isLoading}>
              Start Game
            </button>
          )}
          {gameState?.phase === "ACTIVE" && (
            <button className="btn" onClick={handleCompleteGame} disabled={isLoading}>
              Complete Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Variations

| App | Adaptation | Notes |
|-----|-----------|-------|
| sdk-race | Triggers start/finish activities | `GAME_ON` at race start, `GAME_HIGH_SCORE` for winner |
| sdk-grow-together | Tree growth milestones | Different activities for 25%, 50%, 75%, 100% growth |
| quiz-app | Correct answer celebration | Triggers `GAME_ON` for correct answers |
| event-countdown | Countdown milestones | Activities at 60s, 30s, 10s, 0s |

## Common Mistakes

1. **Not using fire-and-forget pattern**: Always append `.catch(() => {})` to activity triggers — they're non-critical and shouldn't break your flow
2. **Blocking on activity completion**: Never `await` activity triggers unless absolutely necessary — they're meant to be asynchronous
3. **Overusing activities**: Too many triggers can overwhelm visitors — use sparingly for important moments
4. **Wrong activity names**: Use standard names (`GAME_ON`, `GAME_WAITING`, `GAME_HIGH_SCORE`) or custom names configured in your world
5. **Forgetting `shouldTriggerForAllVisitors`**: Usually want `true` for shared experiences — omitting defaults to `false`
6. **Not handling errors**: Even with `.catch()`, consider logging errors for debugging

## Common Activity Names

| Activity Name | Typical Use Case |
|---------------|------------------|
| `GAME_ON` | Game start, celebration, success |
| `GAME_WAITING` | Waiting for players, lobby state |
| `GAME_HIGH_SCORE` | New high score achieved |
| `GAME_COMPLETE` | Game completion, round end |
| `GAME_COUNTDOWN` | Timer milestones |

Note: Custom activity names can be configured in the Topia world editor under Activities.

## Related Examples

- [webhook-zone-trigger.md](./webhook-zone-trigger.md) - Opening iframes based on location
- [handleGetGameState.md](./handleGetGameState.md) - Managing game state with data objects
- Topia SDK Documentation: [World.triggerActivity()](https://metaversecloud-com.github.io/mc-sdk-js/classes/World.html#triggerActivity)
- Topia SDK Documentation: [World.triggerWorldActivity()](https://metaversecloud-com.github.io/mc-sdk-js/classes/World.html#triggerWorldActivity)
