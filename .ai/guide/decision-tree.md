# Decision Tree: "I Want to Do X"

Use this lookup table to find the right pattern, phase, and example for common SDK app needs.

## Data Storage and State

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Store player progress | Visitor data objects with urlSlug-sceneDropId namespace | [Phase 3](./03-data-objects.md) | `handleGetConfiguration.md` |
| Store shared game state | World data objects namespaced by sceneDropId | [Phase 3](./03-data-objects.md) | `handleGetConfiguration.md`, `handleResetGameState.md` |
| Store per-asset state | DroppedAsset data objects | [Phase 3](./03-data-objects.md) | `handleGetConfiguration.md` |
| Track scores and rankings | Pipe-delimited leaderboard on key asset | [Phase 4](./04-leaderboard.md) | `leaderboard.md` |
| Increment a counter safely | `incrementDataObjectValue` (atomic) | [Phase 3](./03-data-objects.md) | `apps/sdk-reference.md` |
| Update nested data without overwriting siblings | Dot-notation in `updateDataObject` | [Phase 3](./03-data-objects.md) | `leaderboard.md` |
| Initialize data safely (prevent race conditions) | setDataObject with time-based lock | [Phase 3](./03-data-objects.md) | `handleGetConfiguration.md` |

## Assets and World

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Spawn items in the world | `Asset.create` + `DroppedAsset.drop` | [Phase 2](./02-core-game-logic.md) | `handleDropAssets.md` |
| Remove an asset with effects | Particle + toast + delete sequence | [Phase 2](./02-core-game-logic.md), [Phase 7](./07-polish.md) | `handleRemoveDroppedAsset.md` |
| Remove multiple assets | `World.deleteDroppedAssets` (bulk) | [Phase 2](./02-core-game-logic.md) | `handleRemoveDroppedAssets.md` |
| Update an asset's image | `droppedAsset.updateWebImageLayers(l0, l1)` | [Phase 2](./02-core-game-logic.md) | `handleUpdateDroppedAsset.md` |
| Move an asset | `droppedAsset.updatePosition(x, y)` | [Phase 2](./02-core-game-logic.md) | `handleUpdateDroppedAsset.md` |
| Change what happens when asset is clicked | `droppedAsset.updateClickType(opts)` | [Phase 2](./02-core-game-logic.md) | `handleUpdateDroppedAsset.md` |
| Find assets by name | `world.fetchDroppedAssetsWithUniqueName(opts)` | [Phase 2](./02-core-game-logic.md) | `getAnchorAssets.md` |
| Find assets in a scene | `world.fetchDroppedAssetsBySceneDropId(opts)` | [Phase 2](./02-core-game-logic.md) | `getAnchorAssets.md` |
| Switch scenes | `world.dropScene` + `World.deleteDroppedAssets` | [Phase 2](./02-core-game-logic.md) | `apps/sdk-race.md`, `apps/scene-swapper.md` |

## Achievements and Rewards

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Award achievements / badges | Inventory cache + `visitor.grantInventoryItem` | [Phase 6](./06-badges-achievements.md) | `badges.md`, `awardBadge.md` |
| Display earned vs unearned badges | Grayscale filter on unowned badges | [Phase 6](./06-badges-achievements.md) | `badges.md` |
| Unlock emotes / expressions | `visitor.grantExpression({ name })` | [Phase 6](./06-badges-achievements.md) | `apps/sdk-quest.md` |
| Create tiered badges (Bronze/Silver/Gold) | Milestone thresholds with badge name lookup | [Phase 6](./06-badges-achievements.md) | `apps/sdk-quest.md` |
| Cache ecosystem inventory | 24h TTL in-memory cache | [Phase 6](./06-badges-achievements.md) | `inventoryCache.md` |

## Analytics and Tracking

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Track game events | `analytics` array on data object methods | [Phase 5](./05-analytics.md) | `handleResetGameState.md` |
| Track per-player events | Include `profileId` and `uniqueKey` in analytics | [Phase 5](./05-analytics.md) | `leaderboard.md` |
| Track without data changes | Empty `updateDataObject({}, { analytics })` | [Phase 5](./05-analytics.md) | -- |

## Player Interaction and UX

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Show a notification | `visitor.fireToast({ title, text })` | [Phase 7](./07-polish.md) | `handleRemoveDroppedAsset.md` |
| Show particle effects | `world.triggerParticle` or `visitor.triggerParticle` | [Phase 7](./07-polish.md) | `handleRemoveDroppedAsset.md` |
| Teleport a visitor | `visitor.moveVisitor({ shouldTeleportVisitor, x, y })` | [Phase 7](./07-polish.md) | `apps/sdk-race.md` |
| Open an iframe/drawer | `visitor.openIframe(opts)` | [Phase 7](./07-polish.md) | `apps/sdk-reference.md` |
| Close an iframe/drawer | `visitor.closeIframe(assetId)` | [Phase 7](./07-polish.md) | `handleRemoveDroppedAsset.md` |
| Signal game state to platform | `world.triggerActivity({ type, assetId })` | [Phase 7](./07-polish.md) | `apps/sdk-race.md` |
| Broadcast to all visitors | `world.fireToast(opts)` | [Phase 7](./07-polish.md) | -- |

## Access Control

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Admin-only actions | Check `visitor.isAdmin` before proceeding | [Phase 2](./02-core-game-logic.md) | `handleResetGameState.md` |
| Per-player permissions | Compare `profileId` to stored owner | [Phase 3](./03-data-objects.md) | `apps/sdk-grow-together.md` |

## Advanced Patterns

| I want to... | Pattern | Phase | Example / Reference |
|--------------|---------|-------|-------------------|
| Real-time updates | SSE (Server-Sent Events) via Redis pub/sub | Advanced | `apps/sdk-race.md` |
| Daily limits / cooldowns | Store `lastActionDate` on visitor data, compare with current date | [Phase 3](./03-data-objects.md) | `apps/sdk-quest.md` |
| Streak tracking | Store `currentStreak`, `longestStreak`, `lastActionDate` on visitor | [Phase 3](./03-data-objects.md) | `apps/sdk-quest.md` |
| XP and leveling | Store XP on visitor, calculate level from XP curve | [Phase 3](./03-data-objects.md) | `apps/sdk-grow-together.md`, `apps/virtual-pet.md` |
| In-game economy (coins) | Store balance on visitor data, atomic increments | [Phase 3](./03-data-objects.md) | `apps/sdk-grow-together.md` |
| Cross-world progress | Use visitor data objects (persists across worlds) | [Phase 3](./03-data-objects.md) | `apps/sdk-scavenger-hunt.md` |
| Inventory / item system | Ecosystem inventory items + visitor grants | [Phase 6](./06-badges-achievements.md) | `apps/sdk-grow-together.md` |
| Approval workflows | Admin review queue in data objects | [Phase 3](./03-data-objects.md) | `apps/sdk-bulletin-board.md` |
| Game reset | Admin guard + clear data objects + analytics | [Phase 2](./02-core-game-logic.md), [Phase 3](./03-data-objects.md), [Phase 5](./05-analytics.md) | `handleResetGameState.md` |
| File uploads (images) | S3 presigned URLs (not SDK) | Advanced | `apps/sdk-bulletin-board.md` |
| Cross-app data sharing | JWT + shared app public key | Advanced | `apps/sdk-leaderboard.md` |
| Webhook-driven interactions | `DroppedAssetClickType.WEBHOOK` + handler | Advanced | `apps/sdk-quiz.md` |

## Quick Decision Flow

```
Need to persist data?
  |
  +-- For all players --> World data object (Phase 3)
  +-- For one player --> Visitor data object (Phase 3)
  +-- For one asset  --> DroppedAsset data object (Phase 3)
  +-- Rankings       --> Leaderboard on key asset (Phase 4)

Need to reward players?
  |
  +-- Permanent achievement --> Badge (Phase 6)
  +-- Cosmetic reward       --> Expression/emote (Phase 6)
  +-- Score tracking        --> Leaderboard (Phase 4)
  +-- Visual feedback       --> Particle + toast (Phase 7)

Need to modify the world?
  |
  +-- Add something    --> DroppedAsset.drop (Phase 2)
  +-- Change something --> droppedAsset.update* (Phase 2)
  +-- Remove something --> droppedAsset.delete (Phase 2)
  +-- Move player      --> visitor.moveVisitor (Phase 7)

Need to communicate with player?
  |
  +-- Pop-up message  --> visitor.fireToast (Phase 7)
  +-- Visual effect   --> triggerParticle (Phase 7)
  +-- Open detail UI  --> visitor.openIframe (Phase 7)
  +-- Close UI        --> visitor.closeIframe (Phase 7)
```
