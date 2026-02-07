# Relocate Asset

> **Source**: sdk-quest
> **SDK Methods**: `droppedAsset.updatePosition(x, y)`, `droppedAsset.updateClickType()`
> **Guide Phase**: Phase 2
> **Difficulty**: Starter

## When to Use

Use this pattern when you need to move an existing dropped asset to a new position in the world. This is common in collection games where items teleport to a random location after being collected, or any scenario where assets need to be repositioned dynamically.

## Server Implementation

### Utility: Relocate a Dropped Asset to a Random Position

```ts
/**
 * Relocates a dropped asset to a random position within the world boundaries.
 * Updates the click URL with a timestamp to prevent browser/client caching of the old position.
 *
 * @param credentials - Topia credentials for API authentication
 * @param droppedAssetId - The id of the dropped asset to relocate
 * @returns Promise resolving to the updated dropped asset or error
 */
import { Credentials } from "../types.js";
import { DroppedAsset, World } from "./topiaInit.js";

export const relocateAsset = async ({
  credentials,
  droppedAssetId,
}: {
  credentials: Credentials;
  droppedAssetId: string;
}): Promise<{ success: boolean; droppedAsset: any } | Error> => {
  try {
    const { urlSlug, interactivePublicKey, sceneDropId } = credentials;

    // Create the world instance and fetch its details to get dimensions
    const world = World.create(urlSlug, { credentials });
    await world.fetchDetails();

    // World dimensions define the boundary for random positioning
    const { width, height } = world;
    if (!width || !height) throw new Error("World dimensions not available.");

    // Calculate a random position within world bounds
    // Use a margin (10%) to avoid placing assets at the very edges
    const margin = 0.1;
    const randomX = Math.floor(Math.random() * width * (1 - 2 * margin) - (width / 2) * (1 - 2 * margin));
    const randomY = Math.floor(Math.random() * height * (1 - 2 * margin) - (height / 2) * (1 - 2 * margin));

    // Get the dropped asset instance
    const droppedAsset = await DroppedAsset.get(droppedAssetId, urlSlug, {
      credentials: { ...credentials, assetId: droppedAssetId },
    });

    // Update position and click type concurrently
    await Promise.all([
      // Move the asset to the new random position
      droppedAsset.updatePosition(randomX, randomY),

      // Update the click URL with a timestamp to bust any client-side caching.
      // Without this, the client may not re-fetch the asset at its new position.
      droppedAsset.updateClickType({
        clickType: "link",
        clickableLink: `${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}?lastMoved=${new Date().valueOf()}`,
        clickableLinkTitle: "Collect Item",
        isOpenLinkInDrawer: true,
        isInteractive: true,
        interactivePublicKey,
      }),
    ]);

    return { success: true, droppedAsset };
  } catch (error) {
    return error as Error;
  }
};
```

### Controller: Handle Item Collection and Relocation

```ts
/**
 * Controller to handle collecting an item and relocating it to a new random position.
 * Used in sdk-quest when a player collects an item and it teleports elsewhere.
 *
 * @returns JSON response with updated asset position or error
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset, World } from "../utils/index.js";

export const handleCollectAndRelocate = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, interactivePublicKey } = credentials;

    // Get the dropped asset to verify it exists
    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    // Fetch world details to get dimensions for random positioning
    const world = World.create(urlSlug, { credentials });
    await world.fetchDetails();

    const { width, height } = world;
    if (!width || !height) throw new Error("World dimensions not available.");

    // Calculate random position within world bounds with 10% margin
    const margin = 0.1;
    const randomX = Math.floor(Math.random() * width * (1 - 2 * margin) - (width / 2) * (1 - 2 * margin));
    const randomY = Math.floor(Math.random() * height * (1 - 2 * margin) - (height / 2) * (1 - 2 * margin));

    // Move the asset and update its click URL with a cache-busting timestamp
    await Promise.all([
      droppedAsset.updatePosition(randomX, randomY),
      droppedAsset.updateClickType({
        clickType: "link",
        clickableLink: `${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}?lastMoved=${new Date().valueOf()}`,
        clickableLinkTitle: "Collect Item",
        isOpenLinkInDrawer: true,
        isInteractive: true,
        interactivePublicKey,
      }),
    ]);

    return res.json({
      success: true,
      newPosition: { x: randomX, y: randomY },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCollectAndRelocate",
      message: "Error relocating asset after collection",
      req,
      res,
    });
  }
};
```

## Variations

| App | Use Case | Position Strategy | Click Update |
|-----|----------|-------------------|--------------|
| sdk-quest | Items teleport after collection | Random within world bounds | Timestamp cache-bust on click URL |
| sdk-scavenger-hunt | Clues move after being found | Random within defined zone | Update clickable link with new hint |
| sdk-race | Checkpoints shift between rounds | Predetermined positions from config | No click update needed |

## Common Mistakes

- **Forgetting `world.fetchDetails()`**: You must call `fetchDetails()` before accessing `world.width` and `world.height`. Without it, dimensions will be undefined.
- **Not busting the click URL cache**: If you only call `updatePosition()` without updating the click URL timestamp, the client may continue to display the old iframe content or position. Always append `lastMoved=${new Date().valueOf()}` to the click URL.
- **Placing assets outside world bounds**: Always calculate positions relative to the world dimensions, and apply a margin to avoid placing assets at or beyond the edges where they may not be visible.
- **Missing `interactivePublicKey` in `updateClickType`**: If the asset is interactive, you must include `isInteractive: true` and `interactivePublicKey` when updating the click type, or the iframe will fail to open.

## Related Examples

- [update-asset.md](./update-asset.md) - General dropped asset property updates including position, click type, and image layers
- [drop-asset.md](./drop-asset.md) - Creating and dropping new assets into a world
- [remove-asset.md](./remove-asset.md) - Removing a dropped asset with visual effects
