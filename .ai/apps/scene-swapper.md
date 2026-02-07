# Scene Swapper

**Repo**: [metaversecloud-com/scene-swapper](https://github.com/metaversecloud-com/scene-swapper)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/scene-swapper/`
**Quality**: Medium — clean architecture but missing tests, client-side-only cooldown, mixed Tailwind/SDK CSS

## What It Does

Allows users to swap the visual scene (background + dropped assets) of a Topia world by clicking a key asset. Admins configure available scenes and control non-admin access. Supports both webhook-driven auto-cycling (clicking key asset directly) and UI-driven manual selection (picking from a list in the sidebar panel).

### User Flow

1. User clicks key asset in Topia world -> opens iframe
2. Client fetches `/api/game-state` -> returns available scenes, current scene, admin status
3. **Admin / allowed non-admin**: See scene cards with previews, select + "Update Scene" to swap. Admins can toggle non-admin access and clear current scene
4. **Non-admin (not allowed)**: See a random fun fact instead
5. Webhook endpoint (`POST /api/swap`) auto-cycles to next scene when key asset clicked directly
6. 30-minute cooldown for non-admins (client-side only)

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Fetch scenes, admin status, config |
| POST | `/api/replace-scene` | Replace current scene with selected one |
| POST | `/api/remove-scene` | Remove all dropped assets (except persistent) |
| POST | `/api/allow-non-admins` | Toggle non-admin scene access |
| POST | `/api/swap` | Webhook: auto-cycle to next scene |

## Data Object (Key Asset)

```typescript
type DataObjectType = {
  allowNonAdmins: boolean;
  currentSceneIndex: number;
  droppableSceneIds: string[];
  lastSwappedDate: Date;
  persistentDroppedAssets: string[];  // uniqueNames to preserve during swap
  positionOffset: { x: number; y: number };
  title: string;
  description: string;
};
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch key asset |
| `droppedAsset.updateDataObject(data, options)` | Update scene index, config |
| `Scene.get(sceneId, { credentials })` | Fetch scene metadata |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Check admin status |
| `visitor.updatePublicKeyAnalytics(analytics[])` | Track analytics |
| `World.create(urlSlug, { credentials })` | Create world instance |
| `world.fetchDroppedAssetsBySceneDropId({ sceneDropId })` | Get all scene assets |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete assets |
| `world.dropScene({ allowNonAdmins, position, sceneDropId, sceneId })` | Drop new scene |

**Notable**: Uses `SceneFactory` — not seen in the boilerplate. Also uses `world.dropScene()` and `World.deleteDroppedAssets()` static method.

## Key Patterns

### Scene Swap with Index Cycling
```typescript
const newSceneIndex = selectedSceneId
  ? droppableSceneIds.indexOf(selectedSceneId)
  : droppableSceneIds.length > currentSceneIndex + 1
    ? currentSceneIndex + 1
    : 0;
```

### Persistent Assets During Removal
Assets with `uniqueName` matching `persistentDroppedAssets` array are preserved:
```typescript
if (!persistentDroppedAssets || !droppedAsset.uniqueName ||
    (droppedAsset.uniqueName && !persistentDroppedAssets.includes(droppedAsset.uniqueName))) {
  droppedAssetIds.push(droppedAsset.id);
}
```

### Remove-Then-Drop Sequential/Parallel
```typescript
await removeScene(credentials, persistentDroppedAssets);
await Promise.all([
  world.dropScene({ position, sceneDropId, sceneId }),
  droppedAsset.updateDataObject({ currentSceneIndex: newSceneIndex }, { lock, analytics }),
]);
```

### Position Offset for Scene Placement
```typescript
position: {
  x: droppedAsset.position.x + positionOffset.x,
  y: droppedAsset.position.y + positionOffset.y,
}
```

### Batch Scene Fetch with Promise.allSettled
```typescript
const results = await Promise.allSettled(
  droppableSceneIds.map((sceneId) => Scene.get(sceneId, { credentials }))
);
const scenes = results
  .filter((r) => r.status === "fulfilled")
  .map((r) => r.value as SceneType);
```

### Webhook vs UI Credential Source
- UI endpoints: credentials from `req.query`
- Webhook endpoint: credentials from `req.body`

### Contextual Analytics
```typescript
analyticName: `${allowNonAdmins ? "allowNonAdmins" : "adminsOnly"}-${isAdmin ? "admin" : "nonAdmin"}-updates`
```

## Weaknesses

- 30-min cooldown is client-side only — server doesn't enforce
- No data object initialization (requires pre-configured key asset)
- No tests
- Mixed Tailwind + SDK CSS classes
- Unused `@googleapis/sheets` dependency
- README references wrong app ("Bulletin Board")
