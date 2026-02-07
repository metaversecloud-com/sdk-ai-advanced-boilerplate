---
name: Add Admin Feature
description: Restrict a route or UI section to world administrators. Use when implementing admin-only actions like reset, configuration, or moderation.
---

# Add Admin-Only Functionality

> **Prerequisites**: At least one server route (see [add-route](./add-route.md))

## Inputs Needed

- [ ] **What is admin-only?**: Which route(s) or UI section(s)?
- [ ] **Approach**: Middleware (multiple routes) or inline check (single route)?
- [ ] **Client behavior**: Hide entirely or show disabled?

## Steps

### 1. Add server-side admin check

**Inline (single route)** — add after `getCredentials`:
```ts
const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
if (!visitor.isAdmin) {
  return res.status(403).json({ success: false, error: "Forbidden: Admin privileges required" });
}
```

**Middleware (multiple routes)** — create `server/middleware/requireAdmin.ts`:

→ See `../examples/admin-permission-guard.md` → "Middleware Pattern"

Use in routes: `router.delete("/api/reset", requireAdmin, handleReset);`

**Verify**: Non-admin gets 403, admin proceeds.

### 2. Return `isAdmin` in game state

Ensure GET game-state response includes `isAdmin: visitor.isAdmin`.

### 3. Client conditional rendering

```tsx
const { isAdmin } = useContext(GlobalStateContext);
if (!isAdmin) return null;
```

### 4. Handle 403 on client

Check `err.response?.status === 403` and show a clear message via `setErrorMessage`.

## Common Mistakes

- **Client-only checks**: Always validate server-side. UI hiding is cosmetic, not security.
- **401 instead of 403**: 401 = not authenticated. 403 = authenticated but not authorized. Use 403.
- **Caching admin status server-side**: Re-check on every request.
- **Duplicate `Visitor.get` calls**: Reuse visitor instance if already fetched in the controller.
