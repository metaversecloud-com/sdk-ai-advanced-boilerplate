# Claude Prompts for SDK Features

This document contains ideal prompts to give Claude for implementing common SDK features. Each prompt references the corresponding example documentation.

## Badges System

### Add Complete Badges Feature
```
Add a badges system to this app:
1. Create getBadges utility to fetch ecosystem badges (see sdk-ai-boilerplate examples/badges.md)
2. Create getVisitorBadges utility to get visitor's owned badges
3. Update the main controller to return badges and visitorInventory
4. Add BadgeType and VisitorInventoryType to client context
5. Display badges in a tabbed UI with owned badges in color and unowned grayed out
```

### Add Inventory Cache
```
Add cached inventory for badges (see sdk-ai-boilerplate examples/inventoryCache.md):
1. Add EcosystemFactory to topiaInit.ts
2. Create inventoryCache.ts with 24-hour TTL cache
3. Export from utils/index.ts
```

### Award Badge to Visitor
```
Add functionality to award a badge to a visitor (see sdk-ai-boilerplate examples/awardBadge.md):
1. Check if visitor already has the badge
2. Get badge from cached inventory items
3. Grant badge using visitor.grantInventoryItem()
4. Show toast notification
```

## Assets

### Drop Assets into World
```
Add ability to drop assets into the world (see sdk-ai-boilerplate examples/handleDropAssets.md):
1. Get position from existing dropped asset
2. Create web image asset using Asset.create()
3. Drop asset using DroppedAsset.drop() with position, layers, and click settings
4. Optionally add text asset at offset position
```

### Remove Dropped Asset
```
Add ability to remove a dropped asset (see sdk-ai-boilerplate examples/handleRemoveDroppedAsset.md):
1. Get the dropped asset by ID
2. Trigger particle effect at asset position
3. Close the iframe for the visitor
4. Fire toast notification
5. Delete the dropped asset
```

### Bulk Remove Dropped Assets
```
Add ability to remove multiple dropped assets (see sdk-ai-boilerplate examples/handleRemoveDroppedAssets.md):
1. Get all dropped assets by unique name pattern
2. Delete each asset
3. Handle errors gracefully
```

### Update Dropped Asset
```
Add ability to update a dropped asset (see sdk-ai-boilerplate examples/handleUpdateDroppedAsset.md):
1. Get the dropped asset by ID
2. Update properties using droppedAsset.updateCustomTextAsset() or updateDataObject()
3. Return success response
```

## Configuration

### Get World Configuration
```
Add configuration endpoint (see sdk-ai-boilerplate examples/handleGetConfiguration.md):
1. Get world data object with theme configuration
2. Get visitor to check admin status
3. Get available expressions/emotes
4. Return configuration data to client
```

### Get Anchor Assets
```
Add utility to fetch anchor assets (see sdk-ai-boilerplate examples/getAnchorAssets.md):
1. Use World.fetchDroppedAssetsWithUniqueName()
2. Filter by scene and unique name pattern
3. Return positioned assets for game logic
```

## Game State

### Reset Game State
```
Add admin-only game reset functionality (see sdk-ai-boilerplate examples/handleResetGameState.md):
1. Check if visitor is admin
2. Clear world data object for scene
3. Remove all dropped assets with scene prefix
4. Reset visitor progress
5. Fire confirmation toast
```

## Leaderboards

### Add Complete Leaderboard Feature
```
Add a leaderboard system to this app (see sdk-ai-boilerplate examples/leaderboard.md):
1. Create updateLeaderboard utility to store visitor progress as pipe-delimited string
2. Update game completion handler to call updateLeaderboard
3. Fetch and parse leaderboard in main controller (admin-only)
4. Add LeaderboardEntryType to client context
5. Display leaderboard in admin UI with table showing rank, name, score, and status
```

### Add Leaderboard Update Utility
```
Add utility to update leaderboard (see sdk-ai-boilerplate examples/leaderboard.md):
1. Store data as pipe-delimited string: "displayName|score|status"
2. Use keyAsset.updateDataObject() with leaderboard.${profileId} path
3. Handle initial leaderboard creation if it doesn't exist
```

### Add Leaderboard Display
```
Add leaderboard table to admin UI (see sdk-ai-boilerplate examples/leaderboard.md):
1. Add leaderboard to context types and reducer
2. Fetch leaderboard from server (admin-only)
3. Create table with rank, name, metrics columns
4. Sort by completion status first, then by score
```

### Remove Leaderboard Entry on Restart
```
Add leaderboard entry removal when visitor restarts (see sdk-ai-boilerplate examples/leaderboard.md):
1. Fetch key asset data object
2. Delete the profileId key from leaderboard object
3. Update the entire leaderboard object back to the asset
```

## Combined Features

### Full Game Setup
```
Set up a new game app with these features:
1. Configuration endpoint with theme and emotes (see handleGetConfiguration.md)
2. Badges system with ecosystem and visitor inventory (see badges.md)
3. Asset dropping capability (see handleDropAssets.md)
4. Asset removal with effects (see handleRemoveDroppedAsset.md)
5. Admin reset functionality (see handleResetGameState.md)

Use the patterns from sdk-ai-boilerplate/.ai/examples/ for implementation.
```

### Add Collectibles Feature
```
Add a collectibles/items system:
1. Use inventory cache pattern for ecosystem items (see inventoryCache.md)
2. Track visitor's collected items in visitor data object
3. Award items using visitor.grantInventoryItem()
4. Display collected vs uncollected in UI (see badges.md UI pattern)
5. Show toast notifications on collection
```

## Quick Reference Prompts

| Feature | Prompt |
|---------|--------|
| Badges | "Add badges system (see sdk-ai-boilerplate examples/badges.md)" |
| Inventory Cache | "Add cached inventory (see sdk-ai-boilerplate examples/inventoryCache.md)" |
| Award Badge | "Add badge awarding (see sdk-ai-boilerplate examples/awardBadge.md)" |
| Drop Asset | "Add asset dropping (see sdk-ai-boilerplate examples/handleDropAssets.md)" |
| Remove Asset | "Add asset removal with effects (see sdk-ai-boilerplate examples/handleRemoveDroppedAsset.md)" |
| Configuration | "Add config endpoint (see sdk-ai-boilerplate examples/handleGetConfiguration.md)" |
| Game Reset | "Add admin reset (see sdk-ai-boilerplate examples/handleResetGameState.md)" |
| Leaderboard | "Add leaderboard system (see sdk-ai-boilerplate examples/leaderboard.md)" |

## Tips for Best Results

1. **Reference the example**: Always mention "see sdk-ai-boilerplate examples/[filename].md" so Claude knows which pattern to follow

2. **Be specific about scope**: Mention which parts you need:
   - "server utility only"
   - "full stack with UI"
   - "update existing controller"

3. **Specify the app**: Include the app path:
   - "in sdk-scavenger-hunt"
   - "in sdk-quest"
   - "in this app"

4. **Chain features**: Combine related prompts:
   ```
   Add badges with UI tabs:
   1. Server: getBadges and getVisitorBadges utilities
   2. Controller: return badges and visitorInventory
   3. Client: types, reducer, and tabbed display
   See sdk-ai-boilerplate examples/badges.md
   ```

5. **Update documentation**: After implementation, ask:
   ```
   Update sdk-ai-boilerplate documentation if this pattern is reusable across apps
   ```
