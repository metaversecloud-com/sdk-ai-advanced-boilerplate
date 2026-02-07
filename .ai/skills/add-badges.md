---
name: Add Badges
description: Implement badges and achievements using ecosystem inventory. Use when you need to award, display, or track badges visitors earn through milestones or actions.
---

# Implement Badges and Achievements

> **Prerequisites**: [add-route](./add-route.md), [add-component](./add-component.md)

## Inputs Needed

- [ ] **Badge names**: What badges exist in the ecosystem?
- [ ] **Award conditions**: What triggers each? (level, completion, streak)
- [ ] **Display**: All badges (earned colored, unearned greyed) or only earned?
- [ ] **Ecosystem set up?**: Badges created in Topia dashboard?

## Steps

### 1. Add EcosystemFactory to topiaInit.ts

```ts
import { EcosystemFactory } from "@rtsdk/topia";
export const Ecosystem = new EcosystemFactory(myTopiaInstance);
```

→ See `../examples/inventory-cache.md` → "Add Ecosystem Factory"

### 2. Create inventory cache

Create `server/utils/inventoryCache.ts` with 24h TTL cache for `ecosystem.fetchInventoryItems()`.

→ See `../examples/inventory-cache.md` for full implementation with error fallback

### 3. Create getBadges and getVisitorBadges utilities

- `getBadges`: filter cached inventory for `type === "BADGE"` and `status === "ACTIVE"`
- `getVisitorBadges`: extract badges from `visitor.inventoryItems`

→ See `../examples/badges.md` → "Server Utilities"

### 4. Create awardBadge utility

- Check if already owned (skip if so)
- Find badge in cached inventory by name
- Call `visitor.grantInventoryItem(badge, 1)`
- Fire toast (with `.catch(() => {})`)

→ See `../examples/award-badge.md` for full implementation

### 5. Wire into controller

Fetch ecosystem badges + visitor inventory in parallel. Call `awardBadge` from action handlers at milestones.

→ See `../examples/badges.md` → "Usage in Controllers"

### 6. Client types and context

Add `BadgeType`, `VisitorInventoryType` to types. Update reducer.

### 7. Build badges UI

Display all badges: owned in color, unowned with `grayscale(1)` filter. Use tooltip for names.

→ See `../examples/badges.md` → "UI Display with Tabs"

## Common Mistakes

- **Duplicate badge awards**: Always check `visitorInventory.badges[badgeName]` before granting.
- **Not using cache**: `ecosystem.fetchInventoryItems()` on every request is slow. Use 24h cache.
- **Wrong type filter**: Filter `type === "BADGE"` and `status === "ACTIVE"`. Other types: DECORATION, SEED, etc.
- **Blocking on toast**: Use `.catch(() => {})` to prevent toast failures from blocking the award.
