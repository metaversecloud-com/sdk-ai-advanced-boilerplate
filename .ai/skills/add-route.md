---
name: Add Server Route
description: Add a new Express API endpoint with controller. Use when you need a new server route that the client calls via backendAPI.
---

# Add a Server Route + Controller

> **Prerequisites**: None (foundation skill)

## Inputs Needed

- [ ] **HTTP method + path**: e.g., `POST /api/submit-answer`
- [ ] **Request body fields** (POST/PUT only)
- [ ] **Response shape**
- [ ] **Admin-only?**
- [ ] **SDK entities needed**: DroppedAsset, Visitor, World?

## Steps

### 1. Create controller

Create `server/controllers/handle<Name>.ts` using the template.

→ See `../templates/controller.md`

Project-specific rules:
- `getCredentials(req.query)` MUST be first line in `try`
- Response MUST include `{ success: true }` on success
- `errorHandler` MUST have `functionName`, `message`, `req`, `res`
- For POST/PUT: extract from `req.body`

**Verify**: File compiles.

### 2. Export from index

Add to `server/controllers/index.ts`:
```ts
export * from "./handle<Name>.js";
```

### 3. Register route

Add to `server/routes.ts`:
```ts
router.get("/<path>", handle<Name>);
```

### 4. Test

→ See `./write-tests.md`

At minimum: 200 on valid request, error on missing credentials.

**Verify**: `cd server && npm test` passes.

### 5. Update CLAUDE.md routes table

Add the new route to the "Current Routes" table.

## Common Mistakes

- **Missing `.js` suffix**: ESM requires `.js` on relative imports
- **Using `req.body` on GET**: GET has no body — use query params or switch to POST
- **Not exporting from index.ts**: Route import fails silently
- **Wrong `functionName` in errorHandler**: Must match actual function name for tracing
