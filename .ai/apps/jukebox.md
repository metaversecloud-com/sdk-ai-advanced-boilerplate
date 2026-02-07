# Jukebox

**Repo**: `metaversecloud-com/jukebox`
**SDK Version**: `@rtsdk/topia@^0.15.8`
**Quality**: Medium — sophisticated real-time media sync, Redis pub-sub for live updates, but missing tests, incomplete client
**Last Analyzed**: 2026-02-07

## What It Does

A collaborative jukebox app that streams YouTube videos/audio in a shared world location. Admins curate a video catalog; any visitor can queue videos from the catalog. Real-time synchronization via Redis pub-sub ensures all clients see queue changes, nowPlaying status, and catalog edits instantly. Video validation checks YouTube availability before queueing.

## Architecture

```
server/
├── controllers/
│   └── media/
│       ├── AddMedia.ts          Add to catalog (admin) or queue (all)
│       ├── GetJukeboxDataObject.ts  Fetch catalog/queue/nowPlaying
│       ├── NextSong.ts          Skip to next queued video
│       └── RemoveMedia.ts       Remove from catalog/queue
├── external/
│   └── google.ts               YouTube API client init
├── middleware/
│   └── isAdmin.ts              Express middleware for admin-only routes
├── redis-sse/
│   └── index.ts                Redis pub-sub + SSE connection management
├── utils/
│   ├── cleanReturnPayload.ts   Strip SDK metadata from responses
│   ├── topiaInit.ts            SDK factory initialization
│   └── youtube/
│       └── index.ts            YouTube search, duration parse, availability check
└── routes.ts                   9 endpoints
```

## SDK Methods Used

| Method | Purpose |
|--------|---------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | Fetch jukebox asset with data |
| `droppedAsset.fetchDataObject()` | Load catalog/queue/nowPlaying |
| `droppedAsset.setDataObject(data, { lock })` | Initialize on first fetch |
| `droppedAsset.updateDataObject(data, { analytics, lock })` | Add/remove media, emit analytics |
| `droppedAsset.updateMediaType({ mediaLink, isVideo, mediaName, mediaType, audioSliderVolume, audioRadius, syncUserMedia })` | Set active media playback |
| `Visitor.get(visitorId, urlSlug, { credentials })` | Get visitor for admin check |
| `World.create(urlSlug, { credentials })` | World instance for particles |
| `world.triggerParticle({ name, duration, position })` | musicNote_float on add |

## Key Patterns

### 1. Media Streaming via updateMediaType (UNIQUE)

The only production app using `droppedAsset.updateMediaType()` for streaming media:

```ts
await jukeboxAsset.updateMediaType({
  mediaLink: `https://www.youtube.com/watch?v=${videoId}`,
  isVideo: process.env.AUDIO_ONLY !== "true",
  mediaName: video.snippet.title,
  mediaType: "link",
  audioSliderVolume: 0.5,
  audioRadius: 5,
  syncUserMedia: true, // All visitors play from same timestamp
});
```

### 2. Redis Pub-Sub + SSE for Real-Time Sync

Maintains in-memory connection list with heartbeat timestamps. Publishes media actions to channel `${INTERACTIVE_KEY}_JUKEBOX`. Filters broadcasts so originators don't receive their own events:

```ts
shouldSendEvent(data, assetId, visitorId, interactiveNonce) {
  return data.assetId === assetId &&
    (data.visitorId === undefined || data.visitorId !== visitorId) &&
    (data.interactiveNonce === undefined || data.interactiveNonce !== interactiveNonce);
}
```

### 3. Express Admin Middleware

Reusable middleware pattern (not inline guard):

```ts
async function isAdmin(req: Request, res: Response, next: NextFunction) {
  const credentials = getCredentials(req.query);
  const visitor = await getVisitor(credentials);
  if (!visitor.isAdmin) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// Applied to routes:
router.post("/api/search", isAdmin, handleSearch);
router.post("/api/remove-media", isAdmin, handleRemoveMedia);
```

### 4. YouTube API Integration with Chunked Validation

Validates catalog videos still exist on YouTube using batched requests (max 50 per API call):

```ts
async function getAvailableVideos(catalog) {
  const allVideoIds = catalog.map(v => v.id.videoId);
  const chunks = chunkArray(allVideoIds, 50);
  const results = await Promise.all(chunks.map(checkYouTubeLinksExist));
  return results.flat();
}
```

### 5. ISO 8601 Duration Parsing

Converts YouTube's ISO 8601 duration format to milliseconds:

```ts
const YTDurationToMilliseconds = (duration: string): number => {
  const regex = /^P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?$/;
  // Parse groups into ms...
};
```

### 6. Response Payload Cleaning Middleware

Strips SDK internal fields from all responses:

```ts
app.use(function (req, res, next) {
  const ogSend = res.send;
  res.send = function (data) {
    const cleanData = cleanReturnPayload(data, "topia");
    res.send = ogSend;
    return res.send(cleanData);
  };
  next();
});
```

## Data Structure

```ts
// Jukebox dropped asset data object
{
  catalog: Video[];           // Full metadata from YouTube API
  queue: string[];            // videoIds referencing catalog entries
  nowPlaying: "-1" | string;  // "-1" = nothing playing, else videoId
}
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Audio/Video Streaming** | Media sync via updateMediaType, Redis pub-sub, heartbeat/SSE management |
| **Social / Collaborative** | Shared queue, admin curation, real-time sync without iframe refresh |
| **Education / Learning** | Video playlist system, duration tracking for analytics |
| **Any game type** | Admin middleware pattern, response cleaning, time-bucketed locking |

## Weaknesses

- No test coverage
- Incomplete client implementation (server only is complete)
- No retry logic if YouTube API quota exhausted
- Race condition on first queue add (no atomic check-and-set)
- SSE connections stored in-memory (potential memory leak with many connections)
- `he` package imported but never used

## Unique Examples Worth Extracting

1. **Redis Pub-Sub SSE Bridge** — Real-time event sync across multiple clients with heartbeat keepalive and connection filtering
2. **Media Streaming Pattern** — `updateMediaType()` for audio/video with sync across visitors
3. **Express Admin Middleware** — Reusable middleware vs inline guard pattern
4. **YouTube Integration** — Search, validation, duration parsing, chunked batch requests
