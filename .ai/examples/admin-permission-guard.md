# Admin Permission Guard

> **Source**: sdk-quiz, sdk-race, scene-swapper, virtual-pet
> **SDK Methods**: `Visitor.get()`
> **Guide Phase**: Phase 2
> **Difficulty**: Starter
> **Tags**: `admin, permission, guard, middleware, 403, authorization, restrict, isAdmin`

## When to Use

Use this pattern whenever you need to restrict certain actions or data access to administrators only. This is critical for operations like resetting game state, managing configuration, or accessing sensitive data. Always enforce admin checks server-side — never rely on client-side checks alone.

## Server Implementation

### Middleware Pattern (Recommended)

Create a reusable middleware function for routes that require admin access:

```typescript
// server/middleware/requireAdmin.ts
import { Request, Response, NextFunction } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credentials = getCredentials(req.query);
    const visitor = await Visitor.get(credentials.urlSlug, {
      visitorId: credentials.visitorId,
    });

    if (!visitor.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Admin privileges required",
      });
    }

    // Attach visitor to request for use in controller
    req.visitor = visitor;
    next();
  } catch (error) {
    return errorHandler({
      error,
      functionName: "requireAdmin",
      message: "Error checking admin status",
      req,
      res,
    });
  }
};
```

Use in routes:

```typescript
// server/routes.ts
import { requireAdmin } from "./middleware/requireAdmin.js";

router.delete("/api/game-state/reset", requireAdmin, handleResetGameState);
router.put("/api/configuration", requireAdmin, handleUpdateConfiguration);
```

### Inline Pattern

For one-off checks, include the admin verification at the top of your controller:

```typescript
// server/controllers/handleResetGameState.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";

export const handleResetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // Check admin status
    const visitor = await Visitor.get(credentials.urlSlug, {
      visitorId: credentials.visitorId,
    });

    if (!visitor.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only admins can reset game state",
      });
    }

    // Perform admin-only operation
    const droppedAsset = await DroppedAsset.get(credentials.urlSlug, credentials.assetId);
    await droppedAsset.setDataObject({
      participants: [],
      leaderboard: [],
      isActive: false,
    });

    return res.json({
      success: true,
      message: "Game state reset successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetGameState",
      message: "Error resetting game state",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Types

Update your global state types to include admin status:

```typescript
// client/src/context/types.ts
export interface GlobalState {
  isAdmin: boolean;
  error: string | null;
  hasInteractiveParams: boolean;
  visitorData: VisitorData | null;
  droppedAsset: DroppedAsset | null;
}
```

### Reducer Updates

Ensure `SET_GAME_STATE` action sets `isAdmin`:

```typescript
// client/src/context/GlobalContext.tsx
case "SET_GAME_STATE":
  return {
    ...state,
    isAdmin: action.payload.isAdmin || false,
    visitorData: action.payload.visitorData,
    droppedAsset: action.payload.droppedAsset,
  };
```

### Component Usage

Conditionally render admin-only UI based on global state:

```typescript
// client/src/components/AdminPanel.tsx
import { useContext } from "react";
import { GlobalStateContext, GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const AdminPanel = () => {
  const { isAdmin } = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);

  const handleResetGame = async () => {
    try {
      const response = await backendAPI.delete("/api/game-state/reset");
      if (response.data.success) {
        // Refresh game state
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  // Don't render anything for non-admins
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-details">
        <h3 className="card-title">Admin Controls</h3>
        <p className="card-description p2">
          Warning: These actions affect all users
        </p>
        <div className="card-actions">
          <button className="btn btn-danger" onClick={handleResetGame}>
            Reset Game State
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Variations

| App | Implementation | Notes |
|-----|----------------|-------|
| sdk-quiz | Inline check in reset controller | Single admin endpoint |
| sdk-race | Middleware on `/config` routes | Multiple admin endpoints |
| scene-swapper | Inline check + client toggle | Admin toggle for scene settings |
| virtual-pet | Middleware + admin badge UI | Shows admin badge in header |

## Common Mistakes

1. **Client-only checks**: Never rely solely on `isAdmin` from context. Always validate server-side or an attacker can bypass by modifying client code.

2. **Missing 403 status**: Always return HTTP 403 (Forbidden) for failed admin checks, not 401 (Unauthorized) or 400 (Bad Request).

3. **Forgetting to fetch visitor**: If you use middleware, ensure the visitor object is attached to `req` for reuse in controllers to avoid duplicate API calls.

4. **Vague error messages**: Return clear messages like "Admin privileges required" instead of generic "Access denied".

5. **Not checking on every admin route**: Every admin-only endpoint must have its own check. Don't assume prior checks persist.

## Related Examples

- [owner-vs-viewer.md](./owner-vs-viewer.md) - Similar permission pattern for entity ownership
- [input-sanitization.md](./input-sanitization.md) - Always sanitize admin inputs too
- [handleGetGameState.md](./handleGetGameState.md) - Example of returning `isAdmin` in game state response

## Related Skills

- [Add Admin Feature](../skills/add-admin-feature.md) — Step-by-step runbook for adding admin-only functionality
