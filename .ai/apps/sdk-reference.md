# Topia SDK Reference (mc-sdk-js)

**Repo**: [metaversecloud-com/mc-sdk-js](https://github.com/metaversecloud-com/mc-sdk-js)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/mc-sdk-js/`
**Package**: `@rtsdk/topia`
**Docs**: https://metaversecloud-com.github.io/mc-sdk-js/index.html

## SDK Initialization

```typescript
import {
  AssetFactory, DroppedAssetFactory, EcosystemFactory,
  SceneFactory, UserFactory, VisitorFactory, WorldFactory,
  Topia, WorldActivityType, DroppedAssetClickType,
} from "@rtsdk/topia";

const topia = new Topia({
  apiDomain: process.env.INSTANCE_DOMAIN,    // "api.topia.io"
  apiProtocol: process.env.INSTANCE_PROTOCOL, // "https"
  apiKey: process.env.API_KEY,
  interactiveKey: process.env.INTERACTIVE_KEY,
  interactiveSecret: process.env.INTERACTIVE_SECRET,
});

const Asset = new AssetFactory(topia);
const DroppedAsset = new DroppedAssetFactory(topia);
const Ecosystem = new EcosystemFactory(topia);
const Scene = new SceneFactory(topia);
const User = new UserFactory(topia);
const Visitor = new VisitorFactory(topia);
const World = new WorldFactory(topia);
```

## Credentials Type

```typescript
type InteractiveCredentials = {
  apiKey?: string;
  assetId?: string;
  interactiveNonce?: string;
  interactivePublicKey?: string;
  profileId?: string | null;
  urlSlug?: string;
  visitorId?: number;
  iframeId?: string;
  gameEngineId?: string;
};
```

## Analytics Type

```typescript
type AnalyticType = {
  analyticName: string;
  incrementBy?: number;
  profileId?: string;
  uniqueKey?: string;
  urlSlug?: string;
};
```

## Universal Data Object Methods

These 4 methods appear on **DroppedAsset**, **Visitor**, **World**, **User**, and **Ecosystem** with identical signatures:

### fetchDataObject
```typescript
async fetchDataObject(
  appPublicKey?: string,
  appJWT?: string,
  sharedAppPublicKey?: string,
  sharedAppJWT?: string
): Promise<void | ResponseType>
```
Populates `instance.dataObject`.

### setDataObject
```typescript
async setDataObject(
  dataObject: object | null | undefined,
  options?: {
    appPublicKey?: string;
    appJWT?: string;
    sharedAppPublicKey?: string;
    sharedAppJWT?: string;
    analytics?: AnalyticType[];
    lock?: { lockId: string; releaseLock?: boolean };
  }
): Promise<void | ResponseType>
```
**Replaces** entire data object. Use for initialization.

### updateDataObject
```typescript
async updateDataObject(
  dataObject: object,
  options?: {
    appPublicKey?: string;
    appJWT?: string;
    sharedAppPublicKey?: string;
    sharedAppJWT?: string;
    analytics?: AnalyticType[];
    lock?: { lockId: string; releaseLock?: boolean };
  }
): Promise<void | ResponseType>
```
**Partial** update. Supports dot-notation paths: `{ "profiles.abc123.highScore": 100 }`.

### incrementDataObjectValue
```typescript
async incrementDataObjectValue(
  path: string,
  amount: number,
  options?: {
    appPublicKey?: string;
    appJWT?: string;
    sharedAppPublicKey?: string;
    sharedAppJWT?: string;
    analytics?: AnalyticType[];
    lock?: { lockId: string; releaseLock?: boolean };
  }
): Promise<void | ResponseType>
```
Atomic increment at a dot-notation path.

---

## DroppedAsset

### Factory Methods
```typescript
DroppedAsset.create(id: string, urlSlug: string, options?): DroppedAsset
DroppedAsset.get(id: string, urlSlug: string, options?): Promise<DroppedAsset>
DroppedAsset.getWithUniqueName(uniqueName, urlSlug, interactiveSecret, credentials): Promise<DroppedAsset>
DroppedAsset.drop(asset: Asset, options): Promise<DroppedAsset>
```

### Drop Options
```typescript
DroppedAsset.drop(asset, {
  assetScale?: number;
  clickType?: DroppedAssetClickType;       // "none" | "link" | "portal" | "teleport" | "webhook"
  clickableLink?: string;
  clickableLinkTitle?: string;
  clickableDisplayTextDescription?: string;
  clickableDisplayTextHeadline?: string;
  flipped?: boolean;
  interactivePublicKey?: string;
  isInteractive?: boolean;
  isForceLinkInIframe?: boolean;
  isOpenLinkInDrawer?: boolean;
  isTextTopLayer?: boolean;
  layer0?: string;                          // Bottom image URL
  layer1?: string;                          // Top image URL
  position: { x: number; y: number };
  sceneDropId?: string;
  text?: string;
  textColor?: string;
  textFontFamily?: string;
  textSize?: number;
  textWeight?: string;
  textWidth?: number;
  uniqueName?: string;
  urlSlug: string;
  yOrderAdjust?: number;
});
```

### Instance Methods
```typescript
droppedAsset.fetchDroppedAssetById(): Promise<void>
droppedAsset.deleteDroppedAsset(): Promise<void>
droppedAsset.updatePosition(x: number, y: number): Promise<void>
droppedAsset.updateClickType({
  clickType, clickableLink, clickableLinkTitle,
  isOpenLinkInDrawer?, isForceLinkInIframe?
}): Promise<void>
droppedAsset.updateWebImageLayers(bottomLayerURL: string, topLayerURL: string): Promise<void>
droppedAsset.updateCustomTextAsset(style: object, text: string): Promise<void>
droppedAsset.updateBroadcast(options): Promise<void>
droppedAsset.updateMediaType(options): Promise<void>
droppedAsset.updateUploadedMediaSelected(mediaId: string): Promise<void>
droppedAsset.updatePrivateZone(options): Promise<void>
droppedAsset.setClickableLinkMulti(links: DroppedAssetLinkType[]): Promise<void>
droppedAsset.updateClickableLinkMulti(linkId: string, updates): Promise<void>
droppedAsset.removeClickableLink(linkId: string): Promise<void>
// + fetchDataObject, setDataObject, updateDataObject, incrementDataObjectValue
```

### Properties
| Property | Type |
|----------|------|
| `id` | `string` |
| `position` | `{ x: number; y: number }` |
| `uniqueName` | `string?` |
| `dataObject` | `object?` |
| `clickType` | `string?` |
| `clickableLink` | `string?` |
| `isInteractive` | `boolean?` |
| `layer0` | `string?` |
| `layer1` | `string?` |
| `sceneDropId` | `string?` |

### Enums
```typescript
enum DroppedAssetClickType {
  NONE = "none",
  LINK = "link",
  PORTAL = "portal",
  TELEPORT = "teleport",
  WEBHOOK = "webhook",
}
```

---

## Visitor

### Factory Methods
```typescript
Visitor.create(id: number, urlSlug: string, options?): Visitor    // Lightweight, no fetch
Visitor.get(id: number, urlSlug: string, options?): Promise<Visitor>  // Full details
```

### Instance Methods
```typescript
visitor.fetchVisitor(): Promise<void>
visitor.moveVisitor({ shouldTeleportVisitor: boolean; x: number; y: number }): Promise<void>
visitor.fireToast({ groupId?: string; title: string; text?: string }): Promise<void>
visitor.triggerParticle({ name: string; duration: number }): Promise<void>
visitor.grantExpression({ name: string }): Promise<ResponseType>  // 200=new, 409=already owned
visitor.getExpressions({ name?: string; getUnlockablesOnly?: boolean }): Promise<ResponseType>
visitor.openIframe({
  droppedAssetId: string; link: string;
  shouldOpenInDrawer?: boolean; title?: string;
}): Promise<void>
visitor.closeIframe(assetId: string): Promise<void>
visitor.fetchInventoryItems(): Promise<void>          // Populates visitor.inventoryItems
visitor.grantInventoryItem(item: InventoryItemInterface, quantity?: number): Promise<UserInventoryItem>
visitor.modifyInventoryItemQuantity(item: UserInventoryItemInterface, quantity: number): Promise<UserInventoryItem>
visitor.updatePublicKeyAnalytics(analytics: AnalyticType[]): Promise<void>
// + fetchDataObject, setDataObject, updateDataObject, incrementDataObjectValue
```

### Properties
| Property | Type |
|----------|------|
| `visitorId` | `number` |
| `isAdmin` | `boolean` |
| `displayName` | `string` |
| `username` | `string` |
| `profileId` | `string` |
| `moveTo` | `{ x: number; y: number }` |
| `dataObject` | `object?` |
| `inventoryItems` | `UserInventoryItem[]` |

---

## World

### Factory Methods
```typescript
World.create(urlSlug: string, options?): World
World.deleteDroppedAssets(
  urlSlug: string, droppedAssetIds: string[],
  interactiveSecret: string, credentials: InteractiveCredentials
): Promise<{ success: boolean }>
```

### Instance Methods
```typescript
world.fetchDetails(): Promise<void>
world.fetchDroppedAssetsWithUniqueName({
  uniqueName: string; isPartial?: boolean;
}): Promise<DroppedAsset[]>
world.fetchDroppedAssetsBySceneDropId({
  sceneDropId: string; uniqueName?: string;
}): Promise<DroppedAsset[]>
world.fetchScenes(): Promise<void>
world.dropScene({
  allowNonAdmins?: boolean; sceneId: string;
  position: { x: number; y: number }; sceneDropId: string;
}): Promise<void>
world.triggerParticle({
  name: string; duration: number;
  position: { x: number; y: number };
}): Promise<void>
world.triggerActivity({
  type: WorldActivityType; assetId: string;
}): Promise<void>
world.fireToast({ groupId?: string; title: string; text?: string }): Promise<void>
world.fetchWebhooks(): Promise<void>
world.setWebhook(webhook: WebhookInterface): Promise<void>
// + fetchDataObject, setDataObject, updateDataObject, incrementDataObjectValue
```

### Properties
| Property | Type |
|----------|------|
| `urlSlug` | `string` |
| `name` | `string?` |
| `width` | `number?` |
| `height` | `number?` |
| `dataObject` | `object?` |
| `spawnPosition` | `{ x?: number; y?: number }?` |

### Enums
```typescript
enum WorldActivityType {
  GAME_ON = "GAME_ON",
  GAME_WAITING = "GAME_WAITING",
  GAME_HIGH_SCORE = "GAME_HIGH_SCORE",
}
```

---

## User

### Factory Methods
```typescript
User.create(options?: { credentials?: InteractiveCredentials; profileId?: string }): User
```

### Instance Methods
```typescript
user.fetchDataObject(appPublicKey?, appJWT?): Promise<void>
user.setDataObject(dataObject, options?): Promise<void>
user.updateDataObject(dataObject, options?): Promise<void>
user.incrementDataObjectValue(path, amount, options?): Promise<void>
user.fetchInventoryItems(): Promise<void>         // Requires profileId
user.grantInventoryItem(item, quantity?): Promise<UserInventoryItem>
user.modifyInventoryItemQuantity(item, quantity): Promise<UserInventoryItem>
user.fetchAvatars(): Promise<void>
user.uploadAvatar(formData): Promise<void>
user.deleteAvatar(avatarId): Promise<void>
user.fetchAssets(): Promise<void>
user.fetchScenes(): Promise<void>
user.fetchWorldsByKey(): Promise<void>
user.sendEmail({ html, subject, to }): Promise<void>
user.getExpressions({ name?, getUnlockablesOnly? }): Promise<ResponseType>
```

**Key usage**: `User.create({ credentials, profileId })` gives access to another player's data (inventory, data objects) — essential for cross-player interactions like trading.

---

## Ecosystem

### Factory Methods
```typescript
Ecosystem.create(options?: { credentials?: InteractiveCredentials }): Ecosystem
```

### Instance Methods
```typescript
ecosystem.fetchInventoryItems(): Promise<void>   // Populates ecosystem.inventoryItems
// + fetchDataObject, setDataObject, updateDataObject, incrementDataObjectValue
```

**Key usage**: `ecosystem.fetchInventoryItems()` returns all app-defined inventory items (badges, seeds, tools, decorations). Always cache results (24-hour TTL recommended).

---

## Asset

### Factory Methods
```typescript
Asset.create(id: string, options?): Asset
Asset.upload(assetPayload, apiKey): Promise<Asset>
```

**Common usage**: `Asset.create("webImageAsset", { credentials })` for creating image assets to drop.

---

## Scene

### Factory Methods
```typescript
Scene.create(id: string, options?): Scene
Scene.get(id: string, options?): Promise<Scene>
```

### Instance Methods
```typescript
scene.fetchSceneById(): Promise<void>
```

---

## InventoryItem / UserInventoryItem

### Properties
```typescript
// InventoryItem (ecosystem-level definition)
{
  id: string;
  name?: string;
  description?: string;
  type?: string;           // "BADGE", etc.
  metadata?: object | null;
  image_path?: string;
  image_url?: string;
  status?: string;         // "ACTIVE", etc.
}

// UserInventoryItem (player-owned instance)
{
  userItemId: string;
  user_id: string;
  item_id: string;
  quantity: number;
  grant_source: string;
  type: string;
  image_url: string;
  profile_id?: string;
  item: { id, name, description, type, metadata, image_url };
}
```

---

## WorldActivity

### Factory Methods
```typescript
WorldActivity.create(urlSlug: string, options?): WorldActivity
```

### Instance Methods
```typescript
worldActivity.currentVisitors(shouldIncludeAdminPermissions?): Promise<{ [key: string]: Visitor }>
worldActivity.fetchVisitorsInZone({ droppedAssetId?, shouldIncludeAdminPermissions? }): Promise<{ [key: string]: Visitor }>
worldActivity.moveAllVisitors({ shouldFetchVisitors?, shouldTeleportVisitors?, scatterVisitorsBy?, x, y }): Promise<void>
worldActivity.moveVisitors(visitorsToMove: VisitorsToMoveArrayType): Promise<void>
```

---

## Common Patterns Across All Apps

### Time-Bucketed Lock IDs
```typescript
const lockId = `${identifier}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
await component.updateDataObject(data, { lock: { lockId, releaseLock: true } });
```

### Inventory Cache (24-hour TTL with stale fallback)
```typescript
const ecosystem = Ecosystem.create({ credentials });
await ecosystem.fetchInventoryItems();
// Cache ecosystem.inventoryItems for 24 hours
// On failure, return stale cache
```

### Pipe-Delimited Leaderboard Storage
```typescript
// Write
await keyAsset.updateDataObject({ [`leaderboard.${profileId}`]: `${name}|${score}|${time}` });
// Read
const [name, score, time] = data.split("|");
```

### cleanReturnPayload Middleware
```typescript
// Strips: "topia", "credentials", "jwt", "requestOptions" from all responses
```

### Badge Award with Idempotency
```typescript
if (visitorInventory[badgeName]) return; // Already has badge
const items = await getCachedInventoryItems({ credentials });
const badge = items.find(i => i.name === badgeName && i.type === "BADGE");
await visitor.grantInventoryItem(badge, 1);
await visitor.fireToast({ title: "Badge Earned!", text: `You earned "${badgeName}"!` });
```
