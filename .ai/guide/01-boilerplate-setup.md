# Phase 1: Boilerplate Setup

## Prerequisites

- Node.js 18+
- A Topia developer account with interactive app credentials
- The `sdk-ai-boilerplate` repo cloned (or this repo)

## What You Will Build

- Project structure with client/server/shared workspaces
- SDK initialization with environment variables
- Credentials flow from URL params through to SDK calls
- A working health check endpoint

## Step 1: Project Structure

The monorepo uses npm workspaces with three packages:

```
project-root/
  client/                    # React + Vite (port 3001)
    src/
      components/
        PageContainer.tsx    # PROTECTED -- do not modify
      context/
        GlobalContext.tsx     # Reducer-based state management
        types.ts             # State and action types
      pages/
        Home.tsx             # Main page
      utils/
        backendAPI.ts        # PROTECTED -- axios interceptor
        setErrorMessage.ts   # PROTECTED -- error dispatch helper
      App.tsx                # PROTECTED -- router and param extraction
  server/                    # Express (port 3000)
    controllers/             # Route handlers
    utils/
      topiaInit.ts           # REQUIRED -- SDK factory exports
      getCredentials.ts      # PROTECTED -- credential extraction
      errorHandler.ts        # PROTECTED -- error formatting
      index.ts               # Barrel exports
    routes.ts                # Route definitions
    index.ts                 # Express app entry
  shared/                    # Shared types
    types.ts
```

### Protected Files (DO NOT MODIFY)

| File | Reason |
|------|--------|
| `client/src/App.tsx` | Extracts URL params, sets up routing |
| `client/src/components/PageContainer.tsx` | Standard page wrapper |
| `client/src/utils/backendAPI.ts` | Axios interceptor attaches credentials |
| `client/src/utils/setErrorMessage.ts` | Error dispatch utility |
| `server/utils/getCredentials.ts` | Extracts and validates credentials from query |
| `server/utils/errorHandler.ts` | Consistent error response formatting |

## Step 2: Environment Variables

Create a `.env` file at the project root:

```bash
INTERACTIVE_KEY=your_public_key     # From Topia developer dashboard
INTERACTIVE_SECRET=your_secret_key  # From Topia developer dashboard
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
NODE_ENV=development
API_URL=http://localhost:3001       # Client dev server URL
```

## Step 3: SDK Initialization (topiaInit.ts)

This file is REQUIRED and must export SDK factories. Create or verify `server/utils/topiaInit.ts`:

```typescript
import {
  AssetFactory,
  DroppedAssetFactory,
  EcosystemFactory,
  Topia,
  UserFactory,
  VisitorFactory,
  WorldFactory,
} from "@rtsdk/topia";

const topia = new Topia({
  apiDomain: process.env.INSTANCE_DOMAIN,
  apiProtocol: process.env.INSTANCE_PROTOCOL,
  interactiveKey: process.env.INTERACTIVE_KEY,
  interactiveSecret: process.env.INTERACTIVE_SECRET,
});

const Asset = new AssetFactory(topia);
const DroppedAsset = new DroppedAssetFactory(topia);
const Ecosystem = new EcosystemFactory(topia);
const User = new UserFactory(topia);
const Visitor = new VisitorFactory(topia);
const World = new WorldFactory(topia);

export { Asset, DroppedAsset, Ecosystem, User, Visitor, World };
```

Key rules:
- Initialize `Topia` exactly ONCE
- All factories share the same `topia` instance
- Add `EcosystemFactory` only if your app uses badges or inventory (see Phase 6)
- Export from `server/utils/index.ts` barrel file

## Step 4: Credentials Flow

Understanding the credentials flow is critical. Here is the complete path:

```
1. Topia iframe loads your app with URL query params:
   ?assetId=xxx&visitorId=123&urlSlug=my-world&interactiveNonce=...&interactivePublicKey=...

2. client/src/App.tsx extracts these params (PROTECTED, already done)

3. client/src/utils/backendAPI.ts attaches them to every request (PROTECTED)

4. Server route receives them as req.query

5. server/utils/getCredentials.ts validates and returns typed object (PROTECTED)
```

The credentials interface:

```typescript
interface Credentials {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  username: string;
  urlSlug: string;
  visitorId: number;
}
```

Usage in every controller:

```typescript
import { getCredentials } from "../utils/index.js";

export const handleMyAction = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, visitorId } = credentials;
    // ... SDK calls using credentials
  } catch (error) {
    return errorHandler({ error, functionName: "handleMyAction", message: "Error", req, res });
  }
};
```

## Step 5: Server Routes

Define routes in `server/routes.ts`:

```typescript
import { Router } from "express";
import { handleGetGameState } from "./controllers/index.js";

const router = Router();

// Health check
router.get("/", (req, res) => res.json({ success: true }));

// System status
router.get("/system/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Game state -- your first real endpoint
router.get("/game-state", handleGetGameState);

export default router;
```

## Step 6: First Controller

Create `server/controllers/handleGetGameState.ts`:

```typescript
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset } from "../utils/index.js";

export const handleGetGameState = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    // Get the key asset (the interactive asset that opened this iframe)
    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    await droppedAsset.fetchDataObject();

    return res.json({
      success: true,
      droppedAsset: {
        id: droppedAsset.id,
        dataObject: droppedAsset.dataObject,
        position: droppedAsset.position,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error loading game state",
      req,
      res,
    });
  }
};
```

## Step 7: Run the Dev Server

```bash
npm run dev
```

This runs Vite (port 3001) and Express (port 3000) concurrently. The Vite dev server proxies API requests to Express.

## Key SDK Methods Used in This Phase

| Method | Purpose |
|--------|---------|
| `new Topia({...})` | Create SDK instance |
| `new DroppedAssetFactory(topia)` | Create factory for dropped assets |
| `DroppedAsset.get(id, urlSlug, opts)` | Fetch a dropped asset with full details |
| `droppedAsset.fetchDataObject()` | Load the asset's data object |
| `getCredentials(req.query)` | Extract validated credentials |
| `errorHandler({...})` | Format error responses |

## Related Examples

- `../examples/handleGetConfiguration.md` -- configuration retrieval pattern
- `../examples/getAnchorAssets.md` -- fetching assets by unique name

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Importing `@rtsdk/topia` in client code | All SDK calls must be server-side only |
| Creating multiple `Topia` instances | Initialize once in `topiaInit.ts` |
| Modifying protected files | Read the protected files list; add new routes and controllers instead |
| Forgetting `.js` suffix in server imports | ESM requires `.js` extension even for `.ts` files |
| Missing `getCredentials` call | Every controller must extract credentials from `req.query` |
| Not wrapping SDK calls in try/catch | Always use try/catch with `errorHandler` |
