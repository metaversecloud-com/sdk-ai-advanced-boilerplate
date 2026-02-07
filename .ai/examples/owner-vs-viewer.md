# Owner vs Viewer Pattern

> **Source**: virtual-pet
> **SDK Methods**: `DroppedAsset.fetchDataObject()`, `Visitor.get()`
> **Guide Phase**: Phase 2
> **Difficulty**: Intermediate
> **Tags**: `owner, viewer, permission, ownership, profile, access-control, pet`

## When to Use

Use this pattern when an interactive element has an owner (the visitor who created or claimed it) and other visitors who are just viewing. The owner gets edit controls, while viewers get read-only access. This is common for personal items, customizable spaces, pet systems, and user-generated content.

## Server Implementation

### Setting Owner on Creation

When a visitor creates or claims an entity, store their profile ID as the owner:

```typescript
// server/controllers/handleClaimAsset.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { getLockId } from "../utils/getLockId.js";

export const handleClaimAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    // Check if already claimed
    if (droppedAsset.dataObject?.ownerId) {
      return res.status(400).json({
        success: false,
        error: "This item has already been claimed",
      });
    }

    const lockId = getLockId(credentials.assetId, "claim");

    // Set owner on first claim
    await droppedAsset.setDataObject(
      {
        ownerId: credentials.profileId,
        ownerDisplayName: credentials.displayName,
        claimedAt: Date.now(),
        customization: {
          name: "My Item",
          color: "blue",
        },
      },
      {
        lock: {
          lockId,
          releaseLock: true,
        },
      }
    );

    return res.json({
      success: true,
      message: "Item claimed successfully",
      data: {
        ownerId: credentials.profileId,
        ownerDisplayName: credentials.displayName,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleClaimAsset",
      message: "Error claiming asset",
      req,
      res,
    });
  }
};
```

### Ownership Check Utility

Create a reusable utility for checking ownership:

```typescript
// server/utils/checkOwnership.ts
import { Response } from "express";
import { Credentials } from "./getCredentials.js";

export interface OwnershipCheckResult {
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean;
}

/**
 * Checks if visitor is owner of entity or admin
 * @param ownerId - The profile ID of the entity owner
 * @param credentials - Visitor credentials
 * @param isAdmin - Whether visitor is admin
 * @returns Ownership status
 */
export const checkOwnership = (
  ownerId: string | undefined,
  credentials: Credentials,
  isAdmin: boolean
): OwnershipCheckResult => {
  const isOwner = ownerId === credentials.profileId;

  return {
    isOwner,
    isAdmin,
    canEdit: isOwner || isAdmin, // Owner or admin can edit
  };
};

/**
 * Enforces ownership requirement for an operation
 * @param ownerId - The profile ID of the entity owner
 * @param credentials - Visitor credentials
 * @param isAdmin - Whether visitor is admin
 * @param res - Express response object
 * @returns True if authorized, otherwise sends 403 response
 */
export const requireOwnership = (
  ownerId: string | undefined,
  credentials: Credentials,
  isAdmin: boolean,
  res: Response
): boolean => {
  const { canEdit } = checkOwnership(ownerId, credentials, isAdmin);

  if (!canEdit) {
    res.status(403).json({
      success: false,
      error: "Forbidden: Only the owner can perform this action",
    });
    return false;
  }

  return true;
};
```

### Owner-Only Update Operation

Enforce ownership before allowing updates:

```typescript
// server/controllers/handleUpdateCustomization.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { requireOwnership } from "../utils/checkOwnership.js";
import { sanitizeString } from "../utils/sanitization.js";
import { getLockId } from "../utils/getLockId.js";

export const handleUpdateCustomization = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { name, color } = req.body;

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    const ownerId = droppedAsset.dataObject?.ownerId;

    // Check ownership - returns false and sends 403 if unauthorized
    if (!requireOwnership(ownerId, credentials, visitor.isAdmin, res)) {
      return;
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name, 50);

    const lockId = getLockId(credentials.assetId, "customize");

    // Owner/admin can update customization
    await droppedAsset.updateDataObject(
      {
        customization: {
          name: sanitizedName,
          color,
          lastUpdated: Date.now(),
        },
      },
      {
        lock: {
          lockId,
          releaseLock: true,
        },
      }
    );

    return res.json({
      success: true,
      message: "Customization updated successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateCustomization",
      message: "Error updating customization",
      req,
      res,
    });
  }
};
```

### Including Ownership in Game State

Return ownership status with game state:

```typescript
// server/controllers/handleGetGameState.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { checkOwnership } from "../utils/checkOwnership.js";

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    const ownerId = droppedAsset.dataObject?.ownerId;
    const ownership = checkOwnership(ownerId, credentials, visitor.isAdmin);

    return res.json({
      success: true,
      data: {
        isAdmin: visitor.isAdmin,
        isOwner: ownership.isOwner,
        canEdit: ownership.canEdit,
        visitorData: {
          profileId: credentials.profileId,
          displayName: credentials.displayName,
          username: credentials.username,
        },
        droppedAsset: {
          ...droppedAsset.dataObject,
          ownerId,
          ownerDisplayName: droppedAsset.dataObject?.ownerDisplayName,
        },
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error fetching game state",
      req,
      res,
    });
  }
};
```

### Admin Override Pattern

Admins should be able to act as owners for moderation purposes:

```typescript
// server/controllers/handleResetOwnership.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { getLockId } from "../utils/getLockId.js";

export const handleResetOwnership = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    // Admin-only operation
    if (!visitor.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin privileges required",
      });
    }

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    const lockId = getLockId(credentials.assetId, "reset");

    // Admin can reset ownership
    await droppedAsset.updateDataObject(
      {
        ownerId: null,
        ownerDisplayName: null,
        claimedAt: null,
        customization: {
          name: "Unclaimed Item",
          color: "gray",
        },
      },
      {
        lock: {
          lockId,
          releaseLock: true,
        },
      }
    );

    return res.json({
      success: true,
      message: "Ownership reset successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetOwnership",
      message: "Error resetting ownership",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Types

Update global state types to include ownership:

```typescript
// client/src/context/types.ts
export interface GlobalState {
  isAdmin: boolean;
  isOwner: boolean;
  canEdit: boolean;
  error: string | null;
  hasInteractiveParams: boolean;
  visitorData: VisitorData | null;
  droppedAsset: DroppedAsset | null;
}
```

### Reducer Updates

Handle ownership in state updates:

```typescript
// client/src/context/GlobalContext.tsx
case "SET_GAME_STATE":
  return {
    ...state,
    isAdmin: action.payload.isAdmin || false,
    isOwner: action.payload.isOwner || false,
    canEdit: action.payload.canEdit || false,
    visitorData: action.payload.visitorData,
    droppedAsset: action.payload.droppedAsset,
  };
```

### Conditional Rendering Based on Ownership

Show different UI for owner vs viewer:

```typescript
// client/src/components/CustomizationPanel.tsx
import { useContext, useState } from "react";
import { GlobalStateContext, GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const CustomizationPanel = () => {
  const { canEdit, isOwner, droppedAsset } = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);
  const [name, setName] = useState(droppedAsset?.customization?.name || "");
  const [color, setColor] = useState(droppedAsset?.customization?.color || "blue");

  const handleUpdate = async () => {
    try {
      const response = await backendAPI.put("/api/customization", {
        name,
        color,
      });

      if (response.data.success) {
        // Refresh to show updated state
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  // Owner/admin view - editable
  if (canEdit) {
    return (
      <div className="card">
        <div className="card-details">
          <h3 className="card-title">Customize Your Item</h3>
          {isOwner && <p className="p2">You own this item</p>}

          <label className="label">Name</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            maxLength={50}
          />

          <label className="label">Color</label>
          <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
          </select>

          <div className="card-actions">
            <button className="btn" onClick={handleUpdate}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Viewer view - read-only
  return (
    <div className="card">
      <div className="card-details">
        <h3 className="card-title">{droppedAsset?.customization?.name || "Item"}</h3>
        <p className="p2">Owner: {droppedAsset?.ownerDisplayName || "Unclaimed"}</p>
        <p className="p2">Color: {droppedAsset?.customization?.color || "Unknown"}</p>
        {!droppedAsset?.ownerId && (
          <div className="card-actions">
            <button className="btn" onClick={async () => {
              try {
                await backendAPI.post("/api/claim");
                window.location.reload();
              } catch (err) {
                setErrorMessage(dispatch, err as ErrorType);
              }
            }}>
              Claim This Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Owner Badge UI

Display visual indicator for owners:

```typescript
// client/src/components/OwnerBadge.tsx
import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";

export const OwnerBadge = () => {
  const { isOwner, isAdmin, droppedAsset } = useContext(GlobalStateContext);

  if (!isOwner && !isAdmin) {
    return null;
  }

  return (
    <div className="container">
      {isOwner && (
        <div className="card" style={{ borderColor: "var(--success-color)" }}>
          <div className="card-details">
            <p className="p2">
              <strong>You own this item</strong>
            </p>
          </div>
        </div>
      )}
      {isAdmin && !isOwner && (
        <div className="card" style={{ borderColor: "var(--warning-color)" }}>
          <div className="card-details">
            <p className="p2">
              <strong>Admin View</strong> - Owner: {droppedAsset?.ownerDisplayName || "None"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Variations

| App | Ownership Model | Transfer | Admin Override |
|-----|----------------|----------|----------------|
| virtual-pet | First claim | No | Yes (reset) |
| sdk-profile-card | Profile-bound | No | Yes (edit any) |
| sdk-custom-space | Purchased | Yes (sell) | Yes (force transfer) |
| sdk-user-content | Creator | No | Yes (delete) |

## Common Mistakes

1. **Client-only ownership checks**: Always validate ownership server-side. Don't trust `isOwner` from client state alone.

2. **Forgetting admin override**: Admins should have owner-equivalent permissions for moderation. Always check `isOwner || isAdmin`.

3. **Not storing owner info**: Store both `ownerId` (profileId) and `ownerDisplayName` for display purposes.

4. **Missing unclaimed state**: Handle the case where `ownerId` is `null` or undefined (unclaimed items).

5. **No ownership transfer**: If your app needs ownership transfer, build a dedicated endpoint with proper validation.

6. **Unclear error messages**: Return "Only the owner can perform this action" not "Forbidden" or "Access denied".

7. **Not returning ownership status**: Always include `isOwner` and `canEdit` in game state response for client-side UI decisions.

## Related Examples

- [admin-permission-guard.md](./admin-permission-guard.md) - Similar permission pattern for admins
- [input-sanitization.md](./input-sanitization.md) - Sanitize owner-submitted customizations
- [locking-strategies.md](./locking-strategies.md) - Lock ownership changes (claim, transfer)
- [handleGetGameState.md](./handleGetGameState.md) - Pattern for returning ownership status
