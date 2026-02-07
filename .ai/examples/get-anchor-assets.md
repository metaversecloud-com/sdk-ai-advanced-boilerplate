Use the SDK's World controller to retrieve Dropped Assets from within a world given scene drop id and (optionally) a unique name. This method is especially useful when you may have multiple scenes within a world that have dropped assets with the same unique name but you only want to return matches for a specific scene.

```ts
/**
 * Retrieves assets with "anchor" uniqueName for a specific sceneDropId
 *
 * @returns Promise resolving to anchor assets and their ids, or an error
 */
import { Request, Response } from "express";
import { DroppedAssetInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, World } from "../../server/utils/index.ts";

export const getAnchorAssets = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { sceneDropId, urlSlug } = credentials;

    // Create a world instance using the Topia SDK
    const world = World.create(urlSlug, { credentials });

    // Fetch all assets with the given sceneDropId and uniqueName "anchor"
    const anchorAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsBySceneDropId({
      sceneDropId,
      uniqueName: "anchor",
    });

    // Extract and validate asset ids
    const anchorAssetIds = anchorAssets.map(({ id }) => id).filter((id): id is string => typeof id === "string");

    if (anchorAssetIds.length === 0) throw "No anchor assets found.";

    return res.json({
      anchorAssets,
      anchorAssetIds,
      success: true,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "getAnchorAssets",
      message: "Error getting dropped assets with unique name 'anchor'",
      req,
      res,
    });
  }
};
```
