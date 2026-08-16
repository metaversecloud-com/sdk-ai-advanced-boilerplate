Use the SDK's DroppedAsset controller to update dropped asset properties including click behavior and visual representation

```ts
/**
 * Controller to update various details for a given Dropped Asset in a Topia world
 * Demonstrates updating multiple properties concurrently using Promise.all
 *
 * Key functionality:
 * - Retrieves a specific dropped asset using its id
 * - Updates the dropped asset's click behavior (what happens when users click it)
 * - Updates the dropped asset's visual appearance (web image layers)
 * - Updates the dropped asset's position in the world
 *
 * @returns JSON response with updated Dropped Asset details or error information
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset } from "../../server/utils/index.js";
import { DroppedAssetClickType } from "@rtsdk/topia";

export const handleUpdateDroppedAsset = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    // Extract Topia credentials from the request query parameters
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    // Create a DroppedAsset instance for the specified dropped asset in the specified world
    // This doesn't actually create a new dropped asset, but rather creates a controller for an existing one
    const droppedAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });

    // Execute multiple updates concurrently using Promise.all for better performance
    await Promise.all([
      // Update how the dropped asset behaves when clicked by users in the world
      droppedAsset.updateClickType({
        // Set asset to open a URL when clicked
        clickType: DroppedAssetClickType.LINK,
        // The URL to open when clicked
        clickableLink: "https://topia.io",
        clickableLinkTitle: "My awesome link!",
        clickableDisplayTextDescription: "Description",
        clickableDisplayTextHeadline: "Title",
        isOpenLinkInDrawer: true,
      }),
      // Update the visual appearance of the asset
      // First parameter is for the bottom layer and the second is for the top layer
      droppedAsset.updateWebImageLayers(
        "",
        "https://www.shutterstock.com/image-vector/colorful-illustration-test-word-260nw-1438324490.jpg",
      ),
      // Update the location of the dropped asset.
      // Parameters in order represent x, y and yOrderAdjust
      droppedAsset.updatePosition(100, 200, 100);
    ]);

    // Return a successful response with the updated asset details
    // The droppedAsset object contains all current properties of the asset
    return res.json({
      droppedAsset,
      success: true,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    // The errorHandler utility provides consistent error formatting and logging
    return errorHandler({
      error,
      functionName: "handleUpdateDroppedAsset",
      message: "Error updating dropped asset details.",
      req,
      res,
    });
  }
};
```

Notes:

- This example demonstrates updating multiple properties of a dropped asset in a single API call
- The `DroppedAsset.create()` method doesn't actually create a new asset - it creates a controller for an existing one
- Using `Promise.all()` improves performance by executing multiple updates concurrently
- Available click types include LINK, IFRAME, TELEPORT, NONE, and others defined in the Topia SDK
- For production use, validate input data from request body instead of using hardcoded values
- Consider adding analytics tracking for asset updates using the SDK's analytics capabilities

````
```
````
