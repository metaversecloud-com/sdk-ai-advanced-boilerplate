# Checklist: Pre-Deploy

Run through this checklist before deploying a Topia SDK app to production.

## Build & Runtime

- [ ] `npm run build` completes without errors
- [ ] `npm start` starts the server and serves the client
- [ ] No TypeScript errors (`npx tsc --noEmit` in both client and server)
- [ ] No console warnings about missing dependencies

## Environment

- [ ] `.env-example` is up to date with all required variables
- [ ] Production environment has all variables set:
  - [ ] `INTERACTIVE_KEY`
  - [ ] `INTERACTIVE_SECRET`
  - [ ] `INSTANCE_DOMAIN=api.topia.io`
  - [ ] `INSTANCE_PROTOCOL=https`
- [ ] No hardcoded localhost URLs in server code
- [ ] No `console.log` debugging statements left in code

## Protected Files

- [ ] `client/src/App.tsx` — unchanged from boilerplate
- [ ] `client/src/components/PageContainer.tsx` — unchanged
- [ ] `client/src/utils/backendAPI.ts` — unchanged
- [ ] `client/src/utils/setErrorMessage.ts` — unchanged
- [ ] `server/utils/getCredentials.ts` — unchanged
- [ ] `server/utils/errorHandler.ts` — unchanged
- [ ] `server/utils/topiaInit.ts` — exists

## Security

- [ ] All SDK calls happen server-side only (never in React)
- [ ] Admin-only endpoints check `visitor.isAdmin` server-side
- [ ] User input is sanitized (string trimming, length limits, type checks)
- [ ] No secrets or API keys in client code
- [ ] No `@ts-ignore` comments hiding real issues

## Data Integrity

- [ ] All data objects have initialization functions with defaults
- [ ] `setDataObject` is called before `updateDataObject` (init pattern)
- [ ] Locking is used on write operations to prevent race conditions
- [ ] Pipe-delimited leaderboard entries handle display names with `|` (or use different delimiter)

## Styling

- [ ] All UI components use SDK CSS classes from `styles-3.0.2.css`
- [ ] No Tailwind classes where SDK classes exist
- [ ] No inline styles except for dynamic positioning
- [ ] Components follow structure in `.ai/templates/component.tsx`

## Testing

- [ ] `cd server && npm test` — all tests pass
- [ ] New routes have corresponding test coverage (use `write-tests` skill)
- [ ] SDK mocks are up to date in `server/mocks/@rtsdk/topia.ts`
- [ ] `/webapp-testing` — frontend flows verified (pages render, interactions work, no console errors)

## Error Handling

- [ ] All controllers use try/catch with `errorHandler`
- [ ] Client uses `setErrorMessage` for error display
- [ ] No unhandled promise rejections
- [ ] Non-critical operations use `Promise.allSettled` or `.catch()`

## Analytics (if applicable)

- [ ] Key user actions tracked with `analytics` array
- [ ] Analytics include `profileId`, `uniqueKey`, and `urlSlug` where appropriate
- [ ] Analytics names are descriptive and consistent
