# Real-Time Server-Sent Events with Redis Pub/Sub

> **Source**: sdk-race
> **SDK Methods**: N/A (pure infrastructure pattern)
> **Guide Phase**: Phase 7
> **Difficulty**: Advanced
> **Tags**: `real-time, SSE, Redis, pub-sub, live-update, streaming, multiplayer`

## When to Use

Use this pattern when you need real-time, server-to-client event broadcasting across multiple server instances. SSE (Server-Sent Events) provides a unidirectional push model ideal for game state updates, race progress, leaderboard changes, or any scenario where the server needs to push updates to multiple connected clients without requiring bidirectional communication.

## Server Implementation

### SSE Endpoint with Redis Pub/Sub

```typescript
// server/routes.ts
import express from "express";
import { handleSSEConnection } from "./controllers/handleSSEConnection.js";

const router = express.Router();

router.get("/api/events/race", handleSSEConnection);

export default router;
```

```typescript
// server/controllers/handleSSEConnection.ts
import { Request, Response } from "express";
import { getCredentials, errorHandler, redisClient, redisSub } from "../utils/index.js";

export const handleSSEConnection = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

    // Channel name includes urlSlug to scope events per world
    const channel = `race-events:${urlSlug}`;

    // Subscribe to Redis channel
    const listener = (message: string) => {
      try {
        const event = JSON.parse(message);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error("Failed to parse Redis message:", err);
      }
    };

    await redisSub.subscribe(channel);
    redisSub.on("message", listener);

    // Heartbeat to keep connection alive (every 30 seconds)
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    // Cleanup on client disconnect
    req.on("close", async () => {
      clearInterval(heartbeat);
      redisSub.off("message", listener);
      await redisSub.unsubscribe(channel);
      res.end();
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSSEConnection",
      message: "Failed to establish SSE connection",
      req,
      res,
    });
  }
};
```

### Broadcasting Events via Redis

```typescript
// server/controllers/handleRaceStart.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, redisClient, DroppedAsset } from "../utils/index.js";

export const handleRaceStart = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, assetId } = credentials;

    const droppedAsset = await DroppedAsset.create(assetId, {
      credentials,
    });

    // Update game state
    await droppedAsset.updateDataObject({
      raceStatus: "active",
      startTime: Date.now(),
    });

    // Broadcast event to all connected clients
    const channel = `race-events:${urlSlug}`;
    const event = {
      type: "race-start",
      timestamp: Date.now(),
      raceId: assetId,
    };

    await redisClient.publish(channel, JSON.stringify(event));

    return res.json({
      success: true,
      data: { raceStatus: "active" },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleRaceStart",
      message: "Failed to start race",
      req,
      res,
    });
  }
};
```

### Redis Client Setup

```typescript
// server/utils/redisClient.ts
import Redis from "ioredis";

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

// Separate client for subscriptions (Redis requirement)
export const redisSub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisSub.on("error", (err) => console.error("Redis Sub Error:", err));
```

## Client Implementation

### EventSource Listener

```typescript
// client/src/utils/sseClient.ts
import { backendAPI } from "./backendAPI";

export interface RaceEvent {
  type: "connected" | "race-start" | "checkpoint" | "race-finish" | "player-update";
  timestamp: number;
  raceId?: string;
  playerId?: string;
  data?: any;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(onEvent: (event: RaceEvent) => void, onError?: (error: Event) => void) {
    const queryString = new URLSearchParams(window.location.search).toString();
    const url = `${backendAPI.defaults.baseURL}/api/events/race?${queryString}`;

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RaceEvent;
        onEvent(data);
        this.reconnectAttempts = 0; // Reset on successful message
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);

      if (onError) {
        onError(error);
      }

      // Reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        setTimeout(() => {
          console.log(`Reconnecting SSE (attempt ${this.reconnectAttempts})...`);
          this.disconnect();
          this.connect(onEvent, onError);
        }, delay);
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

### React Component Usage

```typescript
// client/src/pages/RacePage.tsx
import { useContext, useEffect, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { SSEClient, RaceEvent } from "@/utils/sseClient";
import { setErrorMessage } from "@/utils";
import { ErrorType } from "@/context/types";

export const RacePage = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const [raceStatus, setRaceStatus] = useState<string>("waiting");
  const [sseClient] = useState(() => new SSEClient());

  useEffect(() => {
    const handleRaceEvent = (event: RaceEvent) => {
      switch (event.type) {
        case "connected":
          console.log("Connected to race events");
          break;
        case "race-start":
          setRaceStatus("active");
          break;
        case "checkpoint":
          console.log("Checkpoint reached:", event.data);
          break;
        case "race-finish":
          setRaceStatus("finished");
          break;
      }
    };

    const handleError = (error: Event) => {
      setErrorMessage(dispatch, { message: "Lost connection to race server" } as ErrorType);
    };

    sseClient.connect(handleRaceEvent, handleError);

    return () => {
      sseClient.disconnect();
    };
  }, [dispatch, sseClient]);

  return (
    <div className="container">
      <h2 className="h2">Race Status: {raceStatus}</h2>
      <p className="p1">Listening for real-time updates...</p>
    </div>
  );
};

export default RacePage;
```

## Variations

| App | Channel Pattern | Event Types | Notes |
|-----|----------------|-------------|-------|
| **sdk-race** | `race-events:{urlSlug}` | race-start, checkpoint, race-finish, player-update | Heartbeat every 30s, includes race metrics |
| **leaderboard-app** | `leaderboard:{urlSlug}` | score-update, rank-change | Throttled updates (max 1/sec) to reduce load |
| **auction-house** | `auction:{auctionId}` | bid-placed, auction-end | Per-auction channels for targeted updates |
| **multiplayer-game** | `game:{roomId}:{playerId}` | player-move, game-state | Player-specific channels + broadcast channel |

## Common Mistakes

1. **Forgetting separate Redis client for subscriptions**: Redis requires a dedicated client for pub/sub. Never use the same client for both subscriptions and regular commands.

2. **Not handling client disconnects**: Always attach a `req.on('close', ...)` handler to clean up subscriptions and intervals. Memory leaks occur when connections aren't properly cleaned up.

3. **Missing heartbeat mechanism**: Long-lived connections can be dropped by proxies/load balancers. Send periodic heartbeat comments (`:heartbeat\n\n`) to keep connections alive.

4. **Broadcasting to wrong channel**: Always scope channels by `urlSlug` or `roomId` to prevent cross-world event leakage.

5. **Not handling JSON parse errors**: Redis messages are strings. Always wrap `JSON.parse()` in try/catch to handle malformed messages gracefully.

6. **Forgetting X-Accel-Buffering header**: Nginx and some reverse proxies buffer responses by default, breaking SSE. Set `X-Accel-Buffering: no` to disable.

7. **No reconnection logic**: Network interruptions happen. Implement exponential backoff reconnection on the client side.

## Related Examples

- **handleGetGameState.md** - Initialize game state before broadcasting events
- **inventoryCache.md** - Cache pattern for reducing API calls in high-traffic scenarios
- **handleUpdateDroppedAsset.md** - Update patterns that trigger broadcasts
