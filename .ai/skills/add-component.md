---
name: Add Client Component
description: Add a new React page or UI component that calls the server via backendAPI. Use when building client-side UI for a Topia SDK app.
---

# Add a Client Page or Component

> **Prerequisites**: At least one server route (see [add-route](./add-route.md))

## Inputs Needed

- [ ] **Component type**: Page (`pages/`) or reusable component (`components/`)?
- [ ] **Data source**: Which API endpoint(s)?
- [ ] **New state fields**: Anything needed in GlobalContext?
- [ ] **Admin-only?**

## Steps

### 1. Add state to context (if needed)

Add type + action constant to `client/src/context/types.ts`, add reducer case.

→ See `../guide/01-boilerplate-setup.md`

### 2. Create component file

Place in `client/src/pages/<Name>.tsx` or `client/src/components/<Name>.tsx`.

→ See `../templates/component.tsx` for the full template

Project-specific rules:
- Use path aliases: `@context/`, `@utils/`, `@components/`
- Use `backendAPI` for ALL server calls — never `fetch` or `axios`
- Guard data fetching with `if (hasInteractiveParams)`
- Use SDK CSS classes — not Tailwind where SDK classes exist

→ See `../style-guide.md` for class reference

### 3. Export from index

Add to `client/src/pages/index.ts` or `client/src/components/index.ts`.

### 4. Wire into routing (pages only)

Add to app navigation/routing as appropriate for the existing pattern.

### 5. Handle loading and error states

- Loading: show indicator while fetching
- Empty: message when no data
- Error: `setErrorMessage(dispatch, error as ErrorType)` — displayed by `PageContainer`

## Common Mistakes

- **Calling SDK from React**: All SDK calls go through `backendAPI` → server. Never import `@rtsdk/topia` in client.
- **Missing `hasInteractiveParams` guard**: API calls fire before credentials are available and fail.
- **Bypassing `backendAPI.ts`**: This file is protected — use as-is.
- **Not cleaning up effects**: Return cleanup function from `useEffect` for intervals/subscriptions.
