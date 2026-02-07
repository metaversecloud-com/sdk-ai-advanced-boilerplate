---
name: Add Game Mechanic
description: Add XP/leveling, action cooldowns, daily limits, or streak tracking to visitor data. Use when implementing progression, pacing, or engagement mechanics.
---

# Add a Game Mechanic (XP, Cooldowns, Streaks)

> **Prerequisites**: [add-data-object](./add-data-object.md), [add-route](./add-route.md)

## Inputs Needed

- [ ] **Mechanic type**: XP/leveling, cooldowns, daily limits, streaks, or combination?
- [ ] **For XP**: Fixed thresholds or quadratic curve? Max level? XP per action?
- [ ] **For cooldowns**: Which actions? Duration per action?
- [ ] **For daily limits**: Max per day? Reset at midnight UTC?
- [ ] **For streaks**: What counts as "streak day"? Milestone rewards?
- [ ] **Side effects**: Toast on level up? Particle? Badge at milestone?

## Steps

### 1. Design visitor data schema

All mechanics store on the visitor data object:

**XP**: `{ totalXp: number; level: number }`
**Cooldowns**: `{ cooldowns: { [action]: number } }` (timestamps)
**Daily + Streaks**: `{ daily: { lastActionDate, actionsToday, dailyLimit }, streak: { currentStreak, longestStreak, lastStreakDate } }`

→ See `./add-data-object.md` for init pattern

### 2. Create server utility

Pick the mechanic(s):

**2A — XP/Leveling**: Create `grantXp.ts`. Define level thresholds, detect level-up by comparing before/after, fire side effects on level-up with `.catch()`.

→ See `../examples/xp-leveling.md` — full implementation with both curve types, level-up detection, and badge milestones

**2B — Cooldowns**: Create `checkCooldown.ts`. Define durations per action. Return `{ onCooldown, remainingMs, remainingFormatted }`. Controller returns 403 with remaining time if on cooldown.

→ See `../examples/action-cooldowns.md` — full implementation with config, validation, and client timer hook

**2C — Daily Limits + Streaks**: Create `handleDailyAction.ts`. Use UTC date comparison (`isSameDay`, `isConsecutiveDay`). Reset count on new day, extend or reset streak.

→ See `../examples/daily-limits-streaks.md` — full implementation with date utilities and streak logic

### 3. Create controller

Wire utility into a controller. Return 403 for limit/cooldown rejections. Register route.

→ See `./add-route.md`

### 4. Add analytics

Piggyback on `updateDataObject` calls.

→ See `./add-analytics.md`

### 5. Client types and state

Add mechanic-specific types to context. Update reducer.

### 6. Build UI

- **XP**: Progress bar + level display
- **Cooldowns**: Disabled button with countdown timer
- **Daily**: Progress toward daily limit + streak counter

→ See examples referenced in Step 2 for component code

## Common Mistakes

- **XP — Not storing level alongside XP**: Persist both. Don't recalculate on every request.
- **XP — Blocking on side effects**: `.catch()` on particles/toasts/badges to avoid blocking response.
- **Cooldowns — Client-only enforcement**: Server MUST validate timestamps. Client timers are display-only.
- **Cooldowns — `setDataObject` for single timestamp**: Use `updateDataObject` with `cooldowns.feed` dot-notation.
- **Daily — Local time instead of UTC**: Always use UTC for day comparisons.
- **Streaks — Counting multiple times per day**: Guard with `isSameDay(lastStreakDate, now)`.
