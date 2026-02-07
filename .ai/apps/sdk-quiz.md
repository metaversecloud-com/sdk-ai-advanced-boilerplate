# SDK Quiz

**Repo**: [metaversecloud-com/sdk-quiz](https://github.com/metaversecloud-com/sdk-quiz)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-quiz/`
**Quality**: Medium-High — clean architecture, badge system, webhook-driven zones, but client-side answer validation is insecure, no tests
**SDK Version**: `@rtsdk/topia@^0.19.3`

## What It Does

A timed quiz race game. Players enter a "start" zone, answer questions at numbered zone checkpoints, and compete for fastest completion with highest score. Features a leaderboard, 4 badge achievements, and admin question editing.

### User Flow

1. Enter start zone -> webhook opens iframe drawer
2. See instructions + "Start Quiz" button
3. Navigate to question zones (1, 2, 3...) -> each opens the question in a drawer
4. Select answer -> immediate correct/incorrect feedback
5. Answer all questions -> timer stops, score shown
6. Check leaderboard (sorted by score desc, time asc) + badges

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/quiz` | Get full game state (quiz, leaderboard, badges, inventory) |
| POST | `/api/quiz/start` | Start timer, trigger GAME_ON activity |
| POST | `/api/question/answer/:questionId` | Submit answer + badge check |
| POST | `/api/quiz/update` | Admin: update questions |
| POST | `/api/quiz/reset` | Admin: reset leaderboard + all visitor progress |
| POST | `/api/open-iframe` | Webhook: auto-open iframe when entering zone |

## Data Structures

### Key Asset Data Object (quiz config + leaderboard)
```typescript
{
  questions: {
    [questionId: string]: {
      questionText: string;
      answer: string;
      options: { [optionId: string]: string };
    };
  };
  leaderboard: {
    [profileId: string]: "displayName|score|timeElapsed";  // pipe-delimited
  };
}
```

### Visitor Data Object
```typescript
{
  quizzesCompleted: number;  // lifetime counter for Quiz Master badge
  ["{urlSlug}-{sceneDropId}"]: {
    answers: { [questionId: string]: { answer: string; isCorrect: boolean } };
    timeElapsed: "MM:SS";
    endTime: Date | null;
    startTime: Date | null;
  };
}
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `visitor.openIframe({ droppedAssetId, link, shouldOpenInDrawer, title })` | Open question drawer |
| `visitor.closeIframe(assetId)` | Close drawer |
| `visitor.triggerParticle({ name, duration })` | Completion effects |
| `visitor.fireToast({ title, text })` | Notifications |
| `visitor.grantInventoryItem(inventoryItem, 1)` | Award badges |
| `visitor.updatePublicKeyAnalytics(analyticsArray)` | Report analytics |
| `world.triggerActivity({ type: WorldActivityType.GAME_ON, assetId })` | Game start activity |
| `world.fetchDroppedAssetsBySceneDropId({ sceneDropId })` | Find key asset |
| `User.create({ credentials, profileId })` | Reset other players' data |

## Key Patterns

### Webhook-Driven Iframe Opening
```typescript
// Topia zone webhook triggers handleOpenIframe
await visitor.closeIframe(assetId);  // Close existing
visitor.openIframe({
  droppedAssetId: assetId,
  link,  // Full URL with query params
  shouldOpenInDrawer: true,
  title: "Quiz Race",
});
```

### Badge System (4 badges)
| Badge | Condition |
|-------|-----------|
| Perfect Score | All answers correct |
| Lightning Round | Completed in <= 30 seconds |
| Quiz Master | 10 quizzes completed (lifetime) |
| Top 3 Finisher | In top 3 of leaderboard |

### Parallel Side Effects with Promise.allSettled
```typescript
const promises = [];
promises.push(awardBadge({ ... }).catch(errorHandler));
promises.push(visitor.triggerParticle({ ... }).catch(errorHandler));
promises.push(visitor.updateDataObject({ ... }));
const results = await Promise.allSettled(promises);
```

### Key Asset Lookup via World Data Object
```typescript
// World data maps sceneDropId -> keyAssetId
// Question zones use this to find the Start asset holding quiz data
if (dataObject?.[sceneDropId]?.keyAssetId) {
  keyAssetId = dataObject[sceneDropId].keyAssetId;
} else {
  const droppedAssets = await world.fetchDroppedAssetsBySceneDropId({ sceneDropId });
  const keyAsset = droppedAssets.find((da) => da.uniqueName === "start");
  keyAssetId = keyAsset?.id!;
}
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Trivia / Quiz** | Zone-based triggers, timed challenges, badge system (4 tiers), admin question CRUD |
| **Education / Learning** | Score + time ranking leaderboard, zone-triggered content delivery |
| **Collection / Scavenger Hunt** | Zone-based gameplay (webhook-driven iframe), badge achievements |
| **Racing / Competition** | Timer mechanics, competitive leaderboard with score + time |

## Weaknesses

- **Security flaw**: Client determines `isCorrect` before sending to server — answers are exposed to client
- No tests
- Duplicate CSS import in main.tsx
- Hardcoded badge names (no constants)
