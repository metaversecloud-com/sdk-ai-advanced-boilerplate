# Virtual Pet

**Repo**: [metaversecloud-com/virtual-pet](https://github.com/metaversecloud-com/virtual-pet)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/virtual-pet/`
**Quality**: High — most game-like app, rich mechanics, clean architecture, but has cooldown calculation bug, no tests
**SDK Version**: `@rtsdk/topia@^0.15.9`

## What It Does

Tamagotchi-style virtual pet game. Users adopt a pet (dragon/penguin/unicorn), care for it through actions (feed/sleep/play/train), earn XP, level up (31 levels), and watch it evolve through life stages (baby -> teen -> adult). Pets spawn as interactive assets in the world visible to all visitors.

### Game Mechanics

- **Pet Types**: Dragon, Penguin, Unicorn
- **Life Stages**: Baby (levels 1-4), Teen (levels 5-9), Adult (levels 10+)
- **Actions**: Feed (20 XP/1hr), Sleep (15 XP/45min), Play (5 XP/15min), Train (10 XP/30min)
- **31 Levels**: 100 XP -> 49,600 XP escalating thresholds
- **Color Customization**: 4 colors unlocked at levels 2-4
- **Emote Rewards**: Pet-specific expression granted at level 5
- **Pet Trading**: Trade in current pet and start over

### User Flow

1. Click kennel key asset -> opens drawer
2. No pet? -> `CreatePet` screen: pick type + name from predefined list
3. Has pet? -> `VirtualPet` screen: pet image, name, actions, XP bar
4. "Call Pet" spawns pet in world near avatar as interactive dropped asset
5. Perform actions with cooldowns to earn XP -> level up -> evolve
6. Clicking someone else's spawned pet shows read-only view

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/key-asset` | Find kennel key asset by uniqueName |
| GET | `/api/game-state` | Visitor's pet status + isPetInWorld |
| GET | `/api/pet` | Get pet data for a spawned pet asset (owner or viewer) |
| POST | `/api/create-pet` | Create new pet for visitor |
| POST | `/api/update-pet` | Update name/color, re-drop with new image |
| POST | `/api/execute-action` | Perform action (feed/sleep/play/train) with cooldown |
| POST | `/api/spawn-pet` | Spawn pet into world near avatar |
| POST | `/api/pickup-pet` | Remove pet from world |
| POST | `/api/trade-pet` | Reset pet data (trade in) |
| POST | `/api/remove-dropped-assets` | Admin: remove ALL pets from world |

## Data Structures

### Visitor Data Object (pet state stored on visitor)
```typescript
type PetStatusType = {
  username: string;
  experience: number;
  currentLevel: number;
  experienceNeededForNextLevel: number;
  experienceNeededForTheLevelYouCurrentlyAchieved: number;
  petAge: "baby" | "teen" | "adult";
  petType: "dragon" | "penguin" | "unicorn";
  name: string;
  color: number;              // 0-3
  isPetInWorld: boolean;
  feed: { timestamp?: number };
  sleep: { timestamp?: number };
  play: { timestamp?: number };
  train: { timestamp?: number };
  petSpawnedDroppedAssetId?: string;
};
// Stored at: visitor.dataObject.pet
```

### Spawned Pet Dropped Asset Data Object
```typescript
{ profileId?: string }  // owner's profileId for ownership check
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `Visitor.create(visitorId, urlSlug, { credentials })` | Create visitor instance |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Get visitor with data |
| `visitor.fetchDataObject()` | Fetch pet data |
| `visitor.setDataObject(data, { analytics })` | Set complete pet data (create/trade) |
| `visitor.updateDataObject(data, { analytics })` | Partial update (actions, level up) |
| `visitor.triggerParticle({ name, duration })` | Effects on visitor avatar |
| `visitor.grantExpression({ name })` | Grant emote/expression to visitor |
| `visitor.fireToast({ groupId, title, text })` | Toast notification |
| `World.create(urlSlug, { credentials })` | World instance |
| `world.fetchDroppedAssetsWithUniqueName({ uniqueName, isPartial })` | Find pets by name pattern |
| `world.updateDataObject(data, { analytics })` | World-level tracking |
| `world.triggerParticle({ name, duration, position })` | Effects at position |
| `World.deleteDroppedAssets(urlSlug, ids, secret, credentials)` | Bulk delete pets |
| `Asset.create(assetId, { credentials })` | Create asset for dropping |
| `DroppedAsset.drop(asset, options)` | Spawn pet in world |
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Get spawned pet asset |
| `droppedAsset.updateDataObject(data)` | Set ownership profileId |
| `User.create({ credentials, profileId })` | Access other user's data |
| `user.fetchDataObject()` | Read other user's pet for viewer mode |

**Notable new SDK methods**: `visitor.triggerParticle`, `visitor.grantExpression`, `visitor.fireToast`, `User.create({ profileId })`, `user.fetchDataObject()`, `DroppedAssetClickType.LINK`, `isOpenLinkInDrawer`

## Key Patterns

### Drop Interactive Asset with Click-Through to App
```typescript
const petAsset = await DroppedAsset.drop(asset, {
  position: { x: visitor.moveTo.x + 100, y: visitor.moveTo.y },
  uniqueName: `petSystem-${username}`,
  urlSlug,
  flipped: Math.random() < 0.5,
  isInteractive: true,
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  layer1: `${s3URL}/assets/${petType}/world/${petAge}-color-${color}.png`,
  clickType: DroppedAssetClickType.LINK,
  clickableLink: `${BASE_URL}/asset-type/spawned`,
  clickableLinkTitle: "Virtual Pet",
  isOpenLinkInDrawer: true,
});
await petAsset.updateDataObject({ profileId });
```

### Owner vs Non-Owner Detection
```typescript
const ownerProfileId = droppedAsset?.dataObject?.profileId;
if (!ownerProfileId || ownerProfileId === profileId) {
  // Owner view: full controls
} else {
  // Viewer: fetch owner's User data for read-only view
  const user = User.create({ credentials, profileId: ownerProfileId });
  await user.fetchDataObject();
}
```

### XP + Level Up System
```typescript
const getLevelAndAge = (experience: number) => {
  let currentLevel = 0;
  for (const [lvl, threshold] of Object.entries(levels)) {
    if (experience >= threshold) currentLevel = Number(lvl);
  }
  const petAge = currentLevel < 5 ? "baby" : currentLevel < 10 ? "teen" : "adult";
  return { currentLevel, petAge, experienceNeededForNextLevel, ... };
};
```

### Action Cooldown Enforcement (Server)
```typescript
const timeSinceLastAction = Date.now() - actionObj.timestamp;
if (timeSinceLastAction < cooldown) {
  return res.status(403).json({ message: "Action on cooldown" });
}
// Update timestamp + add XP
await visitor.updateDataObject({
  [`pet.${action.toLowerCase()}.timestamp`]: Date.now(),
  [`pet.experience`]: newExperience,
}, { analytics });
```

### Remove and Re-Drop on Visual Change
```typescript
// When pet levels up or changes color
await removeDroppedAssets(credentials, `petSystem-${username}`);
await dropAsset({ credentials, petStatus: updatedPet, visitor, host });
```

### Key Asset Resolution by Unique Name
```typescript
const world = World.create(urlSlug, { credentials });
const assets = await world.fetchDroppedAssetsWithUniqueName({ uniqueName: "virtualPetKeyAsset" });
const keyAssetId = assets[0].id;
```

### Dual-Context Routing (Key Asset vs Spawned Asset)
```typescript
// Route "/" -> opened from kennel -> GET /api/game-state
// Route "/asset-type/spawned" -> opened from spawned pet -> GET /api/pet
// Spawned pet context first resolves key asset, then checks ownership
```

### Particle Effects per Action
```typescript
const ACTION_PARTICLES = {
  SLEEP: "sleep_float", PLAY: "guitar_float",
  FEED: "redHeart_float", TRAIN: "pawPrint_float",
};
// Level up: "medal_float" on visitor
// Expression grant: "whiteStar_burst" on visitor
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Simulation / Virtual Pet** | XP/leveling, action cooldowns, life stages/evolution, persistent player state |
| **Collection / Scavenger Hunt** | Asset spawning near player, item collection, expression/emote rewards |
| **Social / Collaborative** | Owner vs viewer pattern (view another player's items), trading mechanics |
| **Education / Learning** | XP progression with escalating thresholds, milestone-based unlocks |
| **Creative / Builder** | S3-based dynamic images, dual-context routing (hub vs collectible) |

## Weaknesses

- Cooldown calculation bug in `performAction.ts` (`now - cooldown` instead of `now - timestamp`)
- Duplicate level constants in two files with different indexing
- No input validation on pet names/types from client
- No tests
- Some inline styles (ExperienceBar, EditPet)
- Trade analytics mislabeled as "trades" in pickup handler
