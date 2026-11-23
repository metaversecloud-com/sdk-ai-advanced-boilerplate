Use the SDK's World controller to retrieve and initialize world data objects with proper locking and defaults

```ts
/**
 * Utility function to get a world instance and its data object, initializing it if needed
 *
 * @param credentials - Topia credentials including urlSlug and assetId
 * @returns Promise resolving to the world data object and instance, or an error
 */
import { Credentials } from "../../server/types/Credentials.ts";
import { DroppedAsset, World } from "../../server/utils/index.ts";

/**
 * Structure of the world data object containing configuration by sceneDropId
 */
type WorldDataObject = {
  [sceneDropId: string]: {
    theme: string;
  };
};

export const getWorldAndDataObject = async ({ credentials }: { credentials: Credentials }) => {
  try {
    const { assetId, urlSlug, sceneDropId } = credentials;

    // Create a world instance using the Topia SDK
    const world = World.create(urlSlug, { credentials });

    // Fetch the world's current data object
    await world.fetchDataObject();

    let dataObject = world.dataObject as WorldDataObject;

    // Check if scene configuration exists for this sceneDropId
    if (!dataObject?.[sceneDropId]) {
      // If not, get the dropped asset to check for theme information
      const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
      await droppedAsset.fetchDataObject();

      const { theme } = droppedAsset.dataObject as { theme?: string };
      if (!theme) throw "Key asset is missing required theme in its data object.";

      // Create a lock id that expires after 5 minutes that prevents multiple users from updating the same data object at the same time.
      const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

      // Initialize the world data object with the scene configuration
      if (!world.dataObject) {
        // If no scenes data exists, create it from scratch
        await world.setDataObject({ [sceneDropId]: { theme } }, { lock: { lockId, releaseLock: true } });
      } else {
        await world.updateDataObject({ [sceneDropId]: { theme } }, { lock: { lockId, releaseLock: true } });
      }

      // Fetch the updated data object
      await world.fetchDataObject();
      dataObject = world.dataObject as WorldDataObject;
    }

    return { dataObject: dataObject[sceneDropId], world };
  } catch (error: any) {
    // Forward the error for handling at the controller level
    return standardizeError(error);
  }
};
```

## handleGetConfiguration

Use the SDK to retrieve visitor expressions (emotes) and theme configuration from world data objects

```ts
/**
 * Controller to get application configuration including available emotes and theme
 *
 * @returns JSON response with emotes and theme configuration
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../../server/utils/index.js";

interface Expression {
  id: string;
  name: string;
  expressionImage?: string;
  type: string;
}

export const handleGetConfiguration = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Get world data object which contains theme configuration
    const getWorldDataObjectResult = await getWorldDataObject(credentials);
    if (getWorldDataObjectResult instanceof Error) throw getWorldDataObjectResult;

    const { theme } = getWorldDataObjectResult.dataObject;

    // Get visitor to check admin status and available expressions
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor;

    // Get available expressions (emotes)
    const availableExpressions = (await visitor.getExpressions({ getUnlockablesOnly: true })) as Expression[];

    // Format the expressions for client consumption
    const emotes = availableExpressions.map((expression) => ({
      id: expression.id,
      name: expression.name,
      type: expression.type,
      previewUrl: expression.expressionImage,
    }));

    // Return the configuration data
    return res.json({
      emotes,
      isAdmin,
      success: true,
      theme,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetConfiguration",
      message: "Error loading configuration.",
      req,
      res,
    });
  }
};
```
