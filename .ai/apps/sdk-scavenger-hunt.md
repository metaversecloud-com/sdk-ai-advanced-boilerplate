# SDK Scavenger Hunt

**Repo**: [metaversecloud-com/sdk-scavenger-hunt](https://github.com/metaversecloud-com/sdk-scavenger-hunt)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-scavenger-hunt/`
**Quality**: High — comprehensive feature set, badge system, theming, multi-scene support, inventory cache, but no tests, some bugs
**SDK Version**: `@rtsdk/topia@^0.19.4`

## What It Does

Players explore a Topia world finding hidden clue assets, then solve a challenge (text, multiple choice, or "all that apply"). Supports multiple themes, admin-configurable clues with images/video/website content, a leaderboard, and badge achievements. Multiple independent scavenger hunts can run in the same world via `sceneDropId` namespacing.

### User Flow

1. Click key asset -> opens Home drawer with leaderboard + badges
2. Explore world, click clue assets -> clue content shown (image/video/website)
3. Find all clues -> challenge unlocked (text answer, multiple choice, or all-that-apply)
4. Answer correctly -> completion recorded, badges awarded
5. Admins: configure clues, challenge, themes, drop/remove clue assets

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/configuration` | Admin: full config (clues, challenge, emotes, theme) |
| GET | `/api/challenge` | Player: challenge state + progress + badges |
| POST | `/api/update-challenge` | Admin: save challenge settings |
| POST | `/api/answer-challenge` | Submit answer (text or multiple choice) |
| POST | `/api/restart-challenge` | Reset visitor's progress |
| GET | `/api/clue` | Record clue discovery + return content |
| POST | `/api/update-clue` | Admin: update clue config |
| POST | `/api/remove-clue` | Admin: remove clue asset |
| POST | `/api/reset-clues` | Re-scan world for clue assets |
| POST | `/api/walk-up-to-clue-asset` | Move admin to clue position |
| POST | `/api/add-new-clue` | Drop new clue asset near admin |

## Data Structures

### World Data Object (multi-scene)
```typescript
{
  scenes: {
    [sceneDropId: string]: {
      sceneDropId: string;
      keyAssetId: string;
      buildableAssetUniqueName?: string;
      theme?: string;
      challenge: {
        answer?: string;
        text: string;
        imgUrl: string;
        title?: string;
        selectedEmote?: string;
        questionType?: "text" | "multiple_choice" | "all_that_apply";
        options?: { [key: string]: string };
        correctAnswers?: string[];
      };
      clues: {
        [assetId: string]: {
          id: string; imgUrl: string; contentUrl: string;
          mediaType: "image" | "video" | "website";
          linkBehavior: "modal" | "drawer" | "tab";
          text: string;
        };
      };
    };
  };
}
```

### Visitor Data Object (cross-world progress)
```typescript
{
  ["{urlSlug}_{sceneDropId}"]: {
    challengeDone: boolean;
    cluesFound: string[];       // array of assetIds
    answerAttempts?: number;
  };
}
```

### Key Asset Data Object (leaderboard)
```typescript
{
  theme?: string;
  challenge?: ChallengeType;
  leaderboard?: {
    [profileId: string]: string;  // "displayName|cluesCount|challengeDone|answerAttempts"
  };
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.create/get/drop` | Clue asset management |
| `droppedAsset.updateWebImageLayers("", imgUrl)` | Update clue visuals |
| `droppedAsset.updateClickType(options)` | Configure clue click behavior |
| `droppedAsset.deleteDroppedAsset()` | Remove clue |
| `visitor.getExpressions({ getUnlockablesOnly: true })` | Available emotes |
| `visitor.grantExpression(emote)` | Unlock emote on completion |
| `visitor.triggerParticle({ name, duration })` | "explosion_float", "partyPopper_float" |
| `visitor.fireToast({ groupId, title, text })` | Notifications |
| `visitor.moveVisitor({ shouldTeleportVisitor, x, y })` | Admin walk-to-clue |
| `visitor.fetchInventoryItems()` | Get badge inventory |
| `visitor.grantInventoryItem(inventoryItem, 1)` | Award badge |
| `world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName })` | Find clue assets |
| `world.triggerParticle({ name, duration, position })` | "disco_float" at clue position |

**Notable new SDK methods**: `visitor.getExpressions`, `visitor.grantExpression`, `Asset.create` for spawning new clues

## Key Patterns

### Badge System with Cross-World Progress
```typescript
// 5 badges, awarded based on aggregate progress across all worlds:
// "Spark of Discovery" — first clue ever
// "Traveler" — clues in 3+ worlds
// "Scout" — 25+ total clues
// "Quick Thinker" — correct on first attempt
// "Curious Mind" — 10+ completions

const getVisitorProgress = (visitorDataObject) => {
  let totalCompletions = 0;
  const uniqueWorlds = new Set<string>();
  let totalCluesCollected = 0;
  for (const key of Object.keys(visitorDataObject)) {
    // Aggregate across all "{urlSlug}_{sceneDropId}" keys
  }
  return { totalCompletions, uniqueWorlds, totalCluesCollected };
};
```

### Compact Leaderboard Serialization
```typescript
const resultString = `${displayName}|${cluesCount}|${challengeDone}|${answerAttempts}`;
await keyAsset.updateDataObject({ [`leaderboard.${profileId}`]: resultString }, {});
```

### Multi-Question Type Challenge
```typescript
// Supports: "text" (free text), "multiple_choice" (single), "all_that_apply" (multiple)
// Admin configures question type, options map, and correctAnswers array
```

### Dynamic Asset Spawning
```typescript
const asset = await Asset.create(process.env.IMG_ASSET_ID || "webImageAsset", { credentials });
const spawnedAsset = await DroppedAsset.drop(asset, {
  clickableLink: `${BASE_URL}/clue`,
  isOpenLinkInDrawer: true,
  position,
  uniqueName,
  isInteractive: true,
  sceneDropId,
  interactivePublicKey: process.env.INTERACTIVE_KEY,
});
```

### Legacy Data Migration
```typescript
// Handles: contentImgUrl -> contentUrl, isVideo -> mediaType, key format migration
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Collection / Scavenger Hunt** | Dynamic asset spawning, cross-world progress, 5-badge achievement system |
| **Trivia / Quiz** | Multi-question types (text, multiple choice, all-that-apply), theming system |
| **Education / Learning** | Cross-world progress persistence, multi-scene support, milestone badges |
| **Any game type** | Inventory cache pattern (24h TTL with stale fallback), independent scene instances |

## Weaknesses

- `isAdmin: true` hardcoded in `handleGetClue` (bug)
- `mongoose` dependency imported but never used
- No tests
- `getRandomPointInCircle` utility exists but never called
- No input validation on challenge answers/clue text
