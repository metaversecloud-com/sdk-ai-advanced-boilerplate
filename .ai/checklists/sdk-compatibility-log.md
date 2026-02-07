# SDK Compatibility Fix Log

Track all SDK compatibility audits and fixes applied to `.ai/` documentation files. Reference this when writing new examples or reviewing existing ones.

---

## Audit: 2026-02-07

**Auditor**: Claude Opus 4.6
**SDK Reference**: `.ai/apps/sdk-reference.md`
**Files audited**: All 34 examples, 7 guide phases, templates
**Files fixed**: 18

### Correct SDK Signatures (Verified)

These are the authoritative method signatures. All examples must match these:

```ts
// Factory methods — (id, urlSlug, options)
Visitor.get(visitorId: number, urlSlug: string, options?: { credentials })       // async, fetches data
Visitor.create(visitorId: number, urlSlug: string, options?: { credentials })    // synchronous, no fetch
DroppedAsset.get(assetId: string, urlSlug: string, options?: { credentials })    // async, fetches data
DroppedAsset.create(assetId: string, urlSlug: string, options?: { credentials }) // synchronous, no fetch
World.create(urlSlug: string, options?: { credentials })                         // synchronous, no fetch
User.create(options?: { credentials?, profileId? })                              // synchronous, options object

// Visitor actions
visitor.openIframe({ droppedAssetId: string, link: string, shouldOpenInDrawer?: boolean, title?: string })
visitor.closeIframe(assetId: string)                    // requires assetId parameter
visitor.grantExpression({ name: string })               // NOT grantExpressionByName()
visitor.triggerParticle({ name: string, duration?: number })  // duration in SECONDS
visitor.fireToast({ title: string, text: string })
visitor.moveVisitor(x: number, y: number)

// World actions
world.triggerActivity({ type: WorldActivityType, assetId: string })  // uses enum, not string
world.fireToast({ title: string, text: string })
World.deleteDroppedAssets(urlSlug, droppedAssetIds[], interactiveSecret, credentials)

// DroppedAsset actions
droppedAsset.updatePosition(x: number, y: number)       // 2 params only, NO yOrderAdjust
droppedAsset.updateWebImageLayers(bottom: string, top: string)
droppedAsset.updateClickType({ clickType, clickableLink?, ... })
droppedAsset.deleteDroppedAsset()
droppedAsset.fetchDroppedAssetById()                    // NOT fetchDetails()

// Asset creation
Asset.create(type: string, options: { credentials })     // async
DroppedAsset.drop(asset, dropOptions)                    // async
```

### Issues Found and Fixed

| # | Severity | Issue | Files Affected | Fix Applied |
|---|----------|-------|----------------|-------------|
| 1 | HIGH | `Visitor.get` argument order swapped (urlSlug first instead of visitorId) | admin-permission-guard.md, input-sanitization.md, locking-strategies.md, owner-vs-viewer.md | Changed to `Visitor.get(visitorId, urlSlug, { credentials })` |
| 2 | HIGH | `DroppedAsset.get` argument order swapped | admin-permission-guard.md, input-sanitization.md, locking-strategies.md, owner-vs-viewer.md | Changed to `DroppedAsset.get(assetId, urlSlug, { credentials })` |
| 3 | HIGH | `User.create` called with positional args instead of options object | cross-visitor-data.md | Changed to `User.create({ credentials })`, removed `await` (synchronous) |
| 4 | HIGH | Non-existent methods: `grantExpressionByName()`, `fetchDetails()`, `World.triggerWorldActivity()`, `world.sendGlobalMessage()` | grant-expression.md, scene-switching.md, world-activity-trigger.md | Replaced with correct methods: `grantExpression({ name })`, `fetchDroppedAssetById()`, `world.triggerActivity()`, `world.fireToast()` |
| 5 | HIGH | `visitor.openIframe()` called with wrong params `{ url, width, height }` | webhook-zone-trigger.md | Changed to `{ droppedAssetId, link, shouldOpenInDrawer, title }` |
| 6 | HIGH | `visitor.closeIframe()` called without required assetId | webhook-zone-trigger.md | Added `assetId` parameter |
| 7 | MEDIUM | `droppedAsset.updatePosition(x, y, yOrderAdjust)` — 3 params instead of 2 | update-asset.md, guide/02-core-game-logic.md | Removed third parameter |
| 8 | MEDIUM | `World.create()` and `DroppedAsset.create()` awaited (they're synchronous) | scene-switching.md, world-activity-trigger.md, cross-visitor-data.md | Removed `await` |
| 9 | MEDIUM | `world.triggerActivity()` used string `activityName` instead of `WorldActivityType` enum | world-activity-trigger.md | Changed to `{ type: WorldActivityType.GAME_ON, assetId }` with import |
| 10 | LOW | `triggerParticle` duration `3000` (milliseconds) should be `3` (seconds) | xp-leveling.md | Changed `duration: 3000` → `duration: 3` |
| 11 | LOW | Function name mismatch: `getWorldDataObject()` called but function defined as `getWorldAndDataObject()` | get-configuration.md | Fixed function name and argument format |
| 12 | LOW | Import extensions `.ts` instead of `.js` (ESM requires `.js`) | award-badge.md, drop-asset.md, get-anchor-assets.md, get-configuration.md | Changed all to `.js` |
| 13 | MEDIUM | `reset-game-state.md` used undefined `resetCount` variable and malformed options object | reset-game-state.md | Fixed lockId string, corrected `{ analytics, lock: { lockId, releaseLock: true } }` |
| 14 | LOW | Wrong method names in README.md index table | README.md | `Ecosystem.getInventory()` → `ecosystem.fetchInventoryItems()`, `droppedAsset.triggerParticle()` → `world.triggerParticle()` |

### Files Not Changed (Passed Audit)

These files were reviewed and found to have correct SDK usage:

- action-cooldowns.md
- badges.md
- daily-limits-streaks.md
- data-object-init.md
- fire-toast.md
- inventory-cache.md
- leaderboard.md
- open-close-iframe.md
- particle-effects.md
- probability-rewards.md
- real-time-sse-redis.md
- relocate-asset.md
- remove-asset.md
- remove-assets-bulk.md
- sound-effects.md
- spawn-interactive-asset.md
- teleport-visitor.md
- vote-reversal.md
- guide/01-project-setup.md
- guide/03-data-objects.md
- guide/04-leaderboard-ui.md
- guide/05-analytics.md
- guide/06-badges-expressions.md
- guide/07-polish-deploy.md

### Patterns to Watch For

When writing or reviewing new examples, check for these common mistakes:

1. **Argument order**: Always `(id, urlSlug, options)` for factory `.get()` and `.create()` methods
2. **Sync vs async**: `World.create()`, `DroppedAsset.create()`, `Visitor.create()`, `User.create()` are synchronous — don't `await` them
3. **Import extensions**: Always use `.js` in import paths (ESM resolution)
4. **Duration units**: `triggerParticle` uses seconds, not milliseconds
5. **openIframe signature**: Uses `{ droppedAssetId, link }`, not `{ url, width, height }`
6. **closeIframe**: Requires `assetId` parameter
7. **triggerActivity**: Uses `WorldActivityType` enum, not string names
8. **updatePosition**: Only takes `(x, y)` — no third parameter
