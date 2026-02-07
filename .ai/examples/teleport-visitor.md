# Teleport Visitor

> **Source**: sdk-grow-together, sdk-race
> **SDK Methods**: `visitor.moveVisitor({ shouldTeleportVisitor: true, x, y })`
> **Guide Phase**: Phase 7
> **Difficulty**: Starter

## When to Use

Use this pattern when you need to instantly reposition a visitor to a specific location in the world. Common scenarios include teleporting a player to a garden area after selecting a plot (grow-together), moving a racer to the start line before a race begins (sdk-race), or warping a visitor to a reward zone upon completing a challenge.

## Server Implementation

### Basic Teleport Controller

```ts
/**
 * Controller to teleport a visitor to a specific position in the world
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleTeleportVisitor = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Target coordinates to teleport the visitor to
    const { x, y } = req.body;

    if (typeof x !== "number" || typeof y !== "number") {
      return res.status(400).json({
        success: false,
        error: "x and y coordinates are required and must be numbers",
      });
    }

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Teleport the visitor to the target position
    await visitor.moveVisitor({
      shouldTeleportVisitor: true,
      x,
      y,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportVisitor",
      message: "Error teleporting visitor",
      req,
      res,
    });
  }
};
```

### Teleport Relative to a Dropped Asset

Use this strategy when the teleport destination is defined by an asset's position (e.g., a garden plot, a start line marker, or a checkpoint).

```ts
/**
 * Teleport a visitor to a position relative to a dropped asset
 * Used in grow-together to teleport visitors near their garden plot
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, DroppedAsset, Visitor } from "../utils/index.js";

export const handleTeleportToAsset = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // The target asset ID to teleport near
    const { targetAssetId } = req.body;

    if (!targetAssetId) {
      return res.status(400).json({
        success: false,
        error: "targetAssetId is required",
      });
    }

    // Fetch the target asset to get its position
    const targetAsset = await DroppedAsset.get(targetAssetId, urlSlug, { credentials });
    const { position } = targetAsset;

    if (!position) {
      throw new Error("Target asset has no position data");
    }

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Teleport to a position offset from the asset
    // Offset places the visitor slightly below and to the right of the asset
    const offsetX = 2;
    const offsetY = 3;

    await visitor.moveVisitor({
      shouldTeleportVisitor: true,
      x: (position.x || 0) + offsetX,
      y: (position.y || 0) + offsetY,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportToAsset",
      message: "Error teleporting visitor to asset",
      req,
      res,
    });
  }
};
```

### Teleport to a Named Landmark

Use `fetchDroppedAssetsWithUniqueName` to find a landmark asset by its unique name, then teleport the visitor to it. This is useful when the destination asset's ID is not known in advance.

```ts
/**
 * Teleport a visitor to a named landmark (e.g., start line, spawn point)
 * Used in sdk-race to teleport racers to the start line
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor, World } from "../utils/index.js";

export const handleTeleportToLandmark = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { landmarkName } = req.body; // e.g., "start-line", "spawn-point"

    // Find the landmark asset by unique name
    const world = World.create(urlSlug, { credentials });
    const landmarks = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: landmarkName,
      isPartial: false,
    });

    if (!landmarks || landmarks.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Landmark "${landmarkName}" not found in world`,
      });
    }

    const landmark = landmarks[0];
    const { position } = landmark;

    // Get the visitor and teleport
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    await visitor.moveVisitor({
      shouldTeleportVisitor: true,
      x: position?.x || 0,
      y: position?.y || 0,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTeleportToLandmark",
      message: "Error teleporting visitor to landmark",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Triggering the Teleport from a Button

```tsx
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";
import { backendAPI, setErrorMessage } from "@utils";

interface TeleportButtonProps {
  targetAssetId: string;
  label?: string;
}

export const TeleportButton = ({ targetAssetId, label = "Teleport" }: TeleportButtonProps) => {
  const dispatch = useContext(GlobalDispatchContext);

  const handleTeleport = async () => {
    try {
      await backendAPI.post("/api/teleport-to-asset", { targetAssetId });
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <button className="btn" onClick={handleTeleport}>
      {label}
    </button>
  );
};
```

## Variations

| App | Use Case | Positioning Strategy | Notes |
|-----|----------|---------------------|-------|
| sdk-grow-together | Teleport to garden plot | Relative to asset with offset | Visitor lands near their assigned plot |
| sdk-race | Teleport to start line | Named landmark lookup | Uses `fetchDroppedAssetsWithUniqueName` to find start line |
| sdk-scavenger-hunt | Teleport to clue location | Absolute coordinates from config | Coordinates stored in world data object |

## Common Mistakes

- **Forgetting `shouldTeleportVisitor: true`**: Without this flag, `moveVisitor` will smoothly animate the visitor's movement instead of teleporting, which can be slow and visually jarring for long distances.
- **Not validating coordinates**: Always validate that `x` and `y` are numbers before calling `moveVisitor`. Invalid coordinates will cause the SDK call to fail silently or throw.
- **Hardcoding positions**: Use asset-relative positioning or named landmarks instead of hardcoded coordinates. Hardcoded positions break when the world layout changes.
- **Teleporting without context**: Always provide user feedback (toast, UI update) when teleporting so visitors understand why their position changed suddenly.

## Related Examples

- [Drop Asset](./drop-asset.md) - Creating assets that can serve as teleport destinations
- [Get Anchor Assets](./get-anchor-assets.md) - Finding positioned assets in the world
- [Fire Toast](./fire-toast.md) - Notifying visitors after teleportation
