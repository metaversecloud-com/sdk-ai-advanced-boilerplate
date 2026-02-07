# SDK Trivia (Boilerplate Clone)

**Repo**: [metaversecloud-com/sdk-trivia](https://github.com/metaversecloud-com/sdk-trivia)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-trivia/`
**Quality**: Low — misleading name, is just the boilerplate template with no trivia logic, no tests, unused code

## What It Actually Is

Despite the name "sdk-trivia", this is NOT a trivia game. It's a generic SDK boilerplate/template identical to the `sdk-ai-boilerplate`. No questions, no scoring, no game mechanics. The README describes features that don't exist in the code.

### What It Does

- Fetches a dropped asset's details when clicked
- Displays asset image and name in a drawer
- Admin can clone (drop) the asset at random nearby offsets
- Admin can remove all cloned assets by unique name
- Fires toast notifications and particle effects
- Posts interaction stats to external leaderboard service

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Fetch asset details + admin status, trigger particles, post leaderboard stats |
| POST | `/api/dropped-asset` | Clone asset at random offset (0-200px) |
| POST | `/api/remove-dropped-assets` | Batch remove clones by uniqueName |
| PUT | `/api/world/fire-toast` | Fire toast notification |

## Data Object

```typescript
interface IDroppedAsset extends DroppedAsset {
  dataObject?: { droppedAssetCount?: number };
}
```

## SDK Methods Used

Same as boilerplate: `DroppedAsset.get`, `droppedAsset.fetchDataObject`, `droppedAsset.setDataObject`, `droppedAsset.incrementDataObjectValue`, `Asset.create`, `DroppedAsset.drop`, `World.create`, `world.triggerParticle`, `world.fireToast`, `world.fetchDroppedAssetsWithUniqueName`, `World.deleteDroppedAssets`, `Visitor.get`

## Reusable Patterns

### Asset Clone with Random Offset
```typescript
const xOffset = Math.floor(Math.random() * 200);
const yOffset = Math.floor(Math.random() * 200);
await DroppedAsset.drop(asset, {
  isInteractive: true, interactivePublicKey,
  position: { x: droppedAsset.position.x + xOffset, y: droppedAsset.position.y + yOffset },
  uniqueName: `${sceneDropId}-clone`, urlSlug,
});
```

### Batch Delete by Unique Name
```typescript
const droppedAssets = await world.fetchDroppedAssetsWithUniqueName({ uniqueName: `${sceneDropId}-clone` });
const ids = Object.values(droppedAssets).map(a => a.id).filter(Boolean);
await World.deleteDroppedAssets(urlSlug, ids, process.env.INTERACTIVE_SECRET!, credentials);
```

## Weaknesses

- Name says "trivia" but it's just the boilerplate
- README describes nonexistent features
- Unused `addNewRowToGoogleSheets.ts` and `@googleapis/sheets` dependency
- Unused `UserFactory`
- No tests
- `@rtsdk/topia` at older ^0.17.3
