# Phase 2: Core Game Logic

## Prerequisites

- Phase 1 completed (boilerplate, SDK init, credentials flow)

## What You Will Build

- Controller pattern for all route handlers
- Key asset pattern (the interactive asset that opens your app)
- Dropped asset management: create, update, remove
- Querying assets by unique name and scene

## The Key Asset Pattern

Every Topia SDK app starts from a "key asset" -- the interactive dropped asset in the world that a visitor clicks to open your app's iframe. The `assetId` in credentials refers to this asset.

The key asset is the central data hub for your app. Store shared state (leaderboards, configuration, game settings) on its data object.

```typescript
// Get the key asset
const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
await droppedAsset.fetchDataObject();

// Access its data
const gameConfig = droppedAsset.dataObject;
```

## Controller Pattern

Every controller follows the same structure:

```typescript
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";

export const handleAction = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    // 1. Extract credentials
    const credentials = getCredentials(req.query);

    // 2. SDK operations
    // ...

    // 3. Return success response
    return res.json({ success: true, data: result });
  } catch (error) {
    // 4. Consistent error handling
    return errorHandler({
      error,
      functionName: "handleAction",
      message: "Error performing action",
      req,
      res,
    });
  }
};
```

## Step 1: Dropping Assets into the World

Use `Asset.create` to make an asset template, then `DroppedAsset.drop` to place it in the world.

```typescript
import { Request, Response } from "express";
import { errorHandler, getCredentials, Asset, DroppedAsset } from "../utils/index.js";

export const handleDropAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, interactivePublicKey, sceneDropId } = credentials;

    // Get the key asset to determine position
    const keyAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    const { position } = keyAsset;

    // Create a web image asset template
    const webImageAsset = await Asset.create("webImageAsset", { credentials });

    // Drop it into the world
    const droppedAsset = await DroppedAsset.drop(webImageAsset, {
      position: {
        x: (position?.x || 0) + 10,
        y: (position?.y || 0) + 10,
      },
      layer0: "https://example.com/my-image.png",
      isInteractive: true,
      interactivePublicKey,
      sceneDropId,
      uniqueName: `${sceneDropId}-item-${Date.now()}`,
      urlSlug,
    });

    return res.json({ success: true, droppedAssetId: droppedAsset.id });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDropAsset",
      message: "Error dropping asset",
      req,
      res,
    });
  }
};
```

### Drop Options Reference

| Option | Type | Purpose |
|--------|------|---------|
| `position` | `{ x, y }` | World coordinates |
| `layer0` | `string` | Bottom image layer URL |
| `layer1` | `string` | Top image layer URL |
| `isInteractive` | `boolean` | Makes asset clickable |
| `interactivePublicKey` | `string` | Your app's public key |
| `sceneDropId` | `string` | Scene association |
| `uniqueName` | `string` | Queryable identifier |
| `urlSlug` | `string` | World identifier |
| `clickType` | `DroppedAssetClickType` | Click behavior |
| `text` | `string` | Text content (for text assets) |
| `textColor`, `textSize`, `textWeight`, `textWidth` | various | Text styling |
| `yOrderAdjust` | `number` | Z-ordering offset |

## Step 2: Updating Dropped Assets

Use `DroppedAsset.create` (lightweight, no fetch) to get a controller, then call update methods. Use `Promise.all` for concurrent updates.

```typescript
import { Request, Response } from "express";
import { DroppedAssetClickType } from "@rtsdk/topia";
import { errorHandler, getCredentials, DroppedAsset } from "../utils/index.js";

export const handleUpdateAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    const droppedAsset = await DroppedAsset.create(assetId, urlSlug, { credentials });

    // Update multiple properties concurrently
    await Promise.all([
      droppedAsset.updateClickType({
        clickType: DroppedAssetClickType.LINK,
        clickableLink: "https://topia.io",
        clickableLinkTitle: "Visit Topia",
        isOpenLinkInDrawer: true,
      }),
      droppedAsset.updateWebImageLayers(
        "https://example.com/bottom-layer.png",
        "https://example.com/top-layer.png",
      ),
      droppedAsset.updatePosition(100, 200),
    ]);

    return res.json({ success: true, droppedAsset });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateAsset",
      message: "Error updating asset",
      req,
      res,
    });
  }
};
```

### Update Methods Reference

| Method | Parameters | Purpose |
|--------|-----------|---------|
| `updateClickType(opts)` | Click type, link, title, drawer | Change click behavior |
| `updateWebImageLayers(bottom, top)` | Two image URLs | Change visual appearance |
| `updatePosition(x, y)` | Coordinates | Move asset |
| `updateCustomTextAsset(style, text)` | Style object, text string | Update text content |
| `deleteDroppedAsset()` | none | Remove from world |

## Step 3: Removing Dropped Assets

### Single Asset Removal

```typescript
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset } from "../utils/index.js";

export const handleRemoveAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    // Delete the asset
    await droppedAsset.deleteDroppedAsset();

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleRemoveAsset",
      message: "Error removing asset",
      req,
      res,
    });
  }
};
```

### Bulk Asset Removal

Use `World.deleteDroppedAssets` for removing multiple assets at once:

```typescript
const world = World.create(urlSlug, { credentials });
await world.fetchDataObject();

const { droppedAssetIds } = world.dataObject as { droppedAssetIds: string[] };

if (droppedAssetIds && droppedAssetIds.length > 0) {
  // Filter out the key asset so the app remains functional
  const idsToRemove = droppedAssetIds.filter((id: string) => id !== assetId);

  await World.deleteDroppedAssets(urlSlug, idsToRemove, process.env.INTERACTIVE_SECRET!, credentials);
}
```

## Step 4: Querying Assets

### By Unique Name

Find all assets matching a unique name across the world:

```typescript
const world = World.create(urlSlug, { credentials });
const assets = await world.fetchDroppedAssetsWithUniqueName({
  uniqueName: "quest-item",
  isPartial: false,  // exact match; set true for prefix matching
});
```

### By Scene Drop ID

Find assets within a specific scene, optionally filtered by unique name:

```typescript
const world = World.create(urlSlug, { credentials });
const sceneAssets = await world.fetchDroppedAssetsBySceneDropId({
  sceneDropId,
  uniqueName: "anchor",  // optional filter
});
```

### Unique Name Conventions

Use a consistent naming scheme for queryable assets:

```
{sceneDropId}-{type}-{identifier}
```

Examples:
- `scene123-image-asset456` -- image asset dropped by key asset
- `scene123-text-asset456` -- paired text asset
- `checkpoint` -- checkpoint markers (exact match)
- `quest-item` -- collectible items

## Step 5: Registering Routes

Add routes in `server/routes.ts`:

```typescript
import { Router } from "express";
import {
  handleGetGameState,
  handleDropAsset,
  handleUpdateAsset,
  handleRemoveAsset,
} from "./controllers/index.js";

const router = Router();

router.get("/", (req, res) => res.json({ success: true }));
router.get("/game-state", handleGetGameState);
router.post("/drop-asset", handleDropAsset);
router.put("/update-asset", handleUpdateAsset);
router.delete("/remove-asset", handleRemoveAsset);

export default router;
```

## Step 6: Admin Guard Pattern

Many actions should be admin-only. Check `visitor.isAdmin`:

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

if (!visitor.isAdmin) {
  return res.status(403).json({
    success: false,
    error: "You must be an admin to perform this action",
  });
}

// Admin-only logic here
```

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `Asset.create(type, opts)` | Create asset template |
| `DroppedAsset.drop(asset, opts)` | Place asset in world |
| `DroppedAsset.get(id, urlSlug, opts)` | Fetch asset with full details |
| `DroppedAsset.create(id, urlSlug, opts)` | Lightweight controller (no fetch) |
| `droppedAsset.updateClickType(opts)` | Change click behavior |
| `droppedAsset.updateWebImageLayers(l0, l1)` | Change images |
| `droppedAsset.updatePosition(x, y)` | Move asset |
| `droppedAsset.deleteDroppedAsset()` | Remove asset |
| `World.deleteDroppedAssets(slug, ids, secret, creds)` | Bulk remove |
| `world.fetchDroppedAssetsWithUniqueName(opts)` | Query by name |
| `world.fetchDroppedAssetsBySceneDropId(opts)` | Query by scene |
| `Visitor.get(id, urlSlug, opts)` | Get visitor (for admin check) |

## Related Examples

- `../examples/handleDropAssets.md` -- full drop example with image and text assets
- `../examples/handleUpdateDroppedAsset.md` -- concurrent property updates
- `../examples/handleRemoveDroppedAsset.md` -- removal with effects and notifications
- `../examples/handleRemoveDroppedAssets.md` -- bulk removal pattern
- `../examples/getAnchorAssets.md` -- querying by scene and unique name
- `../examples/handleGetConfiguration.md` -- configuration retrieval

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `DroppedAsset.get` when you only need a controller | Use `DroppedAsset.create` for lightweight access (no API call) |
| Forgetting `sceneDropId` when dropping assets | Always include `sceneDropId` to associate with the correct scene |
| Not filtering out the key asset during bulk delete | Always filter `assetId` from deletion lists |
| Missing `interactivePublicKey` on dropped assets | Required for interactive assets to function |
| Sequential updates that could be parallel | Use `Promise.all` for independent update operations |
| Hardcoding asset positions | Calculate relative to the key asset's `position` |
