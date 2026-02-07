---
name: Add Analytics
description: Add analytics tracking to data object writes. Use when you need to track user actions like completions, starts, or item collections for reporting.
---

# Add Analytics Tracking

> **Prerequisites**: At least one data object write in your controllers

## Inputs Needed

- [ ] **Event name**: e.g., `"completions"`, `"itemCollected"`, `"gameStarted"`
- [ ] **Per-visitor or global?**
- [ ] **Which data write to piggyback on?**

## Steps

### 1. Design the analytics event

Analytics payload fields:

| Field | Purpose | When to Include |
|-------|---------|-----------------|
| `analyticName` | Event identifier | Always |
| `profileId` | Associates with visitor | Per-visitor events |
| `uniqueKey` | Deduplication | Prevent double-counting |
| `urlSlug` | Associates with world | Multi-world apps |
| `incrementBy` | Accumulate value | XP earned, items collected |

→ See `../guide/05-analytics.md`

### 2. Attach to data object write

Add `analytics` as second argument to any data object method:

```ts
await entity.updateDataObject(
  { [`leaderboard.${profileId}`]: resultString },
  {
    analytics: [{
      analyticName: "completions",
      profileId,
      uniqueKey: profileId,
      urlSlug,
    }],
  },
);
```

Works with `updateDataObject`, `setDataObject`, and `incrementDataObjectValue`.

For tracking without a data change: `await entity.updateDataObject({}, { analytics: [...] });`

### 3. Verify in test

Assert the analytics payload is passed to the SDK method call.

→ See `./write-tests.md` for test patterns

## Common Mistakes

- **Separate SDK call for analytics**: Analytics piggyback on data object methods. No standalone call needed.
- **Missing `uniqueKey`**: Same action may be counted multiple times without it.
- **Wrong casing**: Use consistent camelCase for `analyticName` across the app.
