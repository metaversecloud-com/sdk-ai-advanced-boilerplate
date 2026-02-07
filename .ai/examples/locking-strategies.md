# Locking Strategies

> **Source**: sdk-grow-together, virtual-pet, sdk-poll, sdk-race
> **SDK Methods**: `setDataObject()`, `updateDataObject()`, `incrementDataObjectValue()`
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate
> **Tags**: `lock, race-condition, concurrency, atomic, time-bucket, mutex, safe-write`

## When to Use

Use locking whenever multiple visitors might simultaneously write to the same data object. This prevents race conditions where concurrent updates could overwrite each other. Locking is critical for leaderboards, counters, shared state, and any multi-user write operations.

## Server Implementation

### Time-Bucketed Locking Pattern (Recommended)

The most common pattern uses time-bucketed lock IDs to prevent conflicts while allowing operations to complete:

```typescript
// server/utils/getLockId.ts
/**
 * Generates a time-bucketed lock ID to prevent race conditions
 * @param entityId - Unique identifier for the entity being locked
 * @param operation - Optional operation name for debugging
 * @param bucketMs - Time bucket in milliseconds (default: 60000 = 1 minute)
 */
export const getLockId = (
  entityId: string,
  operation: string = "update",
  bucketMs: number = 60000
): string => {
  const timeBucket = Math.round(new Date().getTime() / bucketMs) * bucketMs;
  return `${entityId}-${operation}-${new Date(timeBucket).toISOString()}`;
};
```

### Basic Locking with setDataObject

Use when initializing or completely replacing data object contents:

```typescript
// server/controllers/handleInitializeGame.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset } from "../utils/index.js";
import { getLockId } from "../utils/getLockId.js";

export const handleInitializeGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const droppedAsset = await DroppedAsset.get(
      credentials.urlSlug,
      credentials.assetId
    );

    // Generate time-bucketed lock ID
    const lockId = getLockId(credentials.assetId, "initialize");

    // Set initial data object with lock
    await droppedAsset.setDataObject(
      {
        participants: [],
        leaderboard: [],
        isActive: false,
        createdAt: Date.now(),
      },
      {
        lock: {
          lockId,
          releaseLock: true, // Release immediately after operation
        },
      }
    );

    return res.json({
      success: true,
      message: "Game initialized successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleInitializeGame",
      message: "Error initializing game",
      req,
      res,
    });
  }
};
```

### Locking with updateDataObject

Use for partial updates to existing data objects:

```typescript
// server/controllers/handleJoinGame.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { getLockId } from "../utils/getLockId.js";

export const handleJoinGame = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const visitor = await Visitor.get(credentials.urlSlug, {
      visitorId: credentials.visitorId,
    });

    const droppedAsset = await DroppedAsset.get(
      credentials.urlSlug,
      credentials.assetId
    );

    // Ensure data object exists with defaults
    const currentParticipants = droppedAsset.dataObject?.participants || [];

    // Check if already joined
    if (currentParticipants.some((p: any) => p.profileId === credentials.profileId)) {
      return res.status(400).json({
        success: false,
        error: "Already joined this game",
      });
    }

    // Generate lock ID for this specific update
    const lockId = getLockId(credentials.assetId, "join");

    // Update with lock to prevent race conditions
    await droppedAsset.updateDataObject(
      {
        participants: [
          ...currentParticipants,
          {
            profileId: credentials.profileId,
            displayName: credentials.displayName,
            joinedAt: Date.now(),
          },
        ],
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
      message: "Joined game successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleJoinGame",
      message: "Error joining game",
      req,
      res,
    });
  }
};
```

### Locking with incrementDataObjectValue

Use for atomic counter increments:

```typescript
// server/controllers/handleIncrementScore.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { getLockId } from "../utils/getLockId.js";

export const handleIncrementScore = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { points } = req.body;

    const visitor = await Visitor.get(credentials.urlSlug, {
      visitorId: credentials.visitorId,
    });

    // Generate lock ID for visitor-specific increment
    const lockId = getLockId(credentials.visitorId, "score");

    // Atomic increment with lock
    const newScore = await visitor.incrementDataObjectValue(
      "totalScore",
      points,
      {
        lock: {
          lockId,
          releaseLock: true,
        },
        analytics: [
          {
            analyticName: "pointsEarned",
            incrementBy: points,
            profileId: credentials.profileId,
            uniqueKey: credentials.profileId,
            urlSlug: credentials.urlSlug,
          },
        ],
      }
    );

    return res.json({
      success: true,
      data: { newScore },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleIncrementScore",
      message: "Error incrementing score",
      req,
      res,
    });
  }
};
```

### Lock Granularity Strategies

Different scenarios require different lock durations:

```typescript
// server/utils/getLockId.ts

/**
 * High-contention lock (10 seconds)
 * Use for: Real-time voting, rapid increments, high-frequency updates
 */
export const getHighContentionLockId = (entityId: string, operation: string = "update"): string => {
  return getLockId(entityId, operation, 10000); // 10 second buckets
};

/**
 * Standard lock (1 minute) - DEFAULT
 * Use for: Normal multiplayer operations, joins, submissions
 */
export const getStandardLockId = (entityId: string, operation: string = "update"): string => {
  return getLockId(entityId, operation, 60000); // 1 minute buckets
};

/**
 * Batch operation lock (5 minutes)
 * Use for: Leaderboard calculations, batch resets, admin operations
 */
export const getBatchLockId = (entityId: string, operation: string = "batch"): string => {
  return getLockId(entityId, operation, 300000); // 5 minute buckets
};
```

### Per-Entity Lock Patterns

Lock at the appropriate entity level:

```typescript
// server/controllers/handleUpdateLeaderboard.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset, Visitor, World } from "../utils/index.js";
import { getLockId, getHighContentionLockId, getBatchLockId } from "../utils/getLockId.js";

export const handleUpdateLeaderboard = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { score } = req.body;

    // Lock at asset level (shared leaderboard)
    const assetLockId = getLockId(credentials.assetId, "leaderboard");

    const droppedAsset = await DroppedAsset.get(
      credentials.urlSlug,
      credentials.assetId
    );

    const currentLeaderboard = droppedAsset.dataObject?.leaderboard || [];

    // Update leaderboard with asset-level lock
    await droppedAsset.updateDataObject(
      {
        leaderboard: [
          ...currentLeaderboard,
          {
            profileId: credentials.profileId,
            displayName: credentials.displayName,
            score,
            timestamp: Date.now(),
          },
        ].sort((a, b) => b.score - a.score).slice(0, 10), // Top 10
      },
      {
        lock: {
          lockId: assetLockId,
          releaseLock: true,
        },
      }
    );

    // Lock at visitor level (personal stats)
    const visitorLockId = getLockId(credentials.visitorId, "stats");

    const visitor = await Visitor.get(credentials.urlSlug, {
      visitorId: credentials.visitorId,
    });

    await visitor.incrementDataObjectValue("gamesPlayed", 1, {
      lock: {
        lockId: visitorLockId,
        releaseLock: true,
      },
    });

    return res.json({
      success: true,
      message: "Leaderboard updated successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateLeaderboard",
      message: "Error updating leaderboard",
      req,
      res,
    });
  }
};
```

### When NOT to Lock

Read-only operations and single-visitor data don't need locks:

```typescript
// NO LOCK NEEDED - Read-only operation
const droppedAsset = await DroppedAsset.get(urlSlug, assetId);
const leaderboard = droppedAsset.dataObject?.leaderboard || [];

// NO LOCK NEEDED - Single visitor, no shared state
const visitor = await Visitor.get(urlSlug, { visitorId });
await visitor.setDataObject({ lastSeen: Date.now() });

// LOCK NEEDED - Multiple visitors writing to same asset
await droppedAsset.updateDataObject(
  { participants: [...existing, newParticipant] },
  { lock: { lockId, releaseLock: true } }
);
```

## Client Implementation

Locking is a server-only concern. Clients don't need special handling, but should implement optimistic UI updates with error handling:

```typescript
// client/src/components/JoinButton.tsx
import { useState, useContext } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const JoinButton = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);

    try {
      const response = await backendAPI.post("/api/game/join");

      if (response.data.success) {
        // Optimistic update - refresh state
        window.location.reload();
      }
    } catch (err) {
      // Lock failures appear as errors - show user friendly message
      setErrorMessage(dispatch, err as ErrorType);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <button className="btn" onClick={handleJoin} disabled={isJoining}>
      {isJoining ? "Joining..." : "Join Game"}
    </button>
  );
};
```

## Variations

| App | Lock Granularity | Pattern | Notes |
|-----|------------------|---------|-------|
| sdk-grow-together | 1 minute (standard) | Asset-level | Shared plant growth state |
| virtual-pet | 1 minute (standard) | Asset-level | Owner updates pet state |
| sdk-poll | 10 seconds (high-contention) | Asset-level | Real-time vote counting |
| sdk-race | 10 seconds (high-contention) | Asset + Visitor | Race position + personal stats |

## Common Mistakes

1. **Forgetting to release locks**: Always set `releaseLock: true` unless you need to hold the lock across multiple operations (rare).

2. **Locking on reads**: Don't lock for `fetchDataObject()` or GET operations. Locks are only for writes.

3. **Wrong entity level**: Lock the entity being modified. If updating an asset's data object, use asset ID in lock. If updating visitor data, use visitor ID.

4. **No lock on shared writes**: Any time multiple visitors can write to the same data object field, use a lock. This includes: leaderboards, participant arrays, counters, shared config.

5. **Lock ID not unique**: Lock IDs must be unique per entity + operation + time bucket. Don't reuse the same static string for all operations.

6. **Time bucket too short**: 10-second buckets for high contention, 1-minute (default) for normal ops, 5-minute for batch. Don't go below 10 seconds.

7. **Not handling lock failures**: Lock failures will throw errors. Ensure your error handler catches these and returns appropriate messages.

8. **Lock on initialization check**: When checking if data object exists, don't lock. Only lock the subsequent `setDataObject` if initialization is needed.

## Related Examples

- [handleGetGameState.md](./handleGetGameState.md) - Shows lock usage in initialization flow
- [input-sanitization.md](./input-sanitization.md) - Always sanitize before locked writes
- [owner-vs-viewer.md](./owner-vs-viewer.md) - Lock even for owner-only updates
- [admin-permission-guard.md](./admin-permission-guard.md) - Admin operations still need locks
