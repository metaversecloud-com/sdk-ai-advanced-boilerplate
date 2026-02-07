# Checklist: Starting a New SDK App

Use this checklist when building a new Topia SDK interactive app from this boilerplate.

## Phase 0: Planning

- [ ] Create PRD using `.ai/templates/prd/` templates
  - [ ] `overview.md` — app concept, audience, success metrics
  - [ ] `user-flows.md` — entry points, primary flows, admin flows
  - [ ] `data-models.md` — data object schemas with defaults
  - [ ] `api-endpoints.md` — route contracts
  - [ ] `ui-screens.md` — screen inventory with components
- [ ] Review PRD against `.ai/guide/decision-tree.md` for pattern selection
- [ ] Get PRD approved before writing code

## Phase 1: Boilerplate Setup

- [ ] Verify `.env` file has all required vars (`INTERACTIVE_KEY`, `INTERACTIVE_SECRET`, `INSTANCE_DOMAIN`, `INSTANCE_PROTOCOL`)
- [ ] Confirm `server/utils/topiaInit.ts` exists and exports needed factories
- [ ] Run `npm run dev` — verify health check at `GET /api/` returns 200
- [ ] Verify protected files are untouched:
  - [ ] `client/src/App.tsx`
  - [ ] `client/src/components/PageContainer.tsx`
  - [ ] `client/src/utils/backendAPI.ts`
  - [ ] `client/src/utils/setErrorMessage.ts`
  - [ ] `server/utils/getCredentials.ts`
  - [ ] `server/utils/errorHandler.ts`

## Phase 2: Data Layer

- [ ] Define TypeScript interfaces for all data objects in `shared/types/`
- [ ] Create default objects for each data entity
- [ ] Create initialization functions following `initializeDroppedAssetDataObject` pattern
- [ ] Choose locking strategy per entity (see `.ai/examples/locking-strategies.md`)
- [ ] Decide data scope: World vs Visitor vs DroppedAsset vs Ecosystem

## Phase 3: Server Routes & Controllers

- [ ] Add routes to `server/routes.ts`
- [ ] Create controller files in `server/controllers/` following template (`.ai/templates/controller.md`)
- [ ] Each controller:
  - [ ] Extracts credentials via `getCredentials(req.query)`
  - [ ] Wraps SDK calls in try/catch
  - [ ] Returns `{ success: true, data }` or delegates to `errorHandler`
- [ ] Add admin permission guards where needed (`.ai/examples/admin-permission-guard.md`)
- [ ] Add input sanitization for user-provided data (`.ai/examples/input-sanitization.md`)
- [ ] Export all controllers from `server/controllers/index.ts`

## Phase 4: Client Pages & Components

- [ ] Create page components in `client/src/pages/`
- [ ] Create UI components in `client/src/components/`
- [ ] Follow component structure pattern from `.ai/templates/component.tsx`
- [ ] Use SDK CSS classes exclusively (`.ai/style-guide.md`)
- [ ] Wire up to GlobalContext for state management
- [ ] Use `backendAPI` for all server calls (never bypass)
- [ ] Add proper error handling with `setErrorMessage`

## Phase 5: Features (as needed)

- [ ] Leaderboard — see `.ai/guide/04-leaderboard.md`
- [ ] Badges/achievements — see `.ai/guide/06-badges-achievements.md`
- [ ] Analytics — see `.ai/guide/05-analytics.md`
- [ ] Particle effects / toasts — see `.ai/guide/07-polish.md`
- [ ] Sound effects — see `.ai/examples/sound-effects.md`

## Phase 6: Testing

- [ ] Add Jest tests in `server/tests/` for each route
- [ ] Mock SDK using `server/mocks/@rtsdk/topia.ts`
- [ ] Assert: HTTP status, JSON response shape, SDK method calls, credentials flow
- [ ] Run `cd server && npm test` — all passing

## Phase 7: Pre-Deploy

- [ ] Follow `.ai/checklists/pre-deploy.md`
