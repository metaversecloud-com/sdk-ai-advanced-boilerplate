Use the SDK's World controller to reset game state by fetching dropped assets with specific unique name and then updating data object

```ts
/**
 * Handles allowing admins only to reset the game state, including clearing leaderboard data
 * and counting checkpoint assets
 *
 * @returns Promise resolving to updated game state or error handled by errorHandler
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { Visitor, World, errorHandler, getCredentials } from "../../server/utils/index.js";

export const handleResetGameState = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, sceneDropId, urlSlug, visitorId } = credentials;

    // Verify the user is an admin before allowing reset operation
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You must be an admin to reset the game state",
      });
    }

    // Create a world instance and fetch its current data object
    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();

    // Count checkpoint assets in the world
    const checkpointAssets = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "checkpoint",
      isPartial: false,
    });

    const numberOfCheckpoints = checkpointAssets?.length || 0;

    const analytics = [
      {
        analyticName: "resets",
        profileId,
        uniqueKey: profileId,
        urlSlug,
      },
    ];

    const lockId = `${sceneDropId}-${resetCount}-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`

    // Update the world data object with reset game state
    if (!world.dataObject) {
      // If no data object exists, initialize it
      await world.setDataObject(
        {
          [sceneDropId]: {
            numberOfCheckpoints: numberOfCheckpoints,
            leaderboard: {},
          },
        },
        {
          analytics,
          { lock: { lockId, releaseLock: true } },
        },
      );
    } else {
      // Update existing data for this scene
      await world.updateDataObject(
        {
          [`${sceneDropId}.numberOfCheckpoints`]: numberOfCheckpoints,
          [`${sceneDropId}.leaderboard`]: {},
        },
        {
          analytics,
          { lock: { lockId, releaseLock: true } }, },
      );
    }

    // Fetch the updated data object
    await world.fetchDataObject();

    // Return the updated game state
    return res.json({
      success: true,
      gameState: (world.dataObject as { [key: string]: any })?.[sceneDropId] || {},
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetGameState",
      message: "Error resetting game state",
      req,
      res,
    });
  }
};
```
