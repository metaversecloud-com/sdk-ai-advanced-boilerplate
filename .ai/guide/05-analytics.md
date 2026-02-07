# Phase 5: Analytics

## Prerequisites

- Phase 1 completed (boilerplate, credentials flow)
- Phase 3 completed (data object methods)

## What You Will Build

- Analytics tracking via data object methods
- The `AnalyticType` interface and its fields
- Tracking game events (starts, completions, resets)
- Associating analytics with specific players
- Fire-and-forget analytics alongside data updates

## Core Concept

Analytics in the Topia SDK are tracked through the `analytics` option parameter on data object methods. You do not need a separate analytics API -- the tracking piggybacks on `setDataObject`, `updateDataObject`, and `incrementDataObjectValue` calls.

This means you can track an event even if the data object itself is not changing:

```typescript
// Track an event with an empty data update
await visitor.updateDataObject(
  {},  // no data changes
  {
    analytics: [{ analyticName: "pageViews", profileId, uniqueKey: profileId, urlSlug }],
  },
);
```

## The AnalyticType Interface

```typescript
type AnalyticType = {
  analyticName: string;    // Name of the event (e.g., "starts", "completions")
  incrementBy?: number;    // Amount to increment (default: 1)
  profileId?: string;      // Associate event with a specific player
  uniqueKey?: string;      // Deduplication key (usually profileId)
  urlSlug?: string;        // Associate with a specific world
};
```

### Field Details

| Field | Required | Purpose |
|-------|----------|---------|
| `analyticName` | Yes | Event identifier. Use consistent names across your app. |
| `incrementBy` | No | Defaults to 1. Set higher for batch operations. |
| `profileId` | No | Ties the event to a player. Required for per-player analytics. |
| `uniqueKey` | No | Prevents duplicate counting. Use `profileId` for per-player dedup. |
| `urlSlug` | No | Ties the event to a specific world. |

## Step 1: Analytics with setDataObject

Use when initializing data and tracking the "first time" event:

```typescript
import { Credentials } from "../types.js";

export const initializeWithAnalytics = async ({
  visitor,
  credentials,
}: {
  visitor: any;
  credentials: Credentials;
}) => {
  const { profileId, sceneDropId, urlSlug } = credentials;
  const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

  await visitor.setDataObject(
    {
      totalCollected: 0,
      currentStreak: 0,
      startedAt: new Date().toISOString(),
    },
    {
      analytics: [
        {
          analyticName: "starts",
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
      lock: { lockId, releaseLock: true },
    },
  );
};
```

## Step 2: Analytics with updateDataObject

Use for tracking events during gameplay. The analytics parameter is an array, so you can track multiple events at once:

```typescript
export const trackItemCollection = async ({
  droppedAsset,
  credentials,
}: {
  droppedAsset: any;
  credentials: Credentials;
}) => {
  const { displayName, profileId, urlSlug } = credentials;

  // Update leaderboard AND track analytics in one call
  await droppedAsset.updateDataObject(
    {
      [`leaderboard.${profileId}`]: `${displayName}|42|true`,
    },
    {
      analytics: [
        {
          analyticName: "completions",
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    },
  );
};
```

### Tracking Multiple Events

```typescript
await droppedAsset.updateDataObject(
  { [`leaderboard.${profileId}`]: resultString },
  {
    analytics: [
      { analyticName: "itemsCollected", profileId, uniqueKey: profileId, urlSlug },
      { analyticName: "dailyActive", profileId, uniqueKey: profileId, urlSlug },
    ],
  },
);
```

### Tracking Without Data Changes

You can use `updateDataObject` with an empty object purely for analytics:

```typescript
await visitor.updateDataObject(
  {},
  {
    analytics: [
      {
        analyticName: "emotesUnlocked",
        profileId,
        uniqueKey: profileId,
        urlSlug,
      },
    ],
  },
);
```

## Step 3: Analytics with incrementDataObjectValue

Use for incrementing counters while simultaneously tracking the event:

```typescript
export const incrementWithAnalytics = async ({
  visitor,
  credentials,
  path,
  amount,
}: {
  visitor: any;
  credentials: Credentials;
  path: string;
  amount: number;
}) => {
  const { profileId, urlSlug } = credentials;

  await visitor.incrementDataObjectValue(path, amount, {
    analytics: [
      {
        analyticName: "completions",
        incrementBy: amount,
        profileId,
        uniqueKey: profileId,
        urlSlug,
      },
    ],
  });
};

// Usage
await incrementWithAnalytics({
  visitor,
  credentials,
  path: `${urlSlug}-${sceneDropId}.totalCollected`,
  amount: 1,
});
```

## Step 4: Analytics in Game Reset

Track admin actions like game resets:

```typescript
export const handleResetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, sceneDropId, urlSlug, visitorId } = credentials;

    // Verify admin
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, error: "Admin required" });
    }

    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();

    const analytics = [
      {
        analyticName: "resets",
        profileId,
        uniqueKey: profileId,
        urlSlug,
      },
    ];

    const lockId = `${sceneDropId}-reset-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`;

    if (!world.dataObject) {
      await world.setDataObject(
        { [sceneDropId]: { leaderboard: {} } },
        { analytics, lock: { lockId, releaseLock: true } },
      );
    } else {
      await world.updateDataObject(
        { [`${sceneDropId}.leaderboard`]: {} },
        { analytics, lock: { lockId, releaseLock: true } },
      );
    }

    return res.json({ success: true });
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

## Step 5: Using visitor.updatePublicKeyAnalytics

For tracking analytics without any data object involvement, use `updatePublicKeyAnalytics`:

```typescript
await visitor.updatePublicKeyAnalytics([
  { analyticName: "pageViews", profileId, uniqueKey: profileId, urlSlug },
]);
```

## Common Analytics Events

Here are analytics event names used across production apps:

| Event Name | When to Track | Entity |
|------------|--------------|--------|
| `starts` | Player begins game/activity | visitor |
| `completions` | Player finishes game/activity | visitor or droppedAsset |
| `resets` | Admin resets game state | world |
| `itemsCollected` | Player collects an item | visitor |
| `badgesAwarded` | Player earns a badge | visitor |
| `emotesUnlocked` | Player unlocks an emote | visitor |
| `dailyActive` | Player visits each day | visitor |

## Key SDK Methods Used in This Phase

| Method | Analytics Support |
|--------|------------------|
| `entity.setDataObject(data, { analytics })` | Yes -- on initialization |
| `entity.updateDataObject(data, { analytics })` | Yes -- on partial updates |
| `entity.incrementDataObjectValue(path, amt, { analytics })` | Yes -- on counter increments |
| `visitor.updatePublicKeyAnalytics(analytics)` | Yes -- standalone analytics |

## Related Examples

- `../examples/handleResetGameState.md` -- analytics on game reset
- `../examples/leaderboard.md` -- analytics on leaderboard updates

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `analytics` is an array | Always wrap in `[]`: `analytics: [{ analyticName: "..." }]` |
| Missing `profileId` on per-player events | Include `profileId` to associate events with players |
| Missing `uniqueKey` for deduplication | Use `profileId` as `uniqueKey` to prevent double-counting |
| Tracking analytics in a separate API call | Piggyback on existing data object calls for efficiency |
| Inventing new SDK methods for analytics | Use the `analytics` option on existing data object methods |
| Not tracking admin actions | Include analytics on reset, config changes, and moderation actions |
