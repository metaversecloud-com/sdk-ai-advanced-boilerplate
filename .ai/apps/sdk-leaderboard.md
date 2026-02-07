# SDK Leaderboard

**Repo**: [metaversecloud-com/sdk-leaderboard](https://github.com/metaversecloud-com/sdk-leaderboard)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-leaderboard/`
**Quality**: Medium-High — clean architecture, polymorphic patterns, JWT auth, but has INTERACTIVE_JWT env bug, no tests
**SDK Version**: `@rtsdk/topia@^0.17.3`

## What It Does

Universal leaderboard widget that can be attached to any Topia app. Displays ranked player scores sourced from any component type (DroppedAsset, Ecosystem, Visitor, or World). Other apps call POST endpoints to update scores. Admin-configurable storage location and labels.

### User Flow

1. Click key asset -> opens leaderboard drawer
2. Fetches game state: config, leaderboard data, personal best, admin status
3. **Users**: See personal best score + leaderboard table (top 100, sorted by highScore desc)
4. **Admins**: Configure publicKey/secret of source app, highScoreLabel, dataObjectType (where data lives), droppedAssetUniqueName

### External Integration

Other SDK apps (games, quizzes) POST to leaderboard endpoints to update/increment scores. The leaderboard only reads and displays.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Fetch leaderboard data + config + admin status |
| POST | `/api/admin-settings` | Update leaderboard config (publicKey, secret, dataObjectType, highScoreLabel) |
| POST | `/api/{type}/increment-player-stats` | Increment a player's score (type = dropped-asset/ecosystem/visitor/world) |
| POST | `/api/{type}/update-player-stats` | Set a player's stats directly |
| POST | `/api/{type}/leaderboard` | Replace entire leaderboard data |

4 component types x 3 operations = 12 data endpoints + game-state + admin-settings = 14 total endpoints.

## Data Structures

### Key Asset Config (data object)
```typescript
{
  config: {
    dataObjectType: "world" | "ecosystem" | "visitor" | "droppedAsset",
    highScoreLabel: "High Score",  // configurable column header
    droppedAssetUniqueName: "",
  },
  publicKey: "",   // public key of source app
  secret: "",      // secret of source app (for JWT)
}
```

### Leaderboard Data (stored on any component type)
```typescript
type LeaderboardType = {
  profiles: {
    [profileId: string]: {
      highScore: number;
      displayName: string;
    };
  };
};
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.create(assetId, urlSlug, {credentials})` | Instantiate a DroppedAsset |
| `Visitor.get(visitorId, urlSlug, {credentials})` | Get visitor (isAdmin) |
| `Visitor.create(visitorId, urlSlug, {credentials})` | Instantiate visitor for writes |
| `Ecosystem.create({credentials})` | Instantiate ecosystem |
| `World.create(urlSlug, {credentials})` | Instantiate world |
| `component.fetchDataObject(publicKey, signedJWT)` | Fetch data with app JWT auth |
| `component.fetchDataObject(undefined, undefined, sharedAppPublicKey, sharedAppJWT)` | Fetch with shared app auth |
| `droppedAsset.setDataObject(data, {lock})` | Initialize/replace data |
| `component.setDataObject(data, {sharedAppPublicKey, sharedAppJWT, lock})` | Replace leaderboard |
| `component.updateDataObject(data, {sharedAppPublicKey, sharedAppJWT, lock})` | Partial update with dot-notation |
| `world.fetchDroppedAssetsBySceneDropId({sceneDropId, uniqueName})` | Find assets by unique name |

**Notable new SDK features**:
- `EcosystemFactory` — cross-world data storage
- JWT-based `fetchDataObject(publicKey, signedJWT)` — reading another app's data
- `sharedAppPublicKey` / `sharedAppJWT` options on write operations
- Dot-notation paths in `updateDataObject` (e.g., `profiles.${profileId}.highScore`)

## Key Patterns

### Polymorphic Increment (works with any component type)
```typescript
export const incrementProfileData = async ({ publicKey, component, profileId, displayName, incrementBy }) => {
  const dataObject = await component.fetchDataObject(undefined, undefined, sharedAppPublicKey, sharedAppJWT);
  const { profiles } = dataObject;
  const options = { sharedAppPublicKey, sharedAppJWT, lock: { lockId, releaseLock: true } };

  if (!profiles) {
    await component.updateDataObject({ profiles: { [profileId]: { displayName, highScore: incrementBy } } }, options);
  } else if (!profiles[profileId]) {
    await component.updateDataObject({ [`profiles.${profileId}`]: { displayName, highScore: incrementBy } }, options);
  } else {
    const newHighScore = (profiles[profileId].highScore || 0) + incrementBy;
    await component.updateDataObject({
      [`profiles.${profileId}.displayName`]: displayName,
      [`profiles.${profileId}.highScore`]: newHighScore,
    }, options);
  }
};
```

### Multi-Type Data Source Resolution
```typescript
if (dataObjectType === "ecosystem") {
  component = await Ecosystem.create({ credentials });
} else if (dataObjectType === "visitor") {
  component = visitor;
} else if (dataObjectType === "world") {
  component = await World.create(urlSlug, { credentials });
} else {
  const droppedAssets = await world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName });
  component = droppedAssets[0];
}
dataObject = await component.fetchDataObject(publicKey, signedJWT);
```

### JWT-Based Cross-App Data Access
```typescript
import jwt from "jsonwebtoken";
const signedJWT = jwt.sign({ publicKey }, secret);
const dataObject = await ecosystem.fetchDataObject(publicKey, signedJWT);
```

### SDK Re-initialization Per Request
```typescript
// setupSDK accepts optional credentials to read OTHER app's data
const { DroppedAsset } = await setupSDK(publicKey, secret);
```

### Dot-Notation Partial Updates
```typescript
await component.updateDataObject({
  [`profiles.${profileId}.displayName`]: displayName,
  [`profiles.${profileId}.highScore`]: newHighScore,
}, options);
```

## RPG Relevance

- **Core scoring/ranking system**: Directly applicable for student leaderboards, item counts, achievements
- **Cross-app data sharing via JWT**: Can share inventory/scores between different RPG modules
- **EcosystemFactory**: Cross-world persistent data — perfect for RPG progression that spans multiple areas
- **Polymorphic component pattern**: Write once, store anywhere (world, ecosystem, visitor, asset)
- **Dot-notation updates**: Efficient partial updates to deeply nested player data
- **profileId-keyed data**: Standard pattern for per-player state

## Weaknesses

- `INTERACTIVE_JWT` env var referenced but never generated/set — likely a bug
- No input validation on `results` body in update-player-stats
- No admin check on write endpoints (any caller with credentials can update scores)
- `getCredentials` return type mismatch on error
- Unused `@googleapis/sheets` dependency
- No tests
- Uses `react-hook-form` (extra dependency vs other apps)
