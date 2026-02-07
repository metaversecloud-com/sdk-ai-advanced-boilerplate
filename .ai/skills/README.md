---
name: Skills Index
description: Task-to-skill lookup table for Topia SDK app development. Use when deciding which skill to follow for a given task.
---

# Skills: Step-by-Step Runbooks

> **Skills vs Examples**: Examples show _what_ the code looks like. Skills tell you _how to build it_ end-to-end.

## Task-to-Skill Lookup

| I want to... | Skill | Difficulty | Prerequisites |
|--------------|-------|------------|---------------|
| Add a new API endpoint | [add-route](./add-route.md) | Starter | None |
| Add a new page or UI component | [add-component](./add-component.md) | Starter | At least one route |
| Design and wire up a data object | [add-data-object](./add-data-object.md) | Starter | At least one route |
| Add a leaderboard | [add-leaderboard](./add-leaderboard.md) | Intermediate | add-route, add-component, add-data-object |
| Add badges or achievements | [add-badges](./add-badges.md) | Intermediate | add-route, add-component |
| Add XP, cooldowns, or streaks | [add-game-mechanic](./add-game-mechanic.md) | Intermediate | add-data-object |
| Add analytics tracking | [add-analytics](./add-analytics.md) | Starter | At least one data object write |
| Add admin-only functionality | [add-admin-feature](./add-admin-feature.md) | Starter | At least one route |
| Write tests for a route | [write-tests](./write-tests.md) | Starter | At least one route |
| Debug a failing SDK call | [debug-sdk](./debug-sdk.md) | Reference | None |

## Skill Hierarchy

```
Foundation (independent):
  add-route  ·  add-component  ·  add-data-object

Composed (build on foundations):
  add-leaderboard = route + data-object + component
  add-badges      = route + component + inventory cache
  add-game-mechanic = data-object + route

Self-contained:
  add-admin-feature  ·  add-analytics  ·  write-tests  ·  debug-sdk
```
