# Scene Switching Pattern

> **Source**: scene-swapper, sdk-race
> **SDK Methods**: `world.dropScene()`, `World.deleteDroppedAssets()`
> **Guide Phase**: Phase 2
> **Difficulty**: Advanced
> **Tags**: `scene, switch, swap, level, stage, transition, cleanup`

## When to Use

Use this pattern when your app needs to dynamically change the environment by replacing scene assets. This is ideal for multi-stage games, environment themes, or admin-controlled world transformations. The pattern handles safe removal of old assets while preserving the key interactive asset that hosts your app.

## Server Implementation

### Controller: Handle Scene Switch

```ts
// server/controllers/handleSceneSwitch.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, World, DroppedAsset } from "../utils/index.js";

interface SceneConfig {
  sceneId: string;
  name: string;
}

const SCENES: SceneConfig[] = [
  { sceneId: "scene-id-1", name: "Forest" },
  { sceneId: "scene-id-2", name: "Desert" },
  { sceneId: "scene-id-3", name: "Arctic" },
];

export const handleSceneSwitch = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;

    // Initialize SDK instances
    const world = await World.create(urlSlug, {
      credentials,
    });

    const droppedAsset = await DroppedAsset.create(assetId, urlSlug, {
      credentials,
    });

    // Check admin status
    const visitor = await world.fetchVisitor(visitorId);
    if (!visitor?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only admins can switch scenes",
      });
    }

    // Get current scene index from data object
    const dataObject = await droppedAsset.fetchDataObject();
    const currentSceneIndex = dataObject?.currentSceneIndex ?? 0;

    // Calculate next scene index (cycle through scenes)
    const nextSceneIndex = (currentSceneIndex + 1) % SCENES.length;
    const nextScene = SCENES[nextSceneIndex];

    // Check cooldown (prevent rapid switching)
    const lastSwitchTime = dataObject?.lastSwitchTime ?? 0;
    const COOLDOWN_MS = 5000; // 5 seconds
    const now = Date.now();

    if (now - lastSwitchTime < COOLDOWN_MS) {
      const remainingTime = Math.ceil((COOLDOWN_MS - (now - lastSwitchTime)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${remainingTime} seconds before switching scenes`,
      });
    }

    // Get all dropped assets in the world
    const allAssets = await world.fetchDroppedAssets();

    // Filter out the key interactive asset (preserve it)
    const assetsToDelete = allAssets
      .filter((asset) => asset.id !== assetId)
      .map((asset) => ({
        id: asset.id,
        isBlockedByMedia: asset.isBlockedByMedia || false,
      }));

    // Delete old scene assets (batch operation)
    if (assetsToDelete.length > 0) {
      await World.deleteDroppedAssets(urlSlug, {
        credentials,
        droppedAssets: assetsToDelete,
      });
    }

    // Get position for new scene (use interactive asset position)
    const assetDetails = await droppedAsset.fetchDetails();
    const position = {
      x: assetDetails.position.x,
      y: assetDetails.position.y,
    };

    // Drop new scene
    const sceneDropId = `scene-${nextSceneIndex}-${Date.now()}`;
    await world.dropScene({
      sceneId: nextScene.sceneId,
      position,
      sceneDropId,
    });

    // Update data object with current scene info
    const lockId = `scene-switch-${assetId}-${Date.now()}`;
    await droppedAsset.updateDataObject(
      {
        currentSceneIndex: nextSceneIndex,
        currentSceneName: nextScene.name,
        lastSwitchTime: now,
      },
      {
        lock: { lockId, releaseLock: true },
      },
    );

    return res.json({
      success: true,
      data: {
        sceneName: nextScene.name,
        sceneIndex: nextSceneIndex,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSceneSwitch",
      message: "Failed to switch scene",
      req,
      res,
    });
  }
};
```

### Route Registration

```ts
// server/routes.ts
import { handleSceneSwitch } from "./controllers/handleSceneSwitch.js";

router.post("/api/scene/switch", handleSceneSwitch);
```

## Client Implementation

### Types

```ts
// client/src/context/types.ts
export interface GameState {
  currentSceneName?: string;
  currentSceneIndex?: number;
  lastSwitchTime?: number;
  // ... other fields
}

export type Action =
  | { type: "SET_GAME_STATE"; payload: GameState }
  | { type: "UPDATE_SCENE"; payload: { sceneName: string; sceneIndex: number } };
// ... other actions
```

### Reducer Update

```ts
// client/src/context/GlobalContext.tsx
case "UPDATE_SCENE":
  return {
    ...state,
    gameState: {
      ...state.gameState,
      currentSceneName: action.payload.sceneName,
      currentSceneIndex: action.payload.sceneIndex,
    },
  };
```

### Component Usage

```tsx
// client/src/components/SceneSwitcher.tsx
import { useContext, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const SceneSwitcher = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { gameState } = useContext(GlobalStateContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchScene = async () => {
    setIsLoading(true);
    try {
      const response = await backendAPI.post("/api/scene/switch");

      if (response.data.success) {
        dispatch({
          type: "UPDATE_SCENE",
          payload: {
            sceneName: response.data.data.sceneName,
            sceneIndex: response.data.data.sceneIndex,
          },
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
        <h3 className="card-title">Scene Control</h3>
        <p className="card-description p2">
          Current Scene: {gameState?.currentSceneName || "Unknown"}
        </p>
        <div className="card-actions">
          <button className="btn" onClick={handleSwitchScene} disabled={isLoading}>
            {isLoading ? "Switching..." : "Switch Scene"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Variations

| App | Adaptation | Notes |
|-----|-----------|-------|
| scene-swapper | Admin panel with scene preview cards | Shows thumbnails of all available scenes |
| sdk-race | Auto-switch after race completion | Cycles to next track automatically |
| theme-cycler | Time-based scene rotation | Switches scenes every N minutes |
| event-world | Manual scene selection dropdown | Allows direct jump to any scene |

## Common Mistakes

1. **Deleting the key asset**: Always filter out `assetId` from deletion array — deleting it will break your app
2. **No cooldown protection**: Rapid scene switches can overwhelm the API and create race conditions
3. **Missing admin check**: Scene switching is typically admin-only to prevent griefing
4. **Not persisting state**: Store `currentSceneIndex` on data object to survive app reloads
5. **Batch delete too large**: If you have 100+ assets, consider pagination or limiting scope
6. **Forgetting `isBlockedByMedia`**: Include this property when building the `assetsToDelete` array

## Related Examples

- [handleDropAssets.md](./handleDropAssets.md) - Understanding asset dropping fundamentals
- [handleUpdateDroppedAsset.md](./handleUpdateDroppedAsset.md) - Data object persistence patterns
- [handleRemoveDroppedAsset.md](./handleRemoveDroppedAsset.md) - Asset deletion patterns
- [handleGetConfiguration.md](./handleGetConfiguration.md) - Data object initialization for scene state
