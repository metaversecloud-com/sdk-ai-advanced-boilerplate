# Server Controller Template

Use this template when creating new server-side controllers for Topia SDK interactive apps. Controllers handle API requests, interact with the SDK, and return structured responses.

## Complete Controller Template

```ts
/**
 * Controller: handleControllerName
 *
 * [Brief description of what this controller does]
 *
 * Method: GET | POST | PUT | DELETE
 * Path: /api/[route-path]
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, DroppedAsset, Visitor, World } from "../utils/index.js";

export const handleControllerName = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    // ---------------------------------------------------------------
    // 1. Extract and validate credentials from query params
    //    Credentials are attached by the client's backendAPI interceptor
    // ---------------------------------------------------------------
    const credentials = getCredentials(req.query);
    const { assetId, displayName, profileId, sceneDropId, urlSlug, visitorId } = credentials;

    // ---------------------------------------------------------------
    // 2. Extract request body (for POST/PUT routes only)
    // ---------------------------------------------------------------
    // const { someField } = req.body;

    // ---------------------------------------------------------------
    // 3. Get SDK instances
    //    Choose the entities your controller needs
    // ---------------------------------------------------------------

    // Option A: Get a dropped asset (most common - the interactive asset the user clicked)
    // Uses the getDroppedAsset utility which also initializes the data object
    // const droppedAsset = await getDroppedAsset(credentials);

    // Option B: Get a dropped asset directly (when you don't need data object initialization)
    // const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    // Option C: Create a World instance
    // const world = World.create(urlSlug, { credentials });

    // Option D: Get a Visitor instance (for admin checks, expressions, badges, etc.)
    // const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    // const { isAdmin } = visitor;

    // ---------------------------------------------------------------
    // 4. Fetch data objects (if you need to read or write stored data)
    // ---------------------------------------------------------------
    // await world.fetchDataObject();
    // await droppedAsset.fetchDataObject();

    // ---------------------------------------------------------------
    // 5. Business logic
    //    Implement your feature-specific logic here
    // ---------------------------------------------------------------

    // ---------------------------------------------------------------
    // 6. Update data objects with analytics (if applicable)
    //    See "Analytics Integration" section below
    // ---------------------------------------------------------------

    // ---------------------------------------------------------------
    // 7. Return success response
    // ---------------------------------------------------------------
    return res.json({
      success: true,
      // Include relevant data in the response
      // data: { ... },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleControllerName",
      message: "Error description for logging",
      req,
      res,
    });
  }
};
```

## Registering the Route

After creating the controller, register it in two places:

### 1. Export from controllers/index.ts

```ts
// server/controllers/index.ts
export * from "./handleGetGameState.js";
export * from "./handleControllerName.js"; // Add this line
```

### 2. Add route in routes.ts

```ts
// server/routes.ts
import express from "express";
import { handleGetGameState, handleControllerName } from "./controllers/index.js";

const router = express.Router();

// GET routes - for reading data, no request body
router.get("/game-state", handleGetGameState);
router.get("/controller-path", handleControllerName);

// POST routes - for creating or mutating data, uses request body
router.post("/controller-path", handleControllerName);

// PUT routes - for updating existing data
router.put("/controller-path", handleControllerName);

export default router;
```

## When to Use GET vs POST

| Method | Use When | Request Data | Example |
|--------|----------|-------------|---------|
| **GET** | Reading data, no side effects on user-facing state | Query params only (credentials auto-attached) | Fetching game state, configuration, leaderboard |
| **POST** | Creating new resources, performing actions with side effects | `req.body` for payload + query params for credentials | Submitting an answer, dropping assets, starting a game |
| **PUT** | Updating existing resources | `req.body` for payload + query params for credentials | Updating settings, editing a submission |
| **DELETE** | Removing resources | Query params for credentials + identifiers | Removing a dropped asset, resetting data |

## Handling Request Body vs Query Params

Credentials always come from **query params** (auto-attached by the `backendAPI` interceptor). Feature-specific data comes from the **request body** for POST/PUT requests.

```ts
// Query params - always available via getCredentials
const credentials = getCredentials(req.query);

// Request body - only for POST/PUT routes
const { text, selectedOption, amount } = req.body;

// Validate body params manually when needed
if (!text || typeof text !== "string") {
  return res.status(400).json({ success: false, error: "Missing required field: text" });
}
```

## Data Object Fetch and Initialize Pattern

Always ensure a data object exists before calling `updateDataObject`. Follow the pattern used in `getDroppedAsset.ts` and `initializeDroppedAssetDataObject.ts`.

```ts
// Fetch the data object first
await droppedAsset.fetchDataObject();

// Check if the expected structure exists
if (!droppedAsset.dataObject?.myFeatureKey) {
  // Initialize with defaults using a lock to prevent race conditions
  const lockId = `${droppedAsset.id}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
  await droppedAsset
    .setDataObject(
      { myFeatureKey: { count: 0, entries: {} } },
      { lock: { lockId, releaseLock: true } },
    )
    .catch(() => console.warn("Unable to acquire lock, another process may be updating the data object"));
}

// Now safe to use updateDataObject
await droppedAsset.updateDataObject({
  "myFeatureKey.count": newCount,
});
```

## Locking Pattern for Data Object Updates

Use locks to prevent race conditions when multiple users update the same data simultaneously.

```ts
// Lock duration depends on how long the operation takes:

// Short lock (~1 minute) - for quick read-modify-write operations
const lockId = `${assetId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

// Medium lock (~5 minutes) - for operations that may take longer (initialization, multi-step)
const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 300000) * 300000)}`;

// Short lock (~10 seconds) - for high-frequency operations (counters, rapid clicks)
const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`;

// Usage with setDataObject (initialization)
await entity.setDataObject(defaults, { lock: { lockId, releaseLock: true } });

// Usage with updateDataObject (partial updates)
await entity.updateDataObject(updates, { lock: { lockId, releaseLock: true } });
```

## Analytics Integration

Track user actions by passing an `analytics` array to data object methods.

```ts
// Define analytics events
const analytics = [
  {
    analyticName: "completions",   // Name of the analytic event
    profileId,                      // The user's profile ID
    uniqueKey: profileId,           // Unique key to prevent duplicate counting
    urlSlug,                        // The world URL slug
  },
];

// Attach analytics to data object updates
await droppedAsset.updateDataObject(
  { [`leaderboard.${profileId}`]: resultString },
  { analytics },
);

// Attach analytics to setDataObject (initialization)
await droppedAsset.setDataObject(defaults, {
  analytics: [{ analyticName: "starts" }],
  lock: { lockId, releaseLock: true },
});

// Use incrementDataObjectValue with analytics
await visitor.incrementDataObjectValue("completions", 1, {
  analytics: [{ analyticName: "completions", incrementBy: 1, profileId, uniqueKey: profileId, urlSlug }],
});
```

## Admin-Only Controller Pattern

When a controller should only be accessible to admins:

```ts
export const handleAdminAction = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Check admin status
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You must be an admin to perform this action",
      });
    }

    // ... admin-only logic ...

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAdminAction",
      message: "Error performing admin action",
      req,
      res,
    });
  }
};
```

## Fire-and-Forget Side Effects

For non-critical side effects (particles, toasts, external API calls), use `.catch()` to prevent them from failing the main request:

```ts
// Trigger particle effect without blocking the response
world.triggerParticle({ name: "Sparkle", duration: 3, position: droppedAsset.position }).catch((error: any) =>
  errorHandler({
    error,
    functionName: "handleControllerName",
    message: "Error triggering particle effects",
  }),
);

// Fire a toast notification without blocking
await world.fireToast({ title: "Success!", text: "Action completed." }).catch((error) =>
  errorHandler({
    error,
    functionName: "handleControllerName",
    message: "Error firing toast",
  }),
);
```

## Parallel SDK Calls

When you need to make multiple independent SDK calls, use `Promise.all` for better performance:

```ts
const [droppedAsset, visitor] = await Promise.all([
  DroppedAsset.get(assetId, urlSlug, { credentials }),
  Visitor.get(visitorId, urlSlug, { credentials }),
]);

// Or for multiple updates
await Promise.all([
  droppedAsset.updateClickType({ clickType: DroppedAssetClickType.LINK, clickableLink: "https://topia.io" }),
  droppedAsset.updateWebImageLayers("", newImageUrl),
]);
```

## Response Format Reference

```ts
// Success with data
return res.json({ success: true, data: { /* ... */ } });

// Success with specific fields (preferred for known shapes)
return res.json({ success: true, isAdmin, droppedAsset, leaderboard });

// Success with no body (rare - use for DELETE operations)
return res.status(204).send();

// Client error (validation failure)
return res.status(400).json({ success: false, error: "Missing required field: text" });

// Forbidden (non-admin attempting admin action)
return res.status(403).json({ success: false, error: "You must be an admin to perform this action" });

// Server/SDK errors - handled automatically by errorHandler
return errorHandler({ error, functionName: "handleControllerName", message: "Error description", req, res });
```

## Checklist

Before submitting a new controller, verify:

- [ ] Controller file created in `server/controllers/`
- [ ] Exported from `server/controllers/index.ts`
- [ ] Route registered in `server/routes.ts` with correct HTTP method
- [ ] `getCredentials(req.query)` called at the top of the try block
- [ ] Data objects initialized before `updateDataObject` is called
- [ ] Locks used for data object writes to prevent race conditions
- [ ] Error handling uses `errorHandler` with `functionName`, `message`, `req`, `res`
- [ ] Response follows `{ success: true, ... }` format
- [ ] Admin check added if the action should be restricted
- [ ] Analytics added for trackable user actions
- [ ] Jest test added in `server/tests/`
