# Phase 7: Polish and UX

## Prerequisites

- Phase 1 completed (boilerplate, credentials flow)
- Phase 2 completed (controller pattern)

## What You Will Build

- Particle effects for visual feedback
- Toast notifications for user messaging
- Iframe open and close control
- Visitor teleportation
- Combining effects for rich interaction sequences

## Particle Effects

Particle effects provide visual feedback at specific world positions. They are triggered through the `World` or `Visitor` factory.

### World-Level Particles

Trigger a particle at a specific position in the world (visible to all visitors):

```typescript
import { World } from "../utils/index.js";

const world = World.create(urlSlug, { credentials });

world.triggerParticle({
  name: "blackSmoke_puff",
  duration: 5,
  position: { x: 100, y: 200 },
});
```

### Visitor-Level Particles

Trigger a particle that follows a specific visitor:

```typescript
import { Visitor } from "../utils/index.js";

const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

visitor.triggerParticle({
  name: "trophy_float",
  duration: 3,
});
```

### Available Particle Effects

Common particle names used in production apps:

| Name | Visual | Common Use |
|------|--------|-----------|
| `blackSmoke_puff` | Black smoke cloud | Asset deletion/removal |
| `trophy_float` | Floating trophy | Race completion, achievements |
| `fireworks` | Fireworks burst | Celebration, game win |
| `confetti` | Falling confetti | Badge awarded, milestone |
| `sparkle` | Sparkle effect | Item collection |

### Triggering Particles at Asset Position

A common pattern: get the asset's position, then trigger a particle there before deleting it:

```typescript
const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
const { position } = droppedAsset;

const world = World.create(urlSlug, { credentials });

// Particle at asset location
world.triggerParticle({
  name: "blackSmoke_puff",
  duration: 5,
  position,
});

// Then delete the asset
await droppedAsset.deleteDroppedAsset();
```

## Toast Notifications

Toast messages appear as pop-up notifications to visitors. Use them for confirmations, alerts, and rewards.

### Basic Toast

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

await visitor.fireToast({
  groupId: "actionComplete",
  title: "Success!",
  text: "Your action was completed successfully.",
});
```

### Toast Parameters

| Parameter | Type | Required | Purpose |
|-----------|------|----------|---------|
| `groupId` | `string` | No | Groups related toasts (deduplication) |
| `title` | `string` | Yes | Bold heading text |
| `text` | `string` | No | Description text |

### World-Level Toast

Send a toast visible to all visitors in the world:

```typescript
const world = World.create(urlSlug, { credentials });

await world.fireToast({
  groupId: "announcement",
  title: "Game Reset",
  text: "The game has been reset by an admin.",
});
```

### Fire-and-Forget Pattern

For non-critical toasts, use `.catch()` to prevent toast failures from breaking the main flow:

```typescript
visitor
  .fireToast({
    groupId: "badgeAwarded",
    title: "Badge Awarded!",
    text: `You earned the ${badgeName} badge!`,
  })
  .catch((error) =>
    errorHandler({
      error,
      functionName: "handleAction",
      message: "Error firing toast",
    }),
  );
```

## Iframe Control

### Close Iframe

Close the app's iframe drawer for a visitor:

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

// Close the iframe associated with the key asset
visitor.closeIframe(assetId).catch((error) =>
  errorHandler({
    error,
    functionName: "handleAction",
    message: "Error closing iframe",
  }),
);
```

### Open Iframe

Open an iframe for a visitor, pointing to a specific asset or URL:

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

await visitor.openIframe({
  droppedAssetId: targetAssetId,
  link: "https://your-app.com/detail",
  shouldOpenInDrawer: true,
  title: "Item Details",
});
```

### Open Iframe Parameters

| Parameter | Type | Required | Purpose |
|-----------|------|----------|---------|
| `droppedAssetId` | `string` | Yes | Asset to associate with |
| `link` | `string` | Yes | URL to load in iframe |
| `shouldOpenInDrawer` | `boolean` | No | Open as drawer (side panel) |
| `title` | `string` | No | Drawer title |

## Visitor Teleportation

Move a visitor to a specific location in the world:

```typescript
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

await visitor.moveVisitor({
  shouldTeleportVisitor: true,
  x: 500,
  y: 300,
});
```

### Teleport to Asset Position

```typescript
const targetAsset = await DroppedAsset.get(targetAssetId, urlSlug, { credentials });
const { position } = targetAsset;

const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

await visitor.moveVisitor({
  shouldTeleportVisitor: true,
  x: position.x,
  y: position.y,
});
```

### Teleport Parameters

| Parameter | Type | Purpose |
|-----------|------|---------|
| `shouldTeleportVisitor` | `boolean` | `true` for instant teleport, `false` for walking |
| `x` | `number` | Target X coordinate |
| `y` | `number` | Target Y coordinate |

## World Activity Triggers

Signal game state changes to the Topia platform:

```typescript
import { WorldActivityType } from "@rtsdk/topia";

const world = World.create(urlSlug, { credentials });

// Signal that a game has started
await world.triggerActivity({
  type: WorldActivityType.GAME_ON,
  assetId,
});

// Signal a new high score
await world.triggerActivity({
  type: WorldActivityType.GAME_HIGH_SCORE,
  assetId,
});
```

### Activity Types

| Type | When to Use |
|------|------------|
| `GAME_ON` | Game or activity starts |
| `GAME_WAITING` | Waiting for players |
| `GAME_HIGH_SCORE` | New high score achieved |

## Combining Effects: Rich Interaction Sequences

### Asset Removal with Full Feedback

Combine particle effect, toast, iframe close, and asset deletion:

```typescript
export const handleRemoveWithEffects = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;

    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    const { position } = droppedAsset;

    const world = World.create(urlSlug, { credentials });
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });

    // 1. Trigger particle effect at asset position
    world.triggerParticle({
      name: "blackSmoke_puff",
      duration: 5,
      position,
    });

    // 2. Close the iframe (fire-and-forget)
    visitor.closeIframe(assetId).catch((error) =>
      errorHandler({
        error,
        functionName: "handleRemoveWithEffects",
        message: "Error closing iframe",
      }),
    );

    // 3. Send toast notification (fire-and-forget)
    visitor
      .fireToast({
        groupId: "assetRemoved",
        title: "Asset Removed",
        text: "The asset has been successfully removed.",
      })
      .catch((error) =>
        errorHandler({
          error,
          functionName: "handleRemoveWithEffects",
          message: "Error firing toast",
        }),
      );

    // 4. Delete the asset
    await droppedAsset.deleteDroppedAsset();

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleRemoveWithEffects",
      message: "Error removing asset",
      req,
      res,
    });
  }
};
```

### Game Completion Sequence

```typescript
// 1. Trigger celebration particle on visitor
visitor.triggerParticle({ name: "trophy_float", duration: 3 });

// 2. Award badge (see Phase 6)
await awardBadge({ credentials, visitor, visitorInventory, badgeName: "Champion" });

// 3. Signal high score
await world.triggerActivity({ type: WorldActivityType.GAME_HIGH_SCORE, assetId });

// 4. Update leaderboard with analytics (see Phases 4-5)
await droppedAsset.updateDataObject(
  { [`leaderboard.${profileId}`]: resultString },
  { analytics: [{ analyticName: "completions", profileId, uniqueKey: profileId, urlSlug }] },
);
```

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `world.triggerParticle({ name, duration, position })` | World-level particle effect |
| `visitor.triggerParticle({ name, duration })` | Visitor-level particle effect |
| `visitor.fireToast({ groupId?, title, text? })` | Toast notification |
| `world.fireToast({ groupId?, title, text? })` | World-wide toast |
| `visitor.closeIframe(assetId)` | Close iframe drawer |
| `visitor.openIframe(opts)` | Open iframe drawer |
| `visitor.moveVisitor({ shouldTeleportVisitor, x, y })` | Teleport visitor |
| `world.triggerActivity({ type, assetId })` | Signal game state |

## Related Examples

- `../examples/handleRemoveDroppedAsset.md` -- removal with particles, toast, and iframe close

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Awaiting non-critical effects | Use fire-and-forget (`.catch()`) for toasts and particles |
| Blocking on `closeIframe` | Use `.catch()` -- iframe may already be closed |
| Missing `position` for world particles | Fetch the asset first to get its `position` |
| Using `moveVisitor` without `shouldTeleportVisitor` | Without this flag, the visitor walks instead of teleporting |
| Not grouping related toasts | Use `groupId` to prevent toast spam |
| Triggering effects after asset deletion | Trigger particles BEFORE `deleteDroppedAsset()` |
