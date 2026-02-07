# Claude Development Guidelines

## Quick Start — What Are You Doing?

| Task | Workflow |
|------|---------|
| **New app from boilerplate** | 1. Create PRD → `.ai/templates/prd/` 2. Follow `.ai/checklists/new-app.md` 3. Build with `.ai/guide/` phases |
| **Add feature to existing app** | 1. Follow `.ai/checklists/new-feature.md` 2. Check `.ai/guide/decision-tree.md` 3. Reference `.ai/examples/` |
| **Fix a bug** | Read code → fix → test → follow `.ai/templates/workflow.md` |
| **Look up a pattern** | `.ai/guide/decision-tree.md` → `.ai/examples/README.md` |
| **Pre-deploy** | `.ai/checklists/pre-deploy.md` |

## Project Context

- **App**: Lunch Swap — Topia SDK interactive app (React + TypeScript client, Node + Express server)
- **SDK**: `@rtsdk/topia` (v0.17.7) — [SDK Docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- **Monorepo**: npm workspaces — `client/`, `server/`, `shared/`
- **Dev**: `npm run dev` (Vite on :3001 proxied to Express on :3000)
- **Build**: `npm run build` → `npm start`
- **Test**: `cd server && npm test` (Jest + ts-jest + supertest)

## Non-Negotiable Rules

### Protected Files — DO NOT MODIFY

- `client/src/App.tsx`
- `client/src/components/PageContainer.tsx`
- `client/src/utils/backendAPI.ts`
- `client/src/utils/setErrorMessage.ts`
- `server/utils/getCredentials.ts`
- `server/utils/errorHandler.ts`

### Server-First Architecture

```
UI → backendAPI.ts (DO NOT CHANGE) → server/routes.ts → controllers → Topia SDK
```

- All SDK calls happen server-side — NEVER from React
- New client behavior = new server routes accessed via `backendAPI`
- Never bypass `backendAPI.ts`

### Required File

`server/utils/topiaInit.ts` MUST exist — exports `Asset`, `DroppedAsset`, `User`, `Visitor`, `World`.

## Architecture Reference

### Credentials Flow

URL query params → `App.tsx` extracts → `backendAPI` interceptor attaches → `getCredentials(req.query)` validates on server.

### Client State

GlobalContext with reducer. Actions: `SET_HAS_INTERACTIVE_PARAMS`, `SET_GAME_STATE`, `SET_ERROR`. State: `{ isAdmin, error, hasInteractiveParams, visitorData, droppedAsset }`.

### Path Aliases

`@/*` → `src/*`, `@components/*`, `@context/*`, `@pages/*`, `@utils/*`, `@shared/*` → `../shared/*`

### Current Routes

| Method | Path | Controller |
|--------|------|-----------|
| GET | `/api/` | Health check |
| GET | `/api/system/health` | System status |
| GET | `/api/game-state` | `handleGetGameState` |

## Key Patterns (Quick Reference)

| Pattern | Guide Phase | Example |
|---------|------------|---------|
| Data object init (fetch → check → set → update) | Phase 3 | `.ai/examples/data-object-init.md` |
| Locking (time-bucketed lockId) | Phase 3 | `.ai/examples/locking-strategies.md` |
| Controller template (try/catch + errorHandler) | Phase 2 | `.ai/templates/controller.md` |
| Admin permission guard | Phase 2 | `.ai/examples/admin-permission-guard.md` |
| Analytics (piggyback on data object calls) | Phase 5 | `.ai/guide/05-analytics.md` |
| Inventory cache (24h TTL) | Phase 6 | `.ai/examples/inventory-cache.md` |
| Badges & expressions | Phase 6 | `.ai/examples/badges.md` |
| Leaderboard (pipe-delimited) | Phase 4 | `.ai/examples/leaderboard.md` |
| Input sanitization | Phase 2 | `.ai/examples/input-sanitization.md` |

## Controller Template

```ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "../utils/index.js";

export const handleExample = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    // ... SDK calls ...
    return res.json({ success: true, data });
  } catch (error) {
    return errorHandler({ error, functionName: "handleExample", message: "Error description", req, res });
  }
};
```

## Styling

**MUST use SDK CSS classes** from `styles-3.0.2.css`. See `.ai/style-guide.md` for full reference.

- `h1`/`h2`/`p1`/`p2` for typography
- `btn`/`btn-outline`/`btn-text`/`btn-danger` for buttons
- `card`/`card-details`/`card-title`/`card-actions` for cards
- `input`/`label`/`input-checkbox` for forms
- `container` for layout
- No Tailwind where SDK classes exist. No inline styles except dynamic positioning.

Component structure: see `.ai/templates/component.tsx`

## Testing

- Add tests in `server/tests/` for each route
- Mock SDK with `server/mocks/@rtsdk/topia.ts`
- Assert: HTTP status, JSON schema, SDK method calls, credentials flow
- Source imports use `.js` suffix (ESM); Jest strips `.js` for relative paths only

## Environment

`.env` requires: `INTERACTIVE_KEY`, `INTERACTIVE_SECRET`, `INSTANCE_DOMAIN=api.topia.io`, `INSTANCE_PROTOCOL=https`

## When Blocked

1. STOP — propose minimal stub
2. List assumptions
3. Ask 1 concise question
4. If no answer, proceed with safest assumption and mark TODOs
5. Never invent SDK methods — use only documented APIs

## Documentation Map

| Resource | Location |
|----------|----------|
| Full SDK API reference | `.ai/apps/sdk-reference.md` |
| Implementation guide (7 phases) | `.ai/guide/` |
| Decision tree ("I want to do X") | `.ai/guide/decision-tree.md` |
| 34 code examples | `.ai/examples/README.md` |
| PRD template | `.ai/templates/prd/` |
| Controller template | `.ai/templates/controller.md` |
| Data object schema template | `.ai/templates/data-object-schema.md` |
| Component template | `.ai/templates/component.tsx` |
| Workflow & deliverable format | `.ai/templates/workflow.md` |
| CSS class reference | `.ai/style-guide.md` |
| Base rules (detailed) | `.ai/rules.md` |
| Checklists | `.ai/checklists/` |
| 12 production app analyses | `.ai/apps/` |

Always reference `.ai/` documentation before starting implementation.
