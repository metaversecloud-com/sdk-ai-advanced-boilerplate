# SDK Bulletin Board

**Repo**: [metaversecloud-com/sdk-bulletin-board-app](https://github.com/metaversecloud-com/sdk-bulletin-board-app)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-bulletin-board-app/`
**Quality**: Medium-High — well-structured with approval workflow, theming, S3 integration, analytics, but has bugs (text position calculation, cleanReturnPayload middleware ordering), no tests
**SDK Version**: `@rtsdk/topia@^0.15.8` (older)

## What It Does

Community bulletin board where visitors submit messages (text or images) for display in the world. Submissions go through an admin approval workflow. Approved messages are physically placed as dropped assets at "anchor" positions in the world.

### User Flow

1. Click key asset -> opens drawer
2. **Regular users**: See theme title/subtitle/description, submit text (120 char) or image (PNG, 1MB). Up to 3 pending submissions. Can view/delete own pending messages
3. **Admins**: Settings (change theme within group, edit title/subtitle/description, reset/remove scene) + Pending Approval (approve/delete messages)
4. **On approval (message theme)**: Background web image + text asset dropped at random anchor position, particle effect triggered
5. **On approval (image theme)**: Image applied to anchor asset via `updateWebImageLayers`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Theme + admin status |
| POST | `/api/admin/theme` | Change/update theme and scene |
| POST | `/api/admin/reset` | Reset scene (soft or hard) |
| POST | `/api/admin/remove` | Remove entire scene + key asset |
| GET | `/api/admin/messages` | Get all pending messages |
| POST | `/api/admin/message/approve/:messageId` | Approve a message -> drop assets |
| DELETE | `/api/admin/message/:messageId` | Admin deletes a message |
| GET | `/api/messages` | User's pending messages |
| POST | `/api/message` | Submit new message/image |
| DELETE | `/api/message/:messageId` | User deletes own message |

## Data Object (Key Asset)

```typescript
type DataObjectType = {
  anchorAssets: string[];      // dropped asset IDs for placement positions
  messages: MessagesType;      // { [messageId]: MessageType }
  theme: ThemeType;            // { id, description, subtitle, title, type: "message"|"image" }
  themeId?: string;
  usedSpaces: string[];        // which anchors are already used
};

type MessageType = {
  id: string;
  approved: boolean;
  displayName: string;
  imageUrl?: string;
  message?: string;
  userId: string;
  username: string;
};
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.create(assetId, urlSlug, { credentials })` | Get key asset reference |
| `DroppedAsset.get(id, urlSlug, { credentials })` | Fetch specific dropped asset |
| `DroppedAsset.getWithUniqueName(name, urlSlug, secret, credentials)` | Fetch by unique name |
| `DroppedAsset.drop(asset, options)` | Drop background/text assets |
| `droppedAsset.fetchDataObject()` | Fetch data |
| `droppedAsset.setDataObject(data, { lock })` | Initialize |
| `droppedAsset.updateDataObject(data, { lock, analytics })` | Partial update |
| `droppedAsset.updateWebImageLayers(imageUrl, "")` | Apply image to asset |
| `droppedAsset.updateCustomTextAsset({}, text)` | Update text on asset |
| `droppedAsset.deleteDroppedAsset()` | Delete asset |
| `Asset.create(assetId, { credentials })` | Create asset reference for dropping |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Check isAdmin |
| `visitor.closeIframe(assetId)` | Close the drawer |
| `World.create(urlSlug, { credentials })` | World reference |
| `world.fetchDataObject()` | World-level data |
| `world.updateDataObject(data, options)` | Update world data |
| `world.fetchScenes()` | Get all scenes |
| `world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName })` | Find assets in scene |
| `world.fetchDroppedAssetsWithUniqueName({ uniqueName, isPartial })` | Partial name match |
| `world.triggerParticle({ position, name })` | Visual effects |
| `world.dropScene({ allowNonAdmins, sceneId, position, sceneDropId })` | Drop entire scene |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete |

**Notable new SDK methods**: `DroppedAsset.getWithUniqueName`, `droppedAsset.updateWebImageLayers`, `droppedAsset.updateCustomTextAsset`, `droppedAsset.deleteDroppedAsset`, `visitor.closeIframe`, `world.fetchScenes`, `world.dropScene`, `isPartial` option on `fetchDroppedAssetsWithUniqueName`

## Key Patterns

### Anchor Asset Space Management
```typescript
// Find empty anchor, or random existing one if all full
const anchorAssets = await world.fetchDroppedAssetsBySceneDropId({ sceneDropId, uniqueName: "anchor" });
const anchorAssetIds = anchorAssets.map(({ id }) => id).filter(Boolean);
// usedSpaces[] tracks which anchors have content, anchorAssets[] tracks all anchors
```

### Dual Asset Drop (Background + Text)
```typescript
// 1. Drop background image asset
await DroppedAsset.drop(webImageAsset, {
  position: { x: pos.x + imageOffsetX, y: pos.y + imageOffsetY },
  uniqueName: `${sceneDropId}-background-${anchorId}`, ...
});
// 2. Drop text overlay asset
await DroppedAsset.drop(textAsset, {
  position: textPosition, isTextTopLayer: true,
  text: message, textColor: "white", textSize: 16, textWidth: 190,
  uniqueName: `${sceneDropId}-text-${anchorId}`, yOrderAdjust: 1000, ...
});
```

### Data Object Migration (World -> Key Asset)
```typescript
// If key asset has no data but world does, transfer it
if (worldDataObject?.scenes?.[sceneDropId]?.theme) {
  keyAssetPayload = worldDataObject.scenes[sceneDropId];
  // Mark as migrated on world
  worldPayload.scenes[sceneDropId] = `Data transferred to key asset on ${new Date()}`;
}
```

### Optimistic Locking with 409 Conflict
```typescript
const lockId = `${assetId}-${messageId}-${roundedTo10Seconds}`;
try {
  await keyAsset.updateDataObject({}, { lock: { lockId } });
} catch (error) {
  return res.status(409).json({ message: "Currently being modified by another admin." });
}
```

### S3 Image Upload/Delete
```typescript
// Upload: userUploads/${profileId}-${timestamp}.png
// Delete: extract key from URL path
```

### Scene Removal + Replacement
```typescript
// Delete all scene assets except key asset
const ids = droppedAssets.filter(a => a.id !== assetId).map(a => a.id!);
await World.deleteDroppedAssets(urlSlug, ids, secret, credentials);
visitor.closeIframe(assetId);
if (theme?.id) {
  await world.dropScene({ allowNonAdmins: true, sceneId, position, sceneDropId });
}
keyAsset.deleteDroppedAsset();
```

### Error Return Convention (non-throwing)
```typescript
const result = await someUtil(args);
if (result instanceof Error) throw result;
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Social / Collaborative** | Approval workflow for user-submitted content, message/submission system |
| **Creative / Builder** | S3 integration for user-uploaded images, dual asset dropping (image + text) |
| **Education / Learning** | Student content submissions, anchor asset placement at predefined positions |
| **Any game type** | Scene management (swapping environments), data migration pattern |

## Weaknesses

- Bug: text position calculation doesn't actually apply offsets (missing `+=`)
- `cleanReturnPayload` middleware registered after routes (may not intercept)
- No input sanitization on user messages
- No tests
- Mixed Tailwind + SDK CSS
- Hard-coded S3 region (us-east-1)
- Older SDK version (0.15.8)
