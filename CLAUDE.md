# Claude Development Guidelines

## Quick Start — What Are You Doing?

| Task | Workflow |
|------|---------|
| **New app from boilerplate** | 1. `/brainstorming` → multi-file PRD in `.ai/templates/prd/` 2. `/writing-plans` → implementation plan 3. Follow `.ai/checklists/new-app.md` 4. Build with `.ai/guide/` phases 5. `/mermaid-diagrams` on major feature/system completion |
| **Add feature to existing app** | 1. `/brainstorming` → explore requirements 2. Find skill in `.ai/skills/README.md` 3. `/writing-plans` if multi-step 4. `/frontend-design` for game-facing UI 5. Reference `.ai/examples/` 6. Test (see Testing Protocol) |
| **Step-by-step runbook** | `.ai/skills/README.md` — task-to-skill lookup (add route, component, data object, leaderboard, badges, etc.) |
| **Fix a bug** | Read code → `/systematic-debugging` → fix → test → follow `.ai/templates/workflow.md` |
| **Look up a pattern** | `.ai/guide/decision-tree.md` → `.ai/examples/README.md` |
| **Pre-deploy** | `.ai/checklists/pre-deploy.md` |

## Project Context

- **App**: Lunch Swap — Topia SDK interactive app (React + TypeScript client, Node + Express server)
- **Audience**: Ages 7–17. Interfaces must be memorable, easy to understand, and engaging for kids and teens.
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

### Base Layer: SDK CSS Classes (required)

**MUST use SDK CSS classes** from `styles-3.0.2.css` for all standard UI elements. See `.ai/style-guide.md` for full reference.

- `h1`/`h2`/`p1`/`p2` for typography
- `btn`/`btn-outline`/`btn-text`/`btn-danger` for buttons
- `card`/`card-details`/`card-title`/`card-actions` for cards
- `input`/`label`/`input-checkbox` for forms
- `container` for layout
- No Tailwind where SDK classes exist. No inline styles except dynamic positioning.

Component structure: see `.ai/templates/component.tsx`

### Experience Layer: `/frontend-design` (for game and feature UI)

Use `/frontend-design` when building components unique to the app experience — leaderboards, game boards, achievement displays, onboarding flows, interactive panels. Ask: **what makes this interface memorable, easy to understand, and engaging?**

- **Audience is ages 7–17** — clarity and delight matter more than sophistication
- SDK classes remain the base (buttons, forms, cards stay standard)
- `/frontend-design` adds the experience layer on top: layout composition, animation and motion, color atmosphere, and visual storytelling
- Prioritize: clear visual hierarchy, rewarding animations on actions, intuitive spatial layout, and age-appropriate theming
- Every game-facing component should feel like it was designed for *this* game, not pulled from a generic template

## Testing Protocol

Testing is **required**, not optional. Run tests before and after every change.

### When to Test

- **Before starting work**: `cd server && npm test` — confirm green baseline
- **After every route/controller change**: run tests again immediately
- **After every feature**: add new tests before considering the feature complete
- **Before any commit or deploy**: all tests must pass

### Server Tests (Jest + supertest)

- Add tests in `server/tests/` for each route (use `write-tests` skill)
- Mock SDK with `server/mocks/@rtsdk/topia.ts`
- Assert: HTTP status, JSON schema, SDK method calls, credentials flow
- Source imports use `.js` suffix (ESM); Jest strips `.js` for relative paths only
- Run: `cd server && npm test`

### Frontend Verification (webapp-testing)

- Use `/webapp-testing` to verify frontend flows after major UI changes
- Confirm pages render, user interactions work, and no console errors
- Especially important for multi-component features (leaderboards, admin panels, forms)

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
| Step-by-step skills (11 runbooks) | `.ai/skills/README.md` |
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

## Contribute Back

**Central repository**: https://github.com/metaversecloud-com/sdk-ai-advanced-boilerplate

The `.ai/` folder in this app is a local copy. The boilerplate repo is the single source of truth for examples, templates, and skills shared across all SDK apps.

### When You Create Something Reusable

When you create a **novel pattern, utility, or workflow** during development that could be reused across apps, use `/skill-creator` to structure it properly, then:

1. **Add locally first** — Add the new file to the appropriate `.ai/` subdirectory in this app:
   - New code pattern → `.ai/examples/` (header metadata, When to Use, Server/Client Implementation, Variations, Common Mistakes, Related Examples, Related Skills, Tags)
   - New step-by-step procedure → `.ai/skills/` (header, References, Inputs Needed, Steps with Verify checkpoints, Verification Checklist, Common Mistakes, Next Skills)
   - New scaffold/boilerplate → `.ai/templates/`
2. **Update indexes** → Add the new file to `examples/README.md`, `skills/README.md`, or the relevant index, and update cross-references in `CLAUDE.md` and `decision-tree.md`
3. **PR to the boilerplate repo** → Clone/fork `metaversecloud-com/sdk-ai-advanced-boilerplate`, add the new file(s) to the matching `.ai/` path, update its indexes, and open a pull request. Title format: `Add [type]: [name]` (e.g., `Add example: vote-reversal.md`, `Add skill: add-leaderboard.md`).

Example header format (add to top of every new `.ai/examples/*.md`):
```
> **Source**: [app name(s)]
> **SDK Methods**: [method signatures]
> **Guide Phase**: Phase N
> **Difficulty**: Starter | Intermediate | Advanced
> **Tags**: `keyword1, keyword2, keyword3`
```

If unsure whether something is reusable, err on the side of adding it — it's easier to remove than to recreate.

### Sync from Boilerplate (Every Few Days)

Periodically pull updates from the central boilerplate repo to keep this app's `.ai/` folder current:

1. **Pull latest** → Fetch the latest `.ai/` contents from `metaversecloud-com/sdk-ai-advanced-boilerplate`
2. **Diff and merge** → Compare against local `.ai/` folder. Apply new/updated examples, templates, and skills. Preserve any app-specific customizations (e.g., `CLAUDE.md` project context, app-specific routes table).
3. **Run tests** → `cd server && npm test` — make sure nothing broke
4. **Review additions** → Check what new examples, skills, or templates were added to the boilerplate. For each:
   - Does it describe a feature this app could benefit from?
   - Does the app already have this functionality?
   - If it's a good fit, consider implementing it using the corresponding skill runbook
5. **Report** → Summarize what was synced, what's new, and whether any new features are worth adding
