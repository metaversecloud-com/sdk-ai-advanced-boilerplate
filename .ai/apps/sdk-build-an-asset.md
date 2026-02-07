# SDK Build an Asset

**Repo**: [metaversecloud-com/sdk-build-an-asset](https://github.com/metaversecloud-com/sdk-build-an-asset)
**SDK Version**: `@rtsdk/topia@^0.18.3`
**Quality**: Medium — creative asset builder with server-side image composition pipeline, but no tests, unbounded S3 growth, and hardcoded theme config
**Last Analyzed**: 2026-02-07

## What It Does

An asset customization builder that lets visitors select image layers (top layer + bottom layer) from themed categories, composites them server-side using JIMP, uploads the result to S3, and claims the built asset in the world. Supports world-scoped ownership tracking so each visitor can have one active built asset. Admins can clear all built assets.

### User Flow

1. Open builder UI -> browse themed categories (e.g., hats, bodies, accessories)
2. Select one option per category (min/max validation, some categories have variations)
3. Preview composited layers in real time
4. "Claim" the asset -> server composites via JIMP, uploads to S3, drops in world
5. Previously claimed asset is removed, new one takes its place
6. Admin panel to clear all claimed assets

## Architecture

```
src/
├── controllers/
│   ├── handleGetTheme.ts           Return theme config + categories
│   ├── handleGetSelections.ts      Current visitor selections
│   ├── handleUpdateSelection.ts    Save category selection
│   ├── handlePreview.ts            Generate preview composite
│   ├── handleClaim.ts              Final composite + S3 upload + drop asset
│   ├── handleUnclaim.ts            Remove visitor's claimed asset
│   ├── handleAdminClear.ts         Admin: remove all claimed assets
│   └── handleGetGameState.ts       Full state for UI hydration
├── utils/
│   ├── topiaInit.ts                SDK factory exports
│   ├── imageComposite.ts           JIMP composition pipeline
│   └── s3Upload.ts                 S3 upload with URL caching
└── routes.ts                       8 endpoints
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Full state: theme, selections, claimed status |
| GET | `/api/theme` | Theme config with categories and options |
| GET | `/api/selections` | Current visitor's layer selections |
| POST | `/api/selection` | Update a category selection |
| POST | `/api/preview` | Generate preview image from selections |
| POST | `/api/claim` | Composite, upload to S3, drop asset in world |
| POST | `/api/unclaim` | Remove visitor's claimed asset |
| POST | `/api/admin/clear` | Admin: remove all claimed assets |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `World.create(urlSlug, { credentials })` | World instance for data + asset ops |
| `world.updateDataObject(data, { lock })` | Store ownership registry (visitor -> asset mapping) |
| `world.triggerParticle({ name, duration })` | Celebration on claim |
| `DroppedAsset.drop(asset, options)` | Drop composited asset into world |
| `droppedAsset.updateWebImageLayers(layers)` | Set composited image on asset |
| `droppedAsset.updateClickType(clickType)` | Configure click behavior |
| `droppedAsset.deleteDroppedAsset()` | Remove previously claimed asset |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Identify visitor, admin check |
| `visitor.fireToast({ groupId, title, text })` | Feedback on claim/unclaim |
| `Asset.create(assetId, { credentials })` | Reference asset before dropping |

## Key Patterns

### 1. JIMP Image Composition Pipeline (UNIQUE)

Server-side image compositing using JIMP to merge multiple selected layers into a single asset image:

```ts
import Jimp from "jimp";

async function compositeImage(selections: LayerSelection[]): Promise<Buffer> {
  const baseImage = await Jimp.read(selections[0].url);  // Bottom layer

  for (const layer of selections.slice(1)) {
    const overlay = await Jimp.read(layer.url);
    baseImage.composite(overlay, 0, 0, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1,
    });
  }

  return await baseImage.getBufferAsync(Jimp.MIME_PNG);
}
```

### 2. World-Scoped Ownership Tracking via Nested Data Objects

Tracks which visitor owns which dropped asset at the world level, enabling one-asset-per-visitor enforcement:

```ts
// World data object structure:
// { claimedAssets: { [visitorId]: { assetId, claimedAt, selections } } }

await world.updateDataObject(
  { [`claimedAssets.${visitorId}`]: { assetId: newAsset.id, claimedAt: new Date(), selections } },
  { lock: { lockId: `claim-${visitorId}`, releaseLock: true } }
);

// On re-claim: remove old asset first
if (existingClaim) {
  const oldAsset = DroppedAsset.get(existingClaim.assetId, urlSlug, { credentials });
  await oldAsset.deleteDroppedAsset();
}
```

### 3. Theme-Driven UI Configuration

Categories, options, variations, and validation rules are defined in a theme config object that drives the entire UI:

```ts
type ThemeConfig = {
  name: string;
  categories: {
    id: string;
    label: string;
    minSelections: number;
    maxSelections: number;
    options: {
      id: string;
      label: string;
      imageUrl: string;
      layer: "top" | "bottom";
      variations?: { id: string; label: string; imageUrl: string }[];
    }[];
  }[];
};
```

### 4. Dual-Layer Image System (Top + Bottom)

Each selection specifies which layer it occupies, enabling z-order control in the composition:

```ts
const sortedSelections = selections.sort((a, b) => {
  const layerOrder = { bottom: 0, top: 1 };
  return layerOrder[a.layer] - layerOrder[b.layer];
});

const composite = await compositeImage(sortedSelections);
```

### 5. S3 URL Caching with Dev Placeholder

Caches uploaded S3 URLs to avoid re-uploading identical composites. Falls back to a placeholder in development:

```ts
const cacheKey = selections.map(s => s.id).sort().join("-");

if (urlCache.has(cacheKey)) {
  return urlCache.get(cacheKey);
}

const url = process.env.S3_BUCKET
  ? await uploadToS3(buffer, `${cacheKey}.png`)
  : "https://placeholder.dev/composited.png";

urlCache.set(cacheKey, url);
return url;
```

## Data Structure

```ts
// World data object — ownership registry
type WorldData = {
  claimedAssets: {
    [visitorId: string]: {
      assetId: string;
      claimedAt: string;
      selections: { categoryId: string; optionId: string; variationId?: string }[];
    };
  };
};

// Dropped asset data object — individual asset metadata
type AssetData = {
  createdBy: string;         // visitorId
  createdAt: string;
  theme: string;
  selections: LayerSelection[];
  compositeUrl: string;      // S3 URL of final image
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Creative / Builder** | JIMP composition pipeline, theme-driven categories, layer-based building |
| **Avatar Creator** | Dual-layer image system, category selection with variations, preview + claim flow |
| **Customization / Cosmetics** | World-scoped ownership tracking, one-per-visitor enforcement, S3 image upload |
| **Portfolio / Gallery** | Asset dropping with metadata, admin bulk clear, visitor attribution |
| **Any game type** | S3 upload caching, theme config pattern, JIMP server-side image processing |

## Weaknesses

- No test coverage
- Unbounded S3 growth — old composite images are never cleaned up when assets are unclaimed
- No image size limits on JIMP composition (large images could cause memory issues)
- Theme config is hardcoded in the client (not fetched from a central config)
- No rate limiting on claim/preview endpoints (JIMP composition is CPU-intensive)
- Category validation only enforced client-side (server trusts selection payload)

## Unique Examples Worth Extracting

1. **JIMP Image Composition Pipeline** — Server-side multi-layer image compositing with S3 upload. Novel pattern not in existing examples, reusable for any asset customization feature.
2. **World-Scoped Ownership Registry** — Nested data object tracking visitor-to-asset mappings at the world level. Useful for any one-per-visitor item system.
3. **Theme-Driven UI Configuration** — Declarative category/option/variation config driving the entire builder UI. Reusable for any customization or selection-based feature.
4. **S3 Upload with Cache** — Deduplication of identical composites via cache key. Reusable for any server-generated asset pipeline.
