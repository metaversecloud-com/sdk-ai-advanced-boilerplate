# Grant Expression (Emote) Rewards

> **Source**: sdk-quest, virtual-pet, sdk-scavenger-hunt
> **SDK Methods**: `visitor.grantExpression()`, `visitor.grantExpressionByName()`
> **Guide Phase**: Phase 6
> **Difficulty**: Intermediate

## When to Use

Use this pattern to reward visitors with expressions (emotes) for completing milestones, reaching levels, or finishing challenges. Expressions are permanent unlocks that visitors can use across all Topia worlds. Always handle 409 "already owned" responses idempotently to avoid errors when granting the same expression multiple times.

## Server Implementation

### Reusable Expression Grant Utility

```typescript
// server/utils/grantExpression.ts
import { Visitor } from "./topiaInit.js";

interface GrantExpressionResult {
  granted: boolean;
  alreadyOwned: boolean;
  expressionName: string;
}

export const grantExpression = async (
  visitor: Visitor,
  expressionName: string,
): Promise<GrantExpressionResult> => {
  try {
    await visitor.grantExpressionByName(expressionName);
    return {
      granted: true,
      alreadyOwned: false,
      expressionName,
    };
  } catch (error: any) {
    // 409 means visitor already owns this expression - treat as success
    if (error.response?.status === 409) {
      return {
        granted: false,
        alreadyOwned: true,
        expressionName,
      };
    }
    throw error; // Re-throw other errors
  }
};
```

### Milestone-Based Grant (Every N Items)

```typescript
// server/controllers/handleCollectItem.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, grantExpression } from "../utils/index.js";

export const handleCollectItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, profileId, urlSlug, uniqueName } = credentials;

    const visitor = await Visitor.create(visitorId, {
      credentials,
    });

    // Increment items collected
    await visitor.incrementDataObjectValue("itemsCollected", 1, {
      analytics: [
        {
          analyticName: "itemsCollected",
          incrementBy: 1,
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    });

    const visitorData = await visitor.fetchDataObject();
    const itemsCollected = visitorData.itemsCollected || 0;

    // Grant expression every 50 items
    let expressionGranted = null;
    if (itemsCollected % 50 === 0 && itemsCollected > 0) {
      const result = await grantExpression(visitor, "celebration");

      if (result.granted) {
        expressionGranted = result.expressionName;

        // Track granted expressions in visitor data
        const grantedExpressions = visitorData.grantedExpressions || [];
        if (!grantedExpressions.includes(expressionGranted)) {
          await visitor.updateDataObject({
            grantedExpressions: [...grantedExpressions, expressionGranted],
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        itemsCollected,
        expressionGranted,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCollectItem",
      message: "Failed to collect item",
      req,
      res,
    });
  }
};
```

### Level-Based Grant

```typescript
// server/controllers/handleLevelUp.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, grantExpression } from "../utils/index.js";

const LEVEL_EXPRESSION_MAP: Record<number, string> = {
  5: "wave",
  10: "dance",
  15: "celebrate",
  20: "heart",
};

export const handleLevelUp = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, profileId, urlSlug } = credentials;
    const { newLevel } = req.body;

    const visitor = await Visitor.create(visitorId, {
      credentials,
    });

    await visitor.updateDataObject(
      { level: newLevel },
      {
        analytics: [
          {
            analyticName: "levelUps",
            profileId,
            uniqueKey: profileId,
            urlSlug,
          },
        ],
      },
    );

    // Grant expression for milestone levels
    let expressionGranted = null;
    const expressionName = LEVEL_EXPRESSION_MAP[newLevel];

    if (expressionName) {
      const result = await grantExpression(visitor, expressionName);

      if (result.granted) {
        expressionGranted = result.expressionName;

        // Track in visitor data
        const visitorData = await visitor.fetchDataObject();
        const grantedExpressions = visitorData.grantedExpressions || [];

        if (!grantedExpressions.includes(expressionGranted)) {
          await visitor.updateDataObject({
            grantedExpressions: [...grantedExpressions, expressionGranted],
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        level: newLevel,
        expressionGranted,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleLevelUp",
      message: "Failed to level up",
      req,
      res,
    });
  }
};
```

### Completion-Based Grant

```typescript
// server/controllers/handleCompleteQuest.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, grantExpression } from "../utils/index.js";

export const handleCompleteQuest = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, profileId, urlSlug, uniqueName } = credentials;
    const { questId } = req.body;

    const visitor = await Visitor.create(visitorId, {
      credentials,
    });

    const visitorData = await visitor.fetchDataObject();
    const completedQuests = visitorData.completedQuests || [];

    // Prevent duplicate completion
    if (completedQuests.includes(questId)) {
      return res.json({
        success: true,
        data: {
          alreadyCompleted: true,
          expressionGranted: null,
        },
      });
    }

    // Mark quest complete
    await visitor.updateDataObject(
      {
        completedQuests: [...completedQuests, questId],
      },
      {
        analytics: [
          {
            analyticName: "questsCompleted",
            profileId,
            uniqueKey: profileId,
            urlSlug,
          },
        ],
      },
    );

    // Grant completion expression
    const result = await grantExpression(visitor, "victory");

    let expressionGranted = null;
    if (result.granted) {
      expressionGranted = result.expressionName;

      // Track granted expressions
      const grantedExpressions = visitorData.grantedExpressions || [];
      if (!grantedExpressions.includes(expressionGranted)) {
        await visitor.updateDataObject({
          grantedExpressions: [...grantedExpressions, expressionGranted],
        });
      }
    }

    return res.json({
      success: true,
      data: {
        questId,
        expressionGranted,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCompleteQuest",
      message: "Failed to complete quest",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Types

```typescript
// client/src/context/types.ts
export interface VisitorData {
  itemsCollected?: number;
  level?: number;
  completedQuests?: string[];
  grantedExpressions?: string[];
}

export interface ExpressionGrantNotification {
  expressionName: string;
  timestamp: number;
}
```

### Reducer Action

```typescript
// client/src/context/GlobalContext.tsx
export const globalReducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case "SET_GAME_STATE":
      return {
        ...state,
        visitorData: action.payload.visitorData,
      };
    // ... other cases
  }
};
```

### Toast Notification Component

```typescript
// client/src/components/ExpressionToast.tsx
import { useEffect, useState } from "react";

interface ExpressionToastProps {
  expressionName: string;
  onClose: () => void;
}

export const ExpressionToast = ({ expressionName, onClose }: ExpressionToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="card" style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1000 }}>
      <div className="card-details">
        <h3 className="card-title">New Expression Unlocked!</h3>
        <p className="card-description p2">You earned the "{expressionName}" emote</p>
      </div>
    </div>
  );
};
```

### Component Usage

```typescript
// client/src/pages/GamePage.tsx
import { useContext, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { backendAPI, setErrorMessage } from "@/utils";
import { ErrorType } from "@/context/types";
import { ExpressionToast } from "@/components/ExpressionToast";

export const GamePage = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const state = useContext(GlobalStateContext);
  const [toastExpression, setToastExpression] = useState<string | null>(null);

  const handleCollectItem = async () => {
    try {
      const response = await backendAPI.post("/api/collect-item");

      if (response.data.success) {
        const { itemsCollected, expressionGranted } = response.data.data;

        // Update global state
        dispatch({
          type: "SET_GAME_STATE",
          payload: {
            visitorData: {
              ...state.visitorData,
              itemsCollected,
            },
          },
        });

        // Show toast if expression was granted
        if (expressionGranted) {
          setToastExpression(expressionGranted);
        }
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <div className="container">
      <h2 className="h2">Items Collected: {state.visitorData?.itemsCollected || 0}</h2>
      <button className="btn" onClick={handleCollectItem}>
        Collect Item
      </button>

      {toastExpression && (
        <ExpressionToast expressionName={toastExpression} onClose={() => setToastExpression(null)} />
      )}

      <div className="card">
        <div className="card-details">
          <h3 className="card-title">Unlocked Expressions</h3>
          {state.visitorData?.grantedExpressions?.length ? (
            <ul>
              {state.visitorData.grantedExpressions.map((expr) => (
                <li key={expr} className="p2">
                  {expr}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p2">No expressions unlocked yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
```

## Variations

| App | Grant Trigger | Expression Name | Track in Data Object |
|-----|--------------|----------------|---------------------|
| **sdk-quest** | Quest completion | "victory" | `grantedExpressions[]` |
| **virtual-pet** | Pet reaches max level | "celebrate" | `petAchievements.expressionsEarned` |
| **sdk-scavenger-hunt** | Every 50 items found | "treasure" | `milestones.expressions` |
| **trivia-game** | 10 correct answers streak | "genius" | `rewards.expressions` |
| **obstacle-course** | Course completion under time | "champion" | `completions.expressionRewards` |

## Common Mistakes

1. **Not handling 409 responses idempotently**: Always catch 409 status codes (already owned) and treat them as success. Failing to do so will throw errors when attempting to grant the same expression twice.

2. **Forgetting to track granted expressions**: Store granted expressions in visitor data object to display unlocks and prevent redundant grant attempts.

3. **Missing toast notifications**: Always show a UI notification when a new expression is granted. Users need immediate feedback for this reward.

4. **Granting expressions without milestones**: Don't grant expressions too frequently or they lose value. Use clear milestones (every 50 items, level 5, quest completion).

5. **Not using analytics**: Expression grants are significant events. Always include analytics to track engagement with the reward system.

6. **Hard-coding expression names**: Use constants or maps for expression names to make them easy to update and maintain.

7. **Skipping validation**: Verify the visitor actually earned the expression before granting (e.g., check level, item count, quest completion).

## Related Examples

- **inventoryCache.md** - Granting inventory items (badges, decorations) follows similar patterns
- **handleGetGameState.md** - Initialize visitor data object to track granted expressions
- **handleUpdateDroppedAsset.md** - Update asset state when expressions are granted as group rewards
