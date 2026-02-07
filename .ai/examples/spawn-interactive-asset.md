# Spawn Interactive Asset

> **Source**: virtual-pet, sdk-scavenger-hunt
> **SDK Methods**: `Asset.create()`, `DroppedAsset.drop()`, `DroppedAssetClickType.LINK`
> **Guide Phase**: Phase 2
> **Difficulty**: Intermediate
> **Tags**: `create, interactive, iframe, click, spawn, dynamic, pet, webhook`

## When to Use

Use this pattern when you need to programmatically create a new interactive asset in the world that opens an iframe when clicked. This covers scenarios like spawning a virtual pet near its owner, placing scavenger hunt clues at specific locations, or dynamically adding any interactive element that visitors can interact with through a drawer/iframe.

## Server Implementation

### Utility: Spawn an Interactive Dropped Asset

```ts
/**
 * Creates a new web image asset and drops it into the world as an interactive element.
 * The spawned asset opens an iframe when clicked, using the app's interactive public key.
 *
 * @param credentials - Topia credentials for API authentication
 * @param imageUrl - The URL of the image to display for the asset
 * @param position - The x, y coordinates to place the asset
 * @param uniqueNameSuffix - A suffix to create a unique name for the asset (e.g., visitorId or item name)
 * @param dataObject - Optional initial data object to set on the spawned asset
 * @returns Promise resolving to the dropped asset instance or error
 */
import { DroppedAssetClickType } from "@rtsdk/topia";
import { Credentials } from "../types.js";
import { Asset, DroppedAsset } from "./topiaInit.js";

export const spawnInteractiveAsset = async ({
  credentials,
  imageUrl,
  position,
  uniqueNameSuffix,
  dataObject,
}: {
  credentials: Credentials;
  imageUrl: string;
  position: { x: number; y: number };
  uniqueNameSuffix: string;
  dataObject?: Record<string, any>;
}): Promise<{ success: boolean; droppedAsset: any } | Error> => {
  try {
    const { urlSlug, interactivePublicKey, sceneDropId } = credentials;

    // Step 1: Create an asset reference using the AssetFactory.
    // This does not drop anything into the world yet - it creates an asset shell.
    const webImageAsset = await Asset.create("webImageAsset", {
      credentials,
    });

    // Step 2: Build a unique name for the dropped asset.
    // Convention: sceneDropId-purpose-identifier
    // This allows you to later query for these assets using fetchDroppedAssetsWithUniqueName.
    const uniqueName = `${sceneDropId}-spawned-${uniqueNameSuffix}`;

    // Step 3: Drop the asset into the world with full interactive configuration.
    const droppedAsset = await DroppedAsset.drop(webImageAsset, {
      // Click behavior: open an iframe in the drawer when clicked
      clickType: DroppedAssetClickType.LINK,
      clickableLink: `${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}`,
      clickableLinkTitle: "Open",
      clickableDisplayTextDescription: "",
      clickableDisplayTextHeadline: "",
      isOpenLinkInDrawer: true,

      // Interactive configuration: required for the iframe to work
      isInteractive: true,
      interactivePublicKey,

      // Visual appearance: layer0 is the bottom layer, layer1 overlays on top
      layer0: imageUrl,
      layer1: "",

      // Position in the world
      position: {
        x: position.x,
        y: position.y,
      },

      // Scene and world identifiers
      sceneDropId,
      urlSlug,

      // Unique name for querying later
      uniqueName,
    });

    // Step 4: Optionally set initial data on the spawned asset.
    // This is useful for storing metadata like owner, type, creation time, etc.
    if (dataObject && droppedAsset.id) {
      const spawnedAsset = await DroppedAsset.get(droppedAsset.id, urlSlug, {
        credentials: { ...credentials, assetId: droppedAsset.id },
      });
      await spawnedAsset.setDataObject(dataObject);
    }

    return { success: true, droppedAsset };
  } catch (error) {
    return error as Error;
  }
};
```

### Controller: Handle Spawning a Pet (virtual-pet pattern)

```ts
/**
 * Controller to spawn a virtual pet near the visitor's current position.
 * Demonstrates the full flow: get visitor position, spawn asset, set ownership data.
 *
 * @returns JSON response with the spawned pet asset or error
 */
import { Request, Response } from "express";
import { DroppedAssetClickType } from "@rtsdk/topia";
import { errorHandler, getCredentials, Asset, DroppedAsset, Visitor } from "../utils/index.js";

export const handleSpawnPet = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId, interactivePublicKey, sceneDropId, displayName } = credentials;
    const { petType, petImageUrl } = req.body;

    if (!petType || !petImageUrl) {
      return res.status(400).json({ success: false, error: "petType and petImageUrl are required." });
    }

    // Get the visitor to determine their current position for spawning nearby
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    const visitorPosition = visitor.position || { x: 0, y: 0 };

    // Offset the pet slightly from the visitor so they don't overlap
    const petPosition = {
      x: (visitorPosition.x || 0) + 50,
      y: (visitorPosition.y || 0) + 50,
    };

    // Create the asset shell
    const webImageAsset = await Asset.create("webImageAsset", { credentials });

    // Drop the interactive asset into the world
    const droppedAsset = await DroppedAsset.drop(webImageAsset, {
      clickType: DroppedAssetClickType.LINK,
      clickableLink: `${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}`,
      clickableLinkTitle: `${displayName}'s ${petType}`,
      isOpenLinkInDrawer: true,
      isInteractive: true,
      interactivePublicKey,
      layer0: petImageUrl,
      position: petPosition,
      sceneDropId,
      uniqueName: `${sceneDropId}-pet-${profileId}`,
      urlSlug,
    });

    // Set ownership and metadata on the pet asset
    if (droppedAsset.id) {
      const petAsset = await DroppedAsset.get(droppedAsset.id, urlSlug, {
        credentials: { ...credentials, assetId: droppedAsset.id },
      });

      const lockId = `${droppedAsset.id}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
      await petAsset.setDataObject(
        {
          ownerProfileId: profileId,
          ownerDisplayName: displayName,
          petType,
          createdAt: new Date().toISOString(),
          level: 1,
          happiness: 100,
        },
        { lock: { lockId, releaseLock: true } },
      );
    }

    return res.json({
      success: true,
      petAssetId: droppedAsset.id,
      position: petPosition,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSpawnPet",
      message: "Error spawning pet asset",
      req,
      res,
    });
  }
};
```

### Controller: Handle Spawning a Clue (scavenger-hunt pattern)

```ts
/**
 * Controller to spawn a scavenger hunt clue at a specified position.
 * Admin-only operation that creates a clickable clue asset in the world.
 *
 * @returns JSON response with the spawned clue asset or error
 */
import { Request, Response } from "express";
import { VisitorInterface, DroppedAssetClickType } from "@rtsdk/topia";
import { errorHandler, getCredentials, Asset, DroppedAsset, Visitor } from "../utils/index.js";

export const handleSpawnClue = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, interactivePublicKey, sceneDropId } = credentials;
    const { clueNumber, clueImageUrl, position, hintText } = req.body;

    // Verify admin permission
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, error: "Only admins can spawn clues." });
    }

    // Create and drop the clue asset
    const webImageAsset = await Asset.create("webImageAsset", { credentials });

    const droppedAsset = await DroppedAsset.drop(webImageAsset, {
      clickType: DroppedAssetClickType.LINK,
      clickableLink: `${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}`,
      clickableLinkTitle: `Clue #${clueNumber}`,
      clickableDisplayTextDescription: hintText || "",
      clickableDisplayTextHeadline: `Clue #${clueNumber}`,
      isOpenLinkInDrawer: true,
      isInteractive: true,
      interactivePublicKey,
      layer0: clueImageUrl,
      position: { x: position.x, y: position.y },
      sceneDropId,
      uniqueName: `${sceneDropId}-clue-${clueNumber}`,
      urlSlug,
    });

    // Set clue metadata
    if (droppedAsset.id) {
      const clueAsset = await DroppedAsset.get(droppedAsset.id, urlSlug, {
        credentials: { ...credentials, assetId: droppedAsset.id },
      });
      await clueAsset.setDataObject({
        clueNumber,
        hintText: hintText || "",
        foundBy: {},
      });
    }

    return res.json({
      success: true,
      clueAssetId: droppedAsset.id,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSpawnClue",
      message: "Error spawning clue asset",
      req,
      res,
    });
  }
};
```

## Variations

| App | Asset Purpose | Unique Name Convention | Data Object Contents | Position Strategy |
|-----|--------------|----------------------|---------------------|-------------------|
| virtual-pet | Pet that follows owner | `{sceneDropId}-pet-{profileId}` | Owner, type, level, happiness | Offset from visitor position |
| sdk-scavenger-hunt | Clickable clue | `{sceneDropId}-clue-{clueNumber}` | Clue number, hint text, found-by map | Admin-specified coordinates |
| sdk-grow-together | Planted seed/tree | `{sceneDropId}-plant-{profileId}` | Plant type, growth stage, wateredBy | Grid-snapped position |

## Common Mistakes

- **Forgetting `isInteractive: true`**: Without this flag, the asset will not open an iframe when clicked, even if `clickType` and `interactivePublicKey` are set correctly.
- **Missing `interactivePublicKey`**: The interactive public key from credentials must be passed in the drop options. Without it, the SDK cannot associate the asset with your app.
- **Not setting `isOpenLinkInDrawer: true`**: If omitted, the click may open a new browser tab instead of the in-world iframe drawer. Most interactive apps require the drawer behavior.
- **Duplicate unique names**: If you spawn multiple assets with the same `uniqueName`, querying by unique name will return all of them. Use a convention that includes a unique identifier (profileId, clueNumber, timestamp) to ensure each spawned asset can be individually addressed.
- **Not setting a data object after drop**: The `DroppedAsset.drop()` call does not accept a `dataObject` parameter directly. You must get the dropped asset instance after dropping and then call `setDataObject()` separately.
- **Skipping admin checks for admin-only spawning**: Always verify `visitor.isAdmin` before allowing operations that place persistent assets in the world.

## Related Examples

- [drop-asset.md](./drop-asset.md) - Creating and dropping assets with image and text layers
- [update-asset.md](./update-asset.md) - Updating properties of existing dropped assets
- [remove-asset.md](./remove-asset.md) - Removing a dropped asset with visual effects and notifications
- [get-anchor-assets.md](./get-anchor-assets.md) - Querying dropped assets by unique name within a scene
