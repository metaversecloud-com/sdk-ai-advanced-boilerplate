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

## Recommended Claude Code Skills

These are installable [skills.sh](https://skills.sh) skills that complement the runbooks above. If you don't have them, install with `npx skills add <package>`.

| Skill | Install | Why |
|-------|---------|-----|
| **systematic-debugging** | `npx skills add @anthropic/systematic-debugging` | Structured debugging methodology. Complements `debug-sdk` for tracing SDK calls, server errors, and credential flow issues. |
| **writing-plans** | `npx skills add @anthropic/writing-plans` | Plan multi-step implementations before writing code. Essential when following the 7-phase guide or composed skills like add-leaderboard. |
| **brainstorming** | `npx skills add @anthropic/brainstorming` | Explore intent, requirements, and design before implementation. Use before any creative work — new features, components, or behavior changes. |
| **webapp-testing** | `npx skills add @anthropic/webapp-testing` | Test the running app with Playwright (`:3001`/`:3000`). Complements the Jest + supertest server tests with frontend verification. |
| **frontend-design** | `npx skills add @anthropic/frontend-design` | Build polished React components. Use alongside the SDK CSS classes in `.ai/style-guide.md` for UI work. |
| **mermaid-diagrams** | `npx skills add @anthropic/mermaid-diagrams` | Generate architecture, sequence, and flow diagrams. Useful for documenting SDK call chains, data object flows, and app structure. |
| **skill-creator** | `npx skills add @anthropic/skill-creator` | Create new reusable skills. Use when you build a novel pattern worth sharing back to the [boilerplate repo](https://github.com/metaversecloud-com/sdk-ai-advanced-boilerplate) (see `CLAUDE.md` → Contribute Back). |
