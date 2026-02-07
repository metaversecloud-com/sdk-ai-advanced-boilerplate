# Cross-Visitor Data Access

> **Source**: sdk-grow-together, virtual-pet
> **SDK Methods**: `User.create({ credentials, profileId })`, `user.fetchDataObject()`, `user.fetchInventoryItems()`
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate
> **Tags**: `user, cross-world, persistent, profile, shared-data, multi-world`

## When to Use

Use this pattern when your app needs to read or modify another player's data -- not the currently authenticated visitor, but a different user identified by their `profileId`. This is essential for social mechanics (watering another player's garden, feeding someone else's pet) and for ownership detection (determining if the current visitor is the owner of an asset).

## Server Implementation

### Utility: Get Another Player's Data

```ts
/**
 * Retrieves another player's data object using their profileId.
 * Uses the UserFactory to create a User instance for any player, not just the current visitor.
 *
 * @param credentials - Topia credentials for API authentication
 * @param targetProfileId - The profileId of the player whose data you want to access
 * @returns The user instance with their data object loaded
 */
import { Credentials } from "../types.js";
import { User } from "./topiaInit.js";

export const getPlayerData = async ({
  credentials,
  targetProfileId,
}: {
  credentials: Credentials;
  targetProfileId: string;
}) => {
  // Create a User instance for the target player.
  // Note: User.create requires the profileId of the target user, not the current visitor.
  const user = await User.create(targetProfileId, {
    credentials: { ...credentials, profileId: targetProfileId },
  });

  // Fetch their data object
  await user.fetchDataObject();

  return user;
};
```

### Utility: Get Another Player's Inventory

```ts
/**
 * Retrieves another player's inventory items (badges, decorations, etc.).
 * Useful for checking if a player owns specific items before allowing interactions.
 *
 * @param credentials - Topia credentials for API authentication
 * @param targetProfileId - The profileId of the player whose inventory you want to check
 * @returns The user instance with their inventory loaded
 */
import { Credentials } from "../types.js";
import { User } from "./topiaInit.js";

export const getPlayerInventory = async ({
  credentials,
  targetProfileId,
}: {
  credentials: Credentials;
  targetProfileId: string;
}) => {
  const user = await User.create(targetProfileId, {
    credentials: { ...credentials, profileId: targetProfileId },
  });

  // Fetch their inventory items (badges, decorations, etc.)
  await user.fetchInventoryItems();

  return {
    user,
    inventoryItems: user.inventoryItems || [],
  };
};
```

### Controller: Social Watering (sdk-grow-together pattern)

```ts
/**
 * Controller to water another player's plant.
 * The current visitor triggers a social interaction on another player's data.
 * Demonstrates reading one player's data and modifying it on their behalf.
 *
 * @returns JSON response with updated plant data or error
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset, User, Visitor } from "../utils/index.js";

interface PlantDataObject {
  ownerProfileId: string;
  ownerDisplayName: string;
  growthStage: number;
  waterLevel: number;
  wateredBy: Record<string, { displayName: string; lastWatered: string }>;
}

export const handleWaterPlant = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, profileId, displayName, visitorId } = credentials;
    const { plantAssetId } = req.body;

    if (!plantAssetId) {
      return res.status(400).json({ success: false, error: "plantAssetId is required." });
    }

    // Get the plant asset to find the owner's profileId
    const plantAsset = await DroppedAsset.get(plantAssetId, urlSlug, {
      credentials: { ...credentials, assetId: plantAssetId },
    });
    await plantAsset.fetchDataObject();

    const plantData = plantAsset.dataObject as PlantDataObject;
    if (!plantData?.ownerProfileId) {
      throw new Error("Plant has no owner data.");
    }

    // Prevent watering your own plant (social mechanic requires another player)
    if (plantData.ownerProfileId === profileId) {
      return res.status(400).json({
        success: false,
        error: "You cannot water your own plant. Ask a friend!",
      });
    }

    // Check if this visitor already watered today
    const today = new Date().toISOString().split("T")[0];
    const previousWater = plantData.wateredBy?.[profileId];
    if (previousWater && previousWater.lastWatered.startsWith(today)) {
      return res.status(400).json({
        success: false,
        error: "You already watered this plant today. Come back tomorrow!",
      });
    }

    // Update the plant's data object with the watering record
    await plantAsset.updateDataObject({
      [`wateredBy.${profileId}`]: {
        displayName,
        lastWatered: new Date().toISOString(),
      },
    });

    // Increment the water level
    await plantAsset.incrementDataObjectValue("waterLevel", 1, {
      analytics: [{ analyticName: "waterings", profileId, uniqueKey: profileId, urlSlug }],
    });

    // Optionally update the plant owner's user data to track total waterings received
    const ownerUser = await User.create(plantData.ownerProfileId, {
      credentials: { ...credentials, profileId: plantData.ownerProfileId },
    });
    await ownerUser.fetchDataObject();

    const ownerData = ownerUser.dataObject as { totalWateringsReceived?: number } | undefined;
    if (ownerData && typeof ownerData.totalWateringsReceived === "number") {
      await ownerUser.incrementDataObjectValue("totalWateringsReceived", 1);
    } else {
      await ownerUser.setDataObject({
        ...(ownerData || {}),
        totalWateringsReceived: 1,
      });
    }

    // Fire a toast to the current visitor
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    visitor
      .fireToast({
        groupId: "waterPlant",
        title: "Plant Watered!",
        text: `You watered ${plantData.ownerDisplayName}'s plant!`,
      })
      .catch(() => console.error("Failed to fire watering toast"));

    return res.json({
      success: true,
      message: `Successfully watered ${plantData.ownerDisplayName}'s plant.`,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleWaterPlant",
      message: "Error watering plant",
      req,
      res,
    });
  }
};
```

### Controller: Owner vs Viewer Detection (virtual-pet pattern)

```ts
/**
 * Controller to determine if the current visitor is the owner of a pet asset.
 * Returns different data depending on whether the visitor owns the pet or is just viewing it.
 * This pattern is critical for apps where clicking another player's asset
 * should show a different UI than clicking your own.
 *
 * @returns JSON response with pet data and ownership status
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset, Visitor } from "../utils/index.js";

interface PetDataObject {
  ownerProfileId: string;
  ownerDisplayName: string;
  petType: string;
  level: number;
  happiness: number;
  fedBy: Record<string, { displayName: string; lastFed: string }>;
}

export const handleGetPetState = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, profileId, visitorId } = credentials;

    // Get the pet asset and its data
    const petAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    await petAsset.fetchDataObject();

    const petData = petAsset.dataObject as PetDataObject;
    if (!petData?.ownerProfileId) {
      throw new Error("Pet data not found on this asset.");
    }

    // Determine ownership: compare the current visitor's profileId with the pet's owner
    const isOwner = petData.ownerProfileId === profileId;

    // Get visitor details for admin check
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    const { isAdmin } = visitor;

    // Return different data based on ownership
    if (isOwner) {
      // Owner sees full pet management UI
      return res.json({
        success: true,
        isOwner: true,
        isAdmin,
        pet: {
          petType: petData.petType,
          level: petData.level,
          happiness: petData.happiness,
          fedBy: petData.fedBy || {},
        },
      });
    } else {
      // Viewer sees limited interaction UI (can feed but not manage)
      return res.json({
        success: true,
        isOwner: false,
        isAdmin,
        pet: {
          ownerDisplayName: petData.ownerDisplayName,
          petType: petData.petType,
          level: petData.level,
        },
      });
    }
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetPetState",
      message: "Error loading pet state",
      req,
      res,
    });
  }
};
```

## Client Implementation (if applicable)

### Types for Owner/Viewer State

```ts
// client/src/context/types.ts
export interface PetState {
  isOwner: boolean;
  pet: {
    ownerDisplayName?: string;
    petType: string;
    level: number;
    happiness?: number;
    fedBy?: Record<string, { displayName: string; lastFed: string }>;
  };
}

export interface InitialState {
  // ... existing fields
  petState?: PetState;
}
```

### Reducer Update

```ts
// In your reducer's action cases
case "SET_PET_STATE": {
  return {
    ...state,
    petState: payload?.petState ?? state.petState,
  };
}
```

### Component: Conditional Rendering Based on Ownership

```tsx
import { useContext, useEffect, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@context/GlobalContext";
import { backendAPI, setErrorMessage } from "@utils";
import { ErrorType, PetState } from "@context/types";

export const PetView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { petState } = useContext(GlobalStateContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPetState = async () => {
      try {
        const result = await backendAPI.get("/api/pet-state");
        if (result.data.success) {
          dispatch({ type: "SET_PET_STATE", payload: { petState: result.data } });
        }
      } catch (err) {
        setErrorMessage(dispatch, err as ErrorType);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPetState();
  }, [dispatch]);

  if (isLoading || !petState) return <p className="p1">Loading...</p>;

  // Render different UI based on ownership
  if (petState.isOwner) {
    return (
      <div className="container">
        <h2 className="h2">Your Pet</h2>
        <div className="card">
          <div className="card-details">
            <h3 className="card-title">{petState.pet.petType}</h3>
            <p className="p2">Level: {petState.pet.level}</p>
            <p className="p2">Happiness: {petState.pet.happiness}</p>
            <button className="btn">Feed Pet</button>
            <button className="btn btn-outline">Customize</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="h2">{petState.pet.ownerDisplayName}'s Pet</h2>
      <div className="card">
        <div className="card-details">
          <h3 className="card-title">{petState.pet.petType}</h3>
          <p className="p2">Level: {petState.pet.level}</p>
          <button className="btn">Feed Pet</button>
        </div>
      </div>
    </div>
  );
};

export default PetView;
```

## Variations

| App | Cross-Visitor Use Case | Data Read | Data Write | Ownership Check |
|-----|----------------------|-----------|------------|-----------------|
| sdk-grow-together | Water another player's plant | Plant asset data object | Increment waterLevel, add to wateredBy | Compare ownerProfileId to current profileId |
| virtual-pet | Feed another player's pet | Pet asset data object | Increment feedCount, add to fedBy | Compare ownerProfileId to current profileId |
| sdk-scavenger-hunt | View another player's progress | User data object via profileId | No write (read-only viewing) | N/A (always viewing others) |

## Common Mistakes

- **Confusing `visitorId` and `profileId`**: The `visitorId` is session-specific and changes each time someone enters a world. The `profileId` is permanent and tied to the user's account. Always use `profileId` for cross-session data lookups and ownership.
- **Using Visitor factory for non-present users**: The `Visitor` factory only works for visitors currently in the world. To access any player's data (including those who are offline), use the `User` factory with their `profileId`.
- **Not overriding `profileId` in credentials**: When creating a `User` instance for a different player, you must override the `profileId` in the credentials: `{ ...credentials, profileId: targetProfileId }`. Otherwise, the SDK uses the current visitor's profileId.
- **Missing ownership check before write operations**: Always verify that the current visitor has permission to modify another player's data. For social mechanics, this usually means checking that the action is a valid social interaction (e.g., watering, not deleting).
- **Not handling missing data objects on other users**: The target user may never have interacted with your app. Always check if `user.dataObject` exists before reading properties, and use `setDataObject` to initialize if needed.

## Related Examples

- [data-object-init.md](./data-object-init.md) - Data object initialization pattern (check-then-set-then-update)
- [leaderboard.md](./leaderboard.md) - Storing per-player data on a shared asset
- [badges.md](./badges.md) - Fetching visitor inventory including badges
- [award-badge.md](./award-badge.md) - Granting inventory items to visitors
