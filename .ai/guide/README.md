# Topia SDK Implementation Guide

A phased guide for building interactive Topia SDK apps, extracted from patterns across 12 production applications.

## How to Use This Guide

Work through the phases in order. Each phase builds on the previous one, introducing a new layer of SDK functionality. You do not need every phase for every app -- skip phases that are not relevant to your use case, but always start with Phase 1.

Before starting, ensure you have read:
- `../rules.md` -- base development rules
- `../style-guide.md` -- CSS class reference
- `../apps/sdk-reference.md` -- complete SDK API reference

## Phases

| Phase | File | Description | Key Examples Referenced |
|-------|------|-------------|----------------------|
| 1 | [01-boilerplate-setup.md](./01-boilerplate-setup.md) | Project scaffolding, SDK init, env vars, credentials flow, health check | Boilerplate structure |
| 2 | [02-core-game-logic.md](./02-core-game-logic.md) | Controllers, routes, key asset pattern, dropped asset CRUD | `handleDropAssets.md`, `handleUpdateDroppedAsset.md`, `handleRemoveDroppedAsset.md`, `handleGetConfiguration.md` |
| 3 | [03-data-objects.md](./03-data-objects.md) | Data object init pattern, locking, visitor/world data, dot-notation updates | `handleGetConfiguration.md`, `handleResetGameState.md` |
| 4 | [04-leaderboard.md](./04-leaderboard.md) | Pipe-delimited storage, sorting strategies, key asset leaderboards | `leaderboard.md` |
| 5 | [05-analytics.md](./05-analytics.md) | AnalyticType, tracking events via data object methods | `handleResetGameState.md`, `leaderboard.md` |
| 6 | [06-badges-achievements.md](./06-badges-achievements.md) | Badge system, inventory cache, awarding badges, expressions | `badges.md`, `inventoryCache.md`, `awardBadge.md` |
| 7 | [07-polish.md](./07-polish.md) | Particle effects, sound, toasts, iframe control, teleport | `handleRemoveDroppedAsset.md` |

Additionally, use the **Decision Tree** to quickly find the right pattern for your use case:

| File | Purpose |
|------|---------|
| [decision-tree.md](./decision-tree.md) | "I want to do X" -- lookup table mapping goals to phases and examples |

## Quick Reference: SDK Factories

All factories are initialized once in `server/utils/topiaInit.ts`:

| Factory | Primary Use |
|---------|------------|
| `Asset` | Create asset templates for dropping |
| `DroppedAsset` | Manage assets placed in worlds |
| `Ecosystem` | Access ecosystem-level inventory (badges, items) |
| `Scene` | Manage scenes within worlds |
| `User` | Cross-player data access, inventory |
| `Visitor` | Current player actions, toasts, teleport, badges |
| `World` | World-level data, asset queries, particle effects |

## Quick Reference: Data Flow

```
Client UI
  --> backendAPI.ts (axios interceptor, attaches credentials)
    --> Express route (server/routes.ts)
      --> Controller (server/controllers/)
        --> SDK factory methods
          --> Topia API
```

All SDK calls happen server-side. Never import `@rtsdk/topia` in client code.
