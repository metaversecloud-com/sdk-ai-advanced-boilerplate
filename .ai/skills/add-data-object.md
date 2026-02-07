---
name: Add Data Object
description: Design and implement a data object on DroppedAsset, Visitor, or World. Use when you need to persist structured data on any SDK entity.
---

# Design and Implement a Data Object

> **Prerequisites**: At least one server route (see [add-route](./add-route.md))

## Inputs Needed

- [ ] **Entity type**: DroppedAsset, Visitor, or World?
- [ ] **Data fields**: Names, types, defaults
- [ ] **Scope**: Per-asset, per-visitor, per-scene, or global?
- [ ] **Who writes**: All visitors, admin only, or system only?
- [ ] **Concurrency risk**: Multiple visitors writing simultaneously?

## Steps

### 1. Design the schema

Define a TypeScript interface + defaults.

→ See `../templates/data-object-schema.md`

Project-specific rules:
- Keep **flat or 1 level deep** — deeply nested objects break dot-notation updates
- Use `Record<string, string>` for dynamic keys (leaderboard entries)
- Timestamps as `number` (ms epoch), not date strings
- Pipe-delimited strings for leaderboard-style entries: `"name|score|status"`

### 2. Implement the init pattern

Follow: fetch → check → set (with lock) → update.

→ See `../examples/data-object-init.md` for full implementation with all entity types

Lock window guidelines:

| Frequency | Window | Divisor |
|-----------|--------|---------|
| High (multiple visitors/sec) | ~10s | 10000 |
| Normal (per-visitor actions) | ~1min | 60000 |
| Rare (admin/world init) | ~5min | 300000 |

Always include `releaseLock: true`.

**Verify**: Calling init twice is idempotent.

### 3. Implement read access

Fetch data in your GET controller: init entity → cast `dataObject` → return in response.

### 4. Implement write access

| Method | Use When |
|--------|----------|
| `setDataObject(data)` | First-time init or full reset only |
| `updateDataObject(data)` | Partial updates (dot-notation: `"nested.field"`) |
| `incrementDataObjectValue(path, n)` | Atomic numeric counters |

→ See `../examples/data-object-init.md` → "Complete Controller Example"

### 5. Add scoping (if needed)

For World data objects shared across app instances, scope by `sceneDropId`:
```ts
await world.updateDataObject({ [sceneDropId]: { myField: value } });
```

→ See `../examples/data-object-init.md` → "World Data Object Initialization"

## Common Mistakes

- **`updateDataObject` before `setDataObject`**: Merge fails without a base object. Always init first.
- **Missing `releaseLock: true`**: Lock stays held until expiry, blocking all writes.
- **`setDataObject` for partial updates**: Replaces entire object. Use `updateDataObject`.
- **Not re-fetching after writes**: In-memory object isn't auto-updated. Call `fetchDataObject()` to read current state.
- **Deep nesting**: `"a.b"` works, `"a.b.c"` may not merge correctly.
