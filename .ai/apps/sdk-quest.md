# SDK Quest

**Repo**: [metaversecloud-com/sdk-quest](https://github.com/metaversecloud-com/sdk-quest)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-quest/`
**Quality**: Medium-High — solid game mechanics (streaks, daily limits, badges), good error handling, but inconsistent inventory cache usage, no tests
**SDK Version**: `@rtsdk/topia@^0.19.4`

## What It Does

Daily quest item collection game. Admin drops quest items (eggs/collectibles) in the world. Players click items to collect them, earning streaks and badges. Items teleport to new random positions after being collected. Features daily collection limits, streak tracking, 8 badges, and emote unlocks every 50 items.

### User Flow

1. Click key asset -> Home drawer with leaderboard + badges
2. Explore world, click quest items -> item collected, teleports to new position
3. Daily limit enforced (configurable by admin)
4. Earn badges for milestones (first find, 25/50/75/100 collected, streaks)
5. Every 50 items -> emote unlock

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/quest` | Quest config + visitor info + badges + inventory |
| GET | `/api/leaderboard` | Sorted leaderboard (by total collected) |
| GET | `/api/quest-items` | All quest items in world |
| POST | `/api/drop-quest-item` | Drop new quest item at random position |
| POST | `/api/quest-item-clicked` | Core: collect item, update progress, award badges |
| POST | `/api/dropped-asset/remove-all-with-unique-name` | Remove all quest items |
| DELETE | `/api/dropped-asset/:droppedAssetId` | Remove single item |
| PUT | `/api/visitor/move` | Teleport visitor |
| POST | `/api/admin-settings` | Update quest config |
| DELETE | `/api/quest` | Full quest removal |

## Data Structures

### Visitor Progress
```typescript
type VisitorProgressType = {
  currentStreak: number;
  lastCollectedDate: Date;
  longestStreak: number;
  totalCollected: number;
  totalCollectedToday: number;
};
// Stored at: visitor.dataObject["{urlSlug}-{sceneDropId}"]
```

### World Data Object
```typescript
{
  scenes: {
    [sceneDropId: string]: {
      keyAssetId: string;
      numberAllowedToCollect: number;
      questItemImage: string;
    };
  };
}
```

### Key Asset Data Object (leaderboard)
```typescript
{
  questItemImage?: string;
  leaderboard: {
    [profileId: string]: "displayName|totalCollected|longestStreak";  // pipe-delimited
  };
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `droppedAsset.updatePosition(x, y)` | Relocate quest item after collection |
| `droppedAsset.updateClickType(opts)` | Update click URL with new `lastMoved` timestamp |
| `droppedAsset.updateWebImageLayers("", image)` | Update item image |
| `visitor.grantExpression({ name })` | Unlock emote every 50 items |
| `visitor.grantInventoryItem(item, qty)` | Award badges |
| `visitor.triggerParticle({ name, duration })` | Collection effects |
| `visitor.fireToast(opts)` | Notifications |
| `visitor.closeIframe(assetId)` | Close drawer |
| `world.triggerParticle({ position, name })` | World-level effects |
| `world.fetchDetails()` | Get world dimensions for random positioning |

**Notable new SDK method**: `droppedAsset.updatePosition(x, y)` — moves asset to new coordinates

## Key Patterns

### 8 Badge Achievement System
| Badge | Trigger |
|-------|---------|
| First Find | First quest item collected |
| Quest Veteran - Bronze | 25 total |
| Quest Veteran - Silver | 50 total |
| Quest Veteran - Gold | 75 total |
| Quest Veteran - Diamond | 100 total |
| 3-Day Streak | 3 consecutive days |
| 5-Day Streak | 5 consecutive days |
| Inventory Pro | Collected all daily allowed items |

### Quest Item Relocation on Click
```typescript
// Item doesn't disappear — it moves to a random new position
await questItem.updatePosition(position.x, position.y);
await questItem.updateClickType({
  clickableLink: getBaseURL(req) + "/quest-item-clicked/" + `?lastMoved=${new Date().valueOf()}`,
});
```

### Emote Unlock Every 50 Items
```typescript
if (totalCollected % 50 === 0) {
  const grantResult = await visitor.grantExpression({ name: process.env.EMOTE_NAME || "quest_1" });
  // 200 = newly unlocked, 409 = already owned
}
```

### Promise.allSettled for Non-Critical Operations
```typescript
const promises = [];
promises.push(questItem.updatePosition(...));
promises.push(world.triggerParticle({ ... }).catch(errorHandler));
promises.push(awardBadge({ ... }).catch(errorHandler));
promises.push(visitor.updateDataObject({ ... }));
promises.push(keyAsset.updateDataObject({ ... }, { analytics }));
const results = await Promise.allSettled(promises);
```

## RPG Relevance

- **Daily collection limits**: Enforced daily caps — applicable for RPG daily quests
- **Streak system**: Consecutive day tracking — RPG login/activity streaks
- **8-tier badge progression**: Bronze -> Silver -> Gold -> Diamond — achievement tiers
- **Emote unlock milestones**: Every 50 items — RPG milestone rewards
- **Item relocation**: Items move after collection — dynamic world state
- **Google Sheets analytics**: External tracking — progress logging

## Weaknesses

- `awardBadge` doesn't use inventory cache (creates fresh Ecosystem each call) while `getBadges` does use cache — inconsistent
- `getDefaultKeyAssetImage` is dead code (defined but never called)
- Multiple `@ts-ignore` comments
- Pipe-delimited leaderboard strings can break if display name contains `|`
- No tests
