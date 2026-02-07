# Checklist: Adding a Feature to an Existing App

Use this checklist when adding a new feature to an already-running Topia SDK app.

## Before You Start

- [ ] Read the existing codebase — understand current routes, controllers, data structures
- [ ] Check `.ai/guide/decision-tree.md` to identify which patterns apply
- [ ] Review relevant examples in `.ai/examples/`
- [ ] Identify which data objects need changes (new fields? new entities?)

## Planning

- [ ] Define the feature scope (what it does, what it doesn't do)
- [ ] List new/changed API endpoints
- [ ] List new/changed data object fields with defaults
- [ ] List new/changed UI components
- [ ] Check for breaking changes to existing data (need migration?)

## Data Layer Changes

- [ ] Update TypeScript interfaces in `shared/types/` or `server/types/`
- [ ] Update default objects in initialization functions
- [ ] If adding new data object properties:
  - [ ] Update `setDataObject` defaults so existing users get the new fields
  - [ ] Ensure `updateDataObject` calls won't fail on missing fields
- [ ] If changing data shape:
  - [ ] Add backward-compatible migration logic
  - [ ] Handle both old and new formats during transition

## Server Changes

- [ ] Add new routes to `server/routes.ts` (GET for reads, POST for mutations)
- [ ] Create/update controllers following existing patterns
- [ ] Use proper locking for data object writes
- [ ] Add admin guards if feature is admin-only
- [ ] Validate/sanitize any user input
- [ ] Add analytics tracking where appropriate
- [ ] Export new controllers from `server/controllers/index.ts`

## Client Changes

- [ ] Update context types if new state is needed (`client/src/context/types.ts`)
- [ ] Update reducer if new actions are needed (`client/src/context/reducer.ts`)
- [ ] Create/update components using SDK CSS classes
- [ ] Use `backendAPI` for all new API calls
- [ ] Handle loading and error states
- [ ] Do NOT modify protected files

## Testing

- [ ] Add tests for new routes in `server/tests/`
- [ ] Update existing tests if behavior changed
- [ ] Run `cd server && npm test` — all passing

## Verification

- [ ] Feature works for regular visitors
- [ ] Feature works for admins (if applicable)
- [ ] Error cases handled gracefully (no crashes, user sees helpful messages)
- [ ] No console errors in browser
- [ ] Protected files unchanged
- [ ] SDK CSS classes used (no unnecessary Tailwind or inline styles)
