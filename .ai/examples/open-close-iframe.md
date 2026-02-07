# Open & Close Iframe

> **Source**: sdk-quiz, virtual-pet, sdk-grow-together
> **SDK Methods**: `visitor.openIframe({ droppedAssetId, link, shouldOpenInDrawer, title })`, `visitor.closeIframe(assetId)`
> **Guide Phase**: Phase 7
> **Difficulty**: Starter
> **Tags**: `iframe, drawer, popup, open, close, UI, modal, panel`

## When to Use

Use this pattern when you need to programmatically open or close an iframe drawer or modal for a visitor. Common scenarios include auto-opening an iframe when a visitor enters a zone (sdk-quiz), navigating between different app views by opening a new iframe with different query params (grow-together), or closing an iframe after an action is completed (virtual-pet).

## Server Implementation

### Open Iframe Controller

```ts
/**
 * Controller to open an iframe for a specific visitor
 * Constructs the full URL with credentials and opens it in a drawer or modal
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleOpenIframe = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const {
      assetId,
      displayName,
      identityId,
      interactiveNonce,
      interactivePublicKey,
      profileId,
      sceneDropId,
      uniqueName,
      urlSlug,
      username,
      visitorId,
    } = credentials;

    // Optional: specify which view/page to open
    const { view } = req.body; // e.g., "leaderboard", "settings", "details"

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Construct the full iframe URL with all credential query params
    // The base URL should match your deployed app or dev server
    const baseUrl = process.env.API_URL || `https://${req.get("host")}`;

    const queryParams = new URLSearchParams({
      assetId,
      displayName,
      identityId,
      interactiveNonce,
      interactivePublicKey,
      profileId,
      sceneDropId,
      uniqueName,
      urlSlug,
      username,
      visitorId,
      ...(view && { view }),
    });

    const link = `${baseUrl}?${queryParams.toString()}`;

    // Open the iframe for the visitor
    await visitor.openIframe({
      droppedAssetId: assetId,
      link,
      shouldOpenInDrawer: true, // true = side drawer, false = modal overlay
      title: "My App",
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleOpenIframe",
      message: "Error opening iframe for visitor",
      req,
      res,
    });
  }
};
```

### Close Iframe Controller

```ts
/**
 * Controller to close the currently open iframe for a visitor
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleCloseIframe = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Close the iframe associated with the specified asset
    await visitor.closeIframe(assetId);

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCloseIframe",
      message: "Error closing iframe for visitor",
      req,
      res,
    });
  }
};
```

### Open Iframe for a Different Asset

Use this when navigating from one interactive asset's iframe to another (e.g., clicking a garden plot opens a detail view for that specific plot).

```ts
/**
 * Open an iframe for a different dropped asset than the one the visitor is currently interacting with
 * Used in grow-together when clicking a garden plot to open its detail view
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, DroppedAsset, Visitor } from "../utils/index.js";

export const handleOpenAssetIframe = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { targetAssetId } = req.body;

    if (!targetAssetId) {
      return res.status(400).json({
        success: false,
        error: "targetAssetId is required",
      });
    }

    // Fetch the target asset to get its interactive settings
    const targetAsset = await DroppedAsset.get(targetAssetId, urlSlug, { credentials });

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Close the current iframe first (optional, prevents stacking)
    await visitor.closeIframe(credentials.assetId).catch(() => {
      // Silently ignore if no iframe is currently open
    });

    // Build URL using the target asset's interactive link or construct a new one
    const baseUrl = process.env.API_URL || `https://${req.get("host")}`;
    const queryParams = new URLSearchParams({
      ...credentials,
      assetId: targetAssetId, // Override assetId to the target
    } as Record<string, string>);

    const link = `${baseUrl}?${queryParams.toString()}`;

    // Open the new iframe for the target asset
    await visitor.openIframe({
      droppedAssetId: targetAssetId,
      link,
      shouldOpenInDrawer: true,
      title: targetAsset.name || "Details",
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleOpenAssetIframe",
      message: "Error opening iframe for target asset",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Close and Navigate Pattern

```tsx
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";
import { backendAPI, setErrorMessage } from "@utils";

interface NavigationButtonProps {
  targetAssetId: string;
  label: string;
}

export const NavigateToAssetButton = ({ targetAssetId, label }: NavigationButtonProps) => {
  const dispatch = useContext(GlobalDispatchContext);

  const handleNavigate = async () => {
    try {
      // Server handles closing current iframe and opening new one
      await backendAPI.post("/api/open-asset-iframe", { targetAssetId });
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <button className="btn" onClick={handleNavigate}>
      {label}
    </button>
  );
};
```

### Close Iframe Button

```tsx
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";
import { backendAPI, setErrorMessage } from "@utils";

export const CloseButton = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const handleClose = async () => {
    try {
      await backendAPI.post("/api/close-iframe");
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <button className="btn btn-outline" onClick={handleClose}>
      Close
    </button>
  );
};
```

## Variations

| App | Use Case | Drawer vs Modal | Notes |
|-----|----------|----------------|-------|
| sdk-quiz | Auto-open quiz when entering zone | Drawer (`shouldOpenInDrawer: true`) | Triggered by zone webhook, not user click |
| virtual-pet | Open pet detail from world view | Drawer | Closes after completing an action |
| sdk-grow-together | Navigate between garden views | Drawer | Closes current iframe, opens new one for different asset |
| sdk-scavenger-hunt | Show clue detail | Modal (`shouldOpenInDrawer: false`) | Uses modal for smaller focused content |

## Common Mistakes

- **Missing credential params in URL**: The iframe URL must include all credential query parameters so that `App.tsx` can extract them and `backendAPI` can attach them to subsequent requests. Missing params will break authentication.
- **Not URL-encoding query params**: Use `URLSearchParams` to properly encode display names and other values that may contain special characters. Manual string concatenation can produce malformed URLs.
- **Stacking iframes**: If you open a new iframe without closing the previous one, the visitor may see overlapping content. Always close the current iframe before opening a new one when navigating between views.
- **Hardcoding the base URL**: Use `process.env.API_URL` or derive the URL from the request host. Hardcoded URLs break when moving between development and production environments.
- **Forgetting `droppedAssetId`**: The `droppedAssetId` parameter ties the iframe to a specific asset. Without it, the iframe may not close properly or may not associate with the correct asset context.

## Related Examples

- [Teleport Visitor](./teleport-visitor.md) - Often combined with iframe open to teleport then show UI
- [Fire Toast](./fire-toast.md) - Alternative lightweight feedback when an iframe is not needed
- [Get Configuration](./get-configuration.md) - Loading app config when iframe opens
