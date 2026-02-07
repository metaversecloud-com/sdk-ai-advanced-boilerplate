# SDK CMS

**Repo**: [metaversecloud-com/sdk-cms](https://github.com/metaversecloud-com/sdk-cms)
**SDK Version**: `@rtsdk/topia@^0.17.4`
**Quality**: Medium — functional content management with asset search and link previews, but no input validation, coarse locking, and no error recovery
**Last Analyzed**: 2026-02-07

## What It Does

A content management system for organizing assets within a Topia world. Users can search for assets in the world, organize them into named lists, attach metadata and clickable links, preview link content, and teleport to asset locations. Designed for curating galleries, resource hubs, or educational content within a world.

### User Flow

1. Search for assets in the world (live search or browse cached list)
2. Add assets to named lists for organization
3. Attach metadata: description, tags, clickable link URL
4. Preview links with auto-fetched title/description/image
5. Click to teleport visitor to any asset's location in the world

## Architecture

```
src/
├── controllers/
│   ├── handleSearchAssets.ts       Search world assets by name
│   ├── handleGetList.ts            Get assets in a named list
│   ├── handleAddToList.ts          Add asset to a list
│   ├── handleRemoveFromList.ts     Remove asset from a list
│   ├── handleUpdateMetadata.ts     Set description, tags, link on asset
│   ├── handleGetLinkPreview.ts     Fetch link preview metadata
│   ├── handleTeleportToAsset.ts    Move visitor to asset location
│   ├── handleGetGameState.ts       Full CMS state for UI hydration
│   └── handleGetAllLists.ts        All list names and counts
├── utils/
│   ├── topiaInit.ts                SDK factory exports
│   └── linkPreview.ts              link-preview-js wrapper with fallbacks
└── routes.ts                       9 endpoints
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Full CMS state: lists, assets, metadata |
| GET | `/api/search` | Search world assets by name query |
| GET | `/api/lists` | All list names and asset counts |
| GET | `/api/list/:name` | Assets in a specific list |
| POST | `/api/list/:name/add` | Add asset to list |
| POST | `/api/list/:name/remove` | Remove asset from list |
| POST | `/api/metadata` | Update asset metadata (description, tags, link) |
| GET | `/api/link-preview` | Fetch link preview for a URL |
| POST | `/api/teleport` | Teleport visitor to asset location |

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `World.create(urlSlug, { credentials })` | World instance for all operations |
| `world.fetchDroppedAssetsWithUniqueName(query)` | Search assets by partial name match |
| `world.updateDataObject(data, { lock })` | Store lists, metadata, CMS config |
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch individual asset details |
| `droppedAsset.setClickableLinkMulti(links)` | Set clickable link URL on asset |
| `visitor.moveVisitor({ x, y })` | Teleport visitor to asset location |

## Key Patterns

### 1. Link Preview Batch Fetching with Graceful Fallback (UNIQUE)

Fetches Open Graph / meta tag previews for attached links using link-preview-js, with multiple fallback layers:

```ts
import { getLinkPreview } from "link-preview-js";

async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const preview = await getLinkPreview(url, {
      timeout: 5000,
      headers: { "user-agent": "Googlebot" },  // Better OG tag support
      followRedirects: "follow",
    });

    return {
      title: preview.title || url,
      description: preview.description || "",
      image: preview.images?.[0] || preview.favicons?.[0] || "",
      url: preview.url,
    };
  } catch {
    // Graceful fallback: return URL-derived metadata
    return {
      title: new URL(url).hostname,
      description: "",
      image: "",
      url,
    };
  }
}
```

### 2. Dual Asset Search Strategies

Combines live SDK search with a cached asset list for different use cases:

```ts
// Strategy 1: Live search via SDK (real-time, slower)
const results = await world.fetchDroppedAssetsWithUniqueName(query);

// Strategy 2: Cached list from world data object (fast, may be stale)
await world.fetchDataObject();
const cachedAssets = world.dataObject?.assetCache || [];
const filtered = cachedAssets.filter(a =>
  a.name.toLowerCase().includes(query.toLowerCase())
);
```

Live search is used for the search bar; cached list is used for browsing and list management where freshness is less critical.

### 3. Time-Bucketed Locking (60-Second Windows)

Uses 60-second time windows for lock IDs when updating CMS data, trading off concurrency safety for simplicity:

```ts
const lockId = `cms-${Math.floor(Date.now() / 60000)}`;
await world.updateDataObject(
  { [`lists.${listName}`]: updatedList },
  { lock: { lockId, releaseLock: true } }
);
```

The 60-second granularity means two editors within the same minute share a lock, which serializes their writes but can cause unnecessary contention.

### 4. Visitor Teleport to Asset Location

Uses the asset's world position to teleport a visitor directly to it:

```ts
const asset = await DroppedAsset.get(assetId, urlSlug, { credentials });
await asset.fetchDroppedAssetById();

const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
await visitor.moveVisitor({
  x: asset.position.x,
  y: asset.position.y,
});
```

### 5. Clickable Link Assignment via setClickableLinkMulti

Attaches clickable URLs to assets so visitors can click to open external content:

```ts
await droppedAsset.setClickableLinkMulti([
  {
    link: metadata.url,
    type: "link",
    title: metadata.title || "Open Link",
  },
]);
```

## Data Structure

```ts
// World data object — CMS state
type CMSData = {
  lists: {
    [listName: string]: {
      assets: string[];           // Array of asset IDs
      createdAt: string;
      createdBy: string;          // visitorId
    };
  };
  metadata: {
    [assetId: string]: {
      description: string;
      tags: string[];
      link?: string;
      linkPreview?: {
        title: string;
        description: string;
        image: string;
      };
    };
  };
  assetCache?: {                  // Periodically refreshed
    id: string;
    name: string;
    position: { x: number; y: number };
  }[];
};
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Portfolio / Gallery** | Asset search, list organization, metadata attachment, link previews |
| **Resource Hub** | Clickable links on assets, teleport-to-asset navigation, tagged content |
| **Educational CMS** | Curated lists, descriptive metadata, external link integration |
| **Social / Collaborative** | Multi-editor list management with locking, visitor teleportation |
| **Any game type** | Link preview fetching, dual search strategy (live vs cached), asset metadata pattern |

## Weaknesses

- No input validation on list names, metadata, or URLs (XSS risk in link previews)
- 60-second lock granularity is too coarse (unnecessary contention for concurrent editors)
- No error recovery — failed writes leave partial state with no rollback
- No pagination on search results or list contents
- Asset cache has no TTL or refresh mechanism (goes stale indefinitely)
- No permission model beyond admin check (any visitor can edit lists and metadata)

## Unique Examples Worth Extracting

1. **Link Preview Fetching with Fallback** — link-preview-js integration with graceful degradation. Novel pattern for any feature that embeds external content.
2. **Dual Search Strategy** — Live SDK search vs cached list for different freshness/speed tradeoffs. Reusable for any asset discovery feature.
3. **Teleport-to-Asset Navigation** — Using asset position to move visitors. Simple but useful pattern for any navigational or wayfinding feature.
4. **Asset Metadata Registry** — World-level data object storing per-asset descriptions, tags, and link previews. Reusable for any content annotation system.
