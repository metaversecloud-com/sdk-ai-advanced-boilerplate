---
name: Debug SDK Issues
description: Troubleshoot common Topia SDK failures. Use when an SDK call is failing, returning unexpected data, or behaving inconsistently.
---

# Debug Common SDK Issues

## Quick Diagnosis

| Symptom | Likely Cause | Section |
|---------|-------------|---------|
| `updateDataObject` silently fails | Never initialized | [#1](#1-data-object-not-initialized) |
| Data overwritten by another visitor | Missing lock | [#2](#2-race-condition) |
| `setDataObject` wipes existing data | Set vs update confusion | [#3](#3-set-vs-update) |
| Stale data after write | Missing `fetchDataObject()` | [#4](#4-stale-data) |
| 403 on SDK call | Bad credentials | [#5](#5-credentials) |
| Method not found | Wrong factory/method | [#6](#6-wrong-factory) |
| Particle/toast not appearing | Invalid name or position | [#7](#7-visual-effects) |
| "Unable to acquire lock" | Lock window wrong | [#8](#8-locking) |

## Issues

### 1. Data Object Not Initialized

`updateDataObject` merges into an **existing** object. No object = nothing to merge into.

**Fix**: fetch → check → `setDataObject(DEFAULTS, { lock })` → then `updateDataObject`.

→ See `../examples/data-object-init.md`

### 2. Race Condition

Concurrent `setDataObject` calls — second overwrites first.

**Fix**: Time-bucketed lock: `lockId = entityId-init-${rounded timestamp}` with `releaseLock: true`.

→ See `../examples/locking-strategies.md`

### 3. Set vs Update

| Method | Behavior |
|--------|----------|
| `setDataObject` | **Replaces** entire object — init/reset only |
| `updateDataObject` | **Merges** into existing — all partial updates |
| `incrementDataObjectValue` | **Atomic** increment — counters |

### 4. Stale Data

SDK entities cache data in memory. Writes don't auto-refresh.

**Fix**: `await entity.fetchDataObject()` before reading.

### 5. Credentials

Checklist:
1. `getCredentials(req.query)` is first line in try?
2. Env vars set? (`INTERACTIVE_KEY`, `INTERACTIVE_SECRET`, `INSTANCE_DOMAIN`, `INSTANCE_PROTOCOL`)
3. `interactiveNonce` still valid? (Don't cache nonces)
4. Passing `{ credentials }` to factory methods?

### 6. Wrong Factory

| Correct | Wrong |
|---------|-------|
| `DroppedAsset.get(assetId, urlSlug, { credentials })` | `DroppedAsset.create(...)` |
| `Visitor.get(visitorId, urlSlug, { credentials })` | `Visitor.create(...)` |
| `World.create(urlSlug, { credentials })` | `World.get(...)` |
| `visitor.fireToast({ title, text })` | `visitor.toast(...)` |
| `visitor.triggerParticle({ name, duration })` | `visitor.particle(...)` |

→ See `../apps/sdk-reference.md`

### 7. Visual Effects

- Particle names are case-sensitive → See `../examples/particle-effects.md`
- Toasts require both `title` and `text`
- World particles need valid `position: { x, y }`
- Check `.catch()` isn't swallowing errors silently

### 8. Locking

| Frequency | Divisor |
|-----------|---------|
| High (multi-visitor/sec) | 10000 (~10s) |
| Normal | 60000 (~1min) |
| Rare (world init) | 300000 (~5min) |

Always `releaseLock: true`. Missing this = writes blocked until expiry.

→ See `../examples/locking-strategies.md`

## General Debugging

1. Log credentials, SDK params, and response
2. Check `../apps/sdk-reference.md` for method signatures
3. Test in isolation with minimal controller
4. `console.log(JSON.stringify(entity.dataObject, null, 2))` after fetch
5. Verify env vars: `console.log(process.env.INTERACTIVE_KEY ? "set" : "missing")`
