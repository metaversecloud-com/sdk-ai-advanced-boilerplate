# Webhook Zone Trigger Pattern

> **Source**: sdk-quiz
> **SDK Methods**: `visitor.openIframe()`, `visitor.closeIframe()`
> **Guide Phase**: Phase 7
> **Difficulty**: Intermediate
> **Tags**: `webhook, zone, trigger, area, proximity, auto-open, click-type`

## When to Use

Use this pattern when you want to automatically open your app iframe when a visitor enters a zone and close it when they exit. This creates a seamless spatial experience where the UI appears based on the visitor's location in the world, without requiring manual interaction with an asset.

## Server Implementation

### Controller: Zone Enter Handler

```ts
// server/controllers/handleZoneEnter.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleZoneEnter = async (req: Request, res: Response) => {
  try {
    // CRITICAL: Webhook credentials come from req.body, NOT req.query
    const credentials = getCredentials(req.body);
    const { assetId, urlSlug, visitorId } = credentials;

    // Initialize visitor instance
    const visitor = await Visitor.create(visitorId, urlSlug, {
      credentials,
    });

    // Close any existing iframe first (prevents multiple iframes)
    await visitor.closeIframe().catch(() => {
      // Swallow error if no iframe is open
    });

    // Construct iframe URL with credentials as query params
    const iframeUrl = new URL(`${process.env.INSTANCE_PROTOCOL}://${process.env.INSTANCE_DOMAIN}`);
    iframeUrl.searchParams.append("assetId", assetId);
    iframeUrl.searchParams.append("displayName", credentials.displayName || "");
    iframeUrl.searchParams.append("identityId", credentials.identityId || "");
    iframeUrl.searchParams.append("interactiveNonce", credentials.interactiveNonce);
    iframeUrl.searchParams.append("interactivePublicKey", credentials.interactivePublicKey);
    iframeUrl.searchParams.append("profileId", credentials.profileId || "");
    iframeUrl.searchParams.append("uniqueName", credentials.uniqueName || "");
    iframeUrl.searchParams.append("urlSlug", urlSlug);
    iframeUrl.searchParams.append("username", credentials.username || "");
    iframeUrl.searchParams.append("visitorId", visitorId);

    // Open iframe for visitor
    await visitor.openIframe({
      url: iframeUrl.toString(),
      width: 800,
      height: 600,
    });

    return res.json({
      success: true,
      data: {
        message: "Iframe opened successfully",
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleZoneEnter",
      message: "Failed to open iframe on zone enter",
      req,
      res,
    });
  }
};
```

### Controller: Zone Exit Handler

```ts
// server/controllers/handleZoneExit.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleZoneExit = async (req: Request, res: Response) => {
  try {
    // CRITICAL: Webhook credentials come from req.body, NOT req.query
    const credentials = getCredentials(req.body);
    const { urlSlug, visitorId } = credentials;

    // Initialize visitor instance
    const visitor = await Visitor.create(visitorId, urlSlug, {
      credentials,
    });

    // Close iframe
    await visitor.closeIframe().catch(() => {
      // Swallow error if no iframe is open
    });

    return res.json({
      success: true,
      data: {
        message: "Iframe closed successfully",
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleZoneExit",
      message: "Failed to close iframe on zone exit",
      req,
      res,
    });
  }
};
```

### Route Registration

```ts
// server/routes.ts
import { handleZoneEnter } from "./controllers/handleZoneEnter.js";
import { handleZoneExit } from "./controllers/handleZoneExit.js";

// Webhook routes MUST be POST endpoints
router.post("/api/webhook/zone-enter", handleZoneEnter);
router.post("/api/webhook/zone-exit", handleZoneExit);
```

### Express Configuration

```ts
// server/index.ts
import express from "express";

const app = express();

// REQUIRED: JSON body parsing for webhooks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... rest of server setup
```

## Client Implementation

No client-side implementation is required for this pattern. The iframe opens and closes automatically based on zone triggers configured in the Topia world editor. However, your client app should handle the case where it's opened via zone trigger vs. asset click:

```tsx
// client/src/App.tsx
// The App.tsx is protected, but if you were to add zone-aware logic:

// Check if opened from zone trigger (no sceneDropId typically)
const isZoneTrigger = !credentials.sceneDropId;

// Optionally adjust UI based on trigger source
{isZoneTrigger && (
  <div className="card">
    <p className="p2">Welcome to the zone!</p>
  </div>
)}
```

## Variations

| App | Adaptation | Notes |
|-----|-----------|-------|
| sdk-quiz | Opens quiz UI on zone enter | Closes on exit to prevent UI clutter |
| tutorial-world | Opens help overlay in tutorial zones | Different iframe content per zone |
| museum-app | Opens artwork details per room | Multiple zones, each with unique content |
| mini-game-hub | Opens game selector in arcade zone | Stays open until visitor leaves zone |

## Common Mistakes

1. **Using `req.query` instead of `req.body`**: This is the #1 mistake — webhook credentials come in the request body, NOT query params
2. **Not calling `closeIframe()` before `openIframe()`**: Can result in multiple iframes stacking on top of each other
3. **Using GET instead of POST**: Zone webhook routes must be POST endpoints
4. **Missing `express.json()` middleware**: Without this, `req.body` will be undefined
5. **Not swallowing `closeIframe()` errors**: Will throw errors if no iframe is currently open — use `.catch(() => {})`
6. **Hardcoding iframe URL**: Always construct URL with credentials as query params for proper authentication
7. **Not testing zone boundaries**: Make sure zone size is appropriate — too large and iframe opens too early, too small and visitors miss it

## Related Examples

- [world-activity-trigger.md](./world-activity-trigger.md) - Triggering world activities from game events
- [handleGetGameState.md](./handleGetGameState.md) - Fetching initial state when iframe opens
- Topia SDK Documentation: [Visitor.openIframe()](https://metaversecloud-com.github.io/mc-sdk-js/classes/Visitor.html#openIframe)
- Topia SDK Documentation: [Visitor.closeIframe()](https://metaversecloud-com.github.io/mc-sdk-js/classes/Visitor.html#closeIframe)
