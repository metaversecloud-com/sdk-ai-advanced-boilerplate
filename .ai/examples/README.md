# SDK Pattern Examples

Categorized reference of 34 copy-paste code examples extracted from 12 production Topia SDK apps.

> **Format**: Every example includes Server Implementation, Client Implementation, Variations table, Common Mistakes, Related Examples, and Related Skills.

## Semantic Search Index

Use this index to find examples by keyword. Search for the concept you need — each example is tagged with searchable terms.

| Example | Tags | Summary |
|---------|------|---------|
| [drop-asset.md](./drop-asset.md) | `spawn, create, place, image, web-image, layers, position, world` | Create and place a new asset in the world at a given position |
| [update-asset.md](./update-asset.md) | `modify, image, click-type, layers, web-image, link, properties` | Change an existing asset's image, click behavior, or properties |
| [remove-asset.md](./remove-asset.md) | `delete, destroy, cleanup, single-asset, particle, toast` | Remove a single dropped asset with optional visual effects |
| [remove-assets-bulk.md](./remove-assets-bulk.md) | `delete, bulk, cleanup, multiple, batch, unique-name` | Remove all assets matching a name pattern |
| [get-anchor-assets.md](./get-anchor-assets.md) | `find, query, search, unique-name, scene, position, fetch` | Find dropped assets by unique name or scene |
| [relocate-asset.md](./relocate-asset.md) | `move, position, reposition, coordinates, drag` | Move a dropped asset to a new position |
| [spawn-interactive-asset.md](./spawn-interactive-asset.md) | `create, interactive, iframe, click, spawn, dynamic` | Spawn an asset that opens an interactive iframe when clicked |
| [get-configuration.md](./get-configuration.md) | `config, settings, theme, world-data, initialization, setup` | Fetch world configuration and theme settings |
| [reset-game-state.md](./reset-game-state.md) | `admin, reset, clear, wipe, restart, defaults` | Admin-only game state reset with asset cleanup |
| [data-object-init.md](./data-object-init.md) | `initialize, setup, defaults, fetch-check-set, lock, race-condition` | Safe data object initialization pattern (fetch-check-set-update) |
| [cross-visitor-data.md](./cross-visitor-data.md) | `user, cross-world, persistent, profile, shared-data, multi-world` | Access visitor data that persists across worlds |
| [badges.md](./badges.md) | `achievement, badge, inventory, ecosystem, earned, unearned, grayscale, tabs` | Full badges system: ecosystem cache, visitor inventory, tabbed UI |
| [award-badge.md](./award-badge.md) | `grant, badge, inventory-item, reward, toast, achievement` | Award a specific badge to a visitor with duplicate prevention |
| [inventory-cache.md](./inventory-cache.md) | `cache, ecosystem, TTL, performance, badges, items, 24-hour` | 24-hour TTL cache for ecosystem inventory items |
| [grant-expression.md](./grant-expression.md) | `emote, expression, cosmetic, reward, unlock` | Grant an emote/expression to a visitor |
| [leaderboard.md](./leaderboard.md) | `ranking, score, pipe-delimited, table, sort, competition, key-asset` | Pipe-delimited leaderboard stored on key asset data object |
| [teleport-visitor.md](./teleport-visitor.md) | `move, teleport, position, coordinates, transport` | Move a visitor to a specific location in the world |
| [open-close-iframe.md](./open-close-iframe.md) | `iframe, drawer, popup, open, close, UI, modal` | Open or close an interactive iframe for a visitor |
| [fire-toast.md](./fire-toast.md) | `notification, toast, message, alert, popup, feedback` | Show a toast notification to a visitor or all visitors |
| [particle-effects.md](./particle-effects.md) | `visual, effect, celebration, sparkle, smoke, trophy, hearts, animation` | Trigger particle effects on visitors or at world positions |
| [sound-effects.md](./sound-effects.md) | `audio, sound, music, client-side, play, feedback` | Client-side sound effects using the Audio API |
| [xp-leveling.md](./xp-leveling.md) | `experience, XP, level, progression, rank, curve, threshold, level-up` | XP accumulation with level calculation and milestone side effects |
| [action-cooldowns.md](./action-cooldowns.md) | `cooldown, timer, rate-limit, wait, throttle, timestamp, countdown` | Server-side cooldown enforcement with client timer display |
| [daily-limits-streaks.md](./daily-limits-streaks.md) | `daily, limit, streak, consecutive, reset, midnight, UTC, cap` | Daily action limits and consecutive-day streak tracking |
| [probability-rewards.md](./probability-rewards.md) | `random, chance, drop-rate, luck, reward, RNG, loot` | Randomized rewards with configurable probability weights |
| [vote-reversal.md](./vote-reversal.md) | `vote, poll, toggle, undo, change-vote, selection, lock` | Allow visitors to change their vote with atomic locking |
| [scene-switching.md](./scene-switching.md) | `scene, switch, swap, level, stage, transition, cleanup` | Switch between scenes with asset cleanup |
| [webhook-zone-trigger.md](./webhook-zone-trigger.md) | `webhook, zone, trigger, area, proximity, auto-open` | Trigger actions when a visitor enters a zone |
| [world-activity-trigger.md](./world-activity-trigger.md) | `activity, signal, platform, event, notification` | Signal game events to the Topia platform |
| [admin-permission-guard.md](./admin-permission-guard.md) | `admin, permission, guard, middleware, 403, authorization, restrict` | Restrict routes/actions to world administrators |
| [input-sanitization.md](./input-sanitization.md) | `sanitize, validate, XSS, security, escape, clean, user-input` | Sanitize user input to prevent XSS and injection |
| [locking-strategies.md](./locking-strategies.md) | `lock, race-condition, concurrency, atomic, time-bucket, mutex` | Time-bucketed locking to prevent concurrent write conflicts |
| [owner-vs-viewer.md](./owner-vs-viewer.md) | `owner, viewer, permission, ownership, profile, access-control` | Differentiate between asset owner and other visitors |
| [real-time-sse-redis.md](./real-time-sse-redis.md) | `real-time, SSE, Redis, pub-sub, live-update, streaming, multiplayer` | Server-Sent Events with Redis for real-time multiplayer |
| [multiplayer-integration.md](./multiplayer-integration.md) | `multiplayer, real-time, game, entity, bot, room, Colyseus, physics, interpolation` | Integrate @topia/multiplayer for real-time multiplayer games |

## Asset Management

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [drop-asset.md](./drop-asset.md) | `Asset.create()`, `DroppedAsset.drop()` | Starter | Multiple | [add-route](../skills/add-route.md) |
| [update-asset.md](./update-asset.md) | `droppedAsset.updateClickType()`, `updateWebImageLayers()` | Starter | Multiple | [add-route](../skills/add-route.md) |
| [remove-asset.md](./remove-asset.md) | `droppedAsset.deleteDroppedAsset()` | Starter | Multiple | [add-route](../skills/add-route.md) |
| [remove-assets-bulk.md](./remove-assets-bulk.md) | `World.deleteDroppedAssets()` | Starter | Multiple | [add-route](../skills/add-route.md) |
| [get-anchor-assets.md](./get-anchor-assets.md) | `world.fetchDroppedAssetsWithUniqueName()` | Starter | Multiple | [add-route](../skills/add-route.md) |
| [relocate-asset.md](./relocate-asset.md) | `droppedAsset.updatePosition()` | Starter | sdk-quest | [add-route](../skills/add-route.md) |
| [spawn-interactive-asset.md](./spawn-interactive-asset.md) | `Asset.create()`, `DroppedAsset.drop()` | Intermediate | virtual-pet, sdk-scavenger-hunt | [add-route](../skills/add-route.md) |

## Data & Configuration

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [get-configuration.md](./get-configuration.md) | `fetchDataObject()`, `setDataObject()` | Starter | Multiple | [add-data-object](../skills/add-data-object.md) |
| [reset-game-state.md](./reset-game-state.md) | `setDataObject()` with defaults | Starter | Multiple | [add-admin-feature](../skills/add-admin-feature.md) |
| [data-object-init.md](./data-object-init.md) | `fetchDataObject()`, `setDataObject()`, `updateDataObject()` | Starter | Consolidated | [add-data-object](../skills/add-data-object.md) |
| [cross-visitor-data.md](./cross-visitor-data.md) | `User.create()`, `user.fetchDataObject()` | Intermediate | sdk-grow-together | [add-data-object](../skills/add-data-object.md) |

## Badges & Inventory

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [badges.md](./badges.md) | Ecosystem cache, visitor inventory, UI display | Intermediate | Multiple | [add-badges](../skills/add-badges.md) |
| [award-badge.md](./award-badge.md) | `visitor.grantInventoryItem()` | Starter | Multiple | [add-badges](../skills/add-badges.md) |
| [inventory-cache.md](./inventory-cache.md) | `ecosystem.fetchInventoryItems()` | Intermediate | Multiple | [add-badges](../skills/add-badges.md) |
| [grant-expression.md](./grant-expression.md) | `visitor.grantExpression()` | Intermediate | sdk-quest, virtual-pet, sdk-scavenger-hunt | [add-badges](../skills/add-badges.md) |

## Leaderboard

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [leaderboard.md](./leaderboard.md) | `updateDataObject()` with pipe-delimited strings | Intermediate | Multiple | [add-leaderboard](../skills/add-leaderboard.md) |

## Visitor Actions

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [teleport-visitor.md](./teleport-visitor.md) | `visitor.moveVisitor()` | Starter | sdk-grow-together, sdk-race | [add-route](../skills/add-route.md) |
| [open-close-iframe.md](./open-close-iframe.md) | `visitor.openIframe()`, `visitor.closeIframe()` | Starter | sdk-quiz, virtual-pet | [add-route](../skills/add-route.md) |
| [fire-toast.md](./fire-toast.md) | `visitor.fireToast()`, `world.fireToast()` | Starter | Consolidated | [add-route](../skills/add-route.md) |
| [particle-effects.md](./particle-effects.md) | `visitor.triggerParticle()`, `world.triggerParticle()` | Starter | virtual-pet, sdk-quest | [add-route](../skills/add-route.md) |
| [sound-effects.md](./sound-effects.md) | Client-side `Audio()` API | Starter | sdk-grow-together, sdk-race | [add-component](../skills/add-component.md) |

## Game Mechanics

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [xp-leveling.md](./xp-leveling.md) | `visitor.updateDataObject()`, `visitor.triggerParticle()` | Intermediate | sdk-grow-together, virtual-pet | [add-game-mechanic](../skills/add-game-mechanic.md) |
| [action-cooldowns.md](./action-cooldowns.md) | `visitor.updateDataObject()` with timestamps | Intermediate | virtual-pet | [add-game-mechanic](../skills/add-game-mechanic.md) |
| [daily-limits-streaks.md](./daily-limits-streaks.md) | `visitor.updateDataObject()`, `visitor.incrementDataObjectValue()` | Intermediate | sdk-quest, sdk-stride-check-in | [add-game-mechanic](../skills/add-game-mechanic.md) |
| [probability-rewards.md](./probability-rewards.md) | `visitor.incrementDataObjectValue()` | Intermediate | sdk-grow-together | [add-game-mechanic](../skills/add-game-mechanic.md) |
| [vote-reversal.md](./vote-reversal.md) | `droppedAsset.updateDataObject()` with lock | Intermediate | sdk-poll | [add-data-object](../skills/add-data-object.md) |

## World Management

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [scene-switching.md](./scene-switching.md) | `world.dropScene()`, `World.deleteDroppedAssets()` | Advanced | scene-swapper, sdk-race | [add-route](../skills/add-route.md) |
| [webhook-zone-trigger.md](./webhook-zone-trigger.md) | `visitor.openIframe()`, `visitor.closeIframe()` | Intermediate | sdk-quiz | [add-route](../skills/add-route.md) |
| [world-activity-trigger.md](./world-activity-trigger.md) | `world.triggerActivity()` | Starter | sdk-race, sdk-grow-together | [add-route](../skills/add-route.md) |

## Security & Patterns

| Example | SDK Methods | Difficulty | Source Apps | Skill |
|---------|------------|------------|-------------|-------|
| [admin-permission-guard.md](./admin-permission-guard.md) | `Visitor.get()`, `visitor.isAdmin` | Starter | Multiple | [add-admin-feature](../skills/add-admin-feature.md) |
| [input-sanitization.md](./input-sanitization.md) | N/A (pure utility) | Starter | sdk-stride-check-in, sdk-bulletin-board | [add-route](../skills/add-route.md) |
| [locking-strategies.md](./locking-strategies.md) | `setDataObject()`, `updateDataObject()` with `lock` | Intermediate | Multiple | [add-data-object](../skills/add-data-object.md) |
| [owner-vs-viewer.md](./owner-vs-viewer.md) | `fetchDataObject()`, ownership check | Intermediate | virtual-pet | [add-admin-feature](../skills/add-admin-feature.md) |
| [real-time-sse-redis.md](./real-time-sse-redis.md) | N/A (Express SSE + Redis pub/sub) | Advanced | sdk-race | — |
