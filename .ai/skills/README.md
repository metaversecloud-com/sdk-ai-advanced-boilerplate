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

These are installable [skills.sh](https://skills.sh) skills that complement the runbooks above.

**Quick setup**: `bash scripts/setup-skills.sh` installs all recommended skills at once.

Or install individually with `npx skills add <package>`:

| Skill | Install | Why |
|-------|---------|-----|
| **systematic-debugging** | `npx skills add @anthropic/systematic-debugging` | Structured debugging methodology. Complements `debug-sdk` for tracing SDK calls, server errors, and credential flow issues. |
| **writing-plans** | `npx skills add @anthropic/writing-plans` | Plan multi-step implementations before writing code. Essential when following the 7-phase guide or composed skills like add-leaderboard. |
| **brainstorming** | `npx skills add @anthropic/brainstorming` | Explore intent, requirements, and design before implementation. Use before any creative work — new features, components, or behavior changes. |
| **webapp-testing** | `npx skills add @anthropic/webapp-testing` | Test the running app with Playwright (`:3001`/`:3000`). Complements the Jest + supertest server tests with frontend verification. |
| **frontend-design** | `npx skills add @anthropic/frontend-design` | Build polished React components. Use alongside the SDK CSS classes in `.ai/style-guide.md` for UI work. |
| **mermaid-diagrams** | `npx skills add @anthropic/mermaid-diagrams` | Generate architecture, sequence, and flow diagrams. Useful for documenting SDK call chains, data object flows, and app structure. |
| **skill-creator** | `npx skills add @anthropic/skill-creator` | Create new reusable skills. Use when you build a novel pattern worth sharing back to the [boilerplate repo](https://github.com/metaversecloud-com/sdk-ai-advanced-boilerplate) (see `CLAUDE.md` → Contribute Back). |
| **remembering-conversations** | `npx skills add @anthropic/remembering-conversations` | Recall past context across sessions. Use when resuming work, stuck on a problem, or referencing earlier decisions. |
| **web-design-guidelines** | `npx skills add @anthropic/web-design-guidelines` | Audit UI for accessibility, UX, and Web Interface Guidelines compliance. Complements `/frontend-design` with standards review. |
| **agent-browser** | `npx skills add @anthropic/agent-browser` | Interactive browser QA with ref-based selectors, network inspection, device emulation, and error monitoring. Complements `/webapp-testing` for development-time verification. |
| **theme-factory** | `npx skills add @anthropic/theme-factory` | Apply cohesive color palettes and font pairings. Use as a starting point before `/frontend-design` to establish a color foundation for game UI. |

## Animation & Video Skills

For in-app animations (celebrations, micro-interactions, feedback) and server-side video generation (canvas video assets).

### In-App Animation (client-side, inside the iframe)

Use CSS animations as the base layer (0 KB). Add a library only when you need richer motion:

| Library | Skill | Install | Best For | Bundle Cost |
|---------|-------|---------|----------|-------------|
| **Lottie** | `lottie-bodymovin` | `npx skills add dylantarre/animation-principles --skill lottie-bodymovin` | Designer-created animations: celebrations, achievement unlocks, onboarding. Huge free library on [LottieFiles](https://lottiefiles.com/). | ~30 KB (light) |
| **GSAP** | `gsap` | `npx skills add martinholovsky/claude-skills-generator --skill gsap` | Programmatic timelines, scroll-triggered effects, physics-based motion. Tiny core. | ~25 KB |
| **Framer Motion** | `motion` | `npx skills add jezweb/claude-skills --skill motion` | Declarative React animations, gestures, layout transitions, AnimatePresence. | ~45 KB |
| **Rive** | _(none — use `/skill-creator`)_ | — | Interactive state-driven animations at 60 FPS. WASM runtime is heavier. | ~150 KB |

> **Recommendation for this app**: CSS animations + Lottie covers most needs at minimal bundle cost. The iframe runs inside Topia's already resource-heavy metaverse — keep it lightweight.

### Server-Side Video Generation (canvas video assets)

Generate .mp4 videos server-side, then upload as Topia video assets that play on the canvas (NPC stories, environmental effects, spatially activated content).

| Tool | Skill | What It Does |
|------|-------|-------------|
| **Remotion** | `remotion-best-practices` (installed) | React components → .mp4 via `@remotion/renderer`. Runs server-side with headless Chrome + FFmpeg (bundled). No client bundle impact. |

> **Mux** is complementary, not a replacement — it hosts/delivers videos but cannot create them. Only needed if you add CDN/streaming later. Remotion produces the raw .mp4 that the SDK uploads as a video asset.

## 3D / Three.js Skills (Future Reference)

Not currently installed. Available at [skills.sh](https://skills.sh/cloudai-x/threejs-skills) for when a Three.js use case arises (3D elements, interactive objects, canvas-rendered assets).

| Skill | Install | Covers |
|-------|---------|--------|
| **threejs-fundamentals** | `claude skills add cloudai-x/threejs-skills/threejs-fundamentals` | Scene, cameras, renderer, math utilities, animation loops |
| **threejs-geometry** | `claude skills add cloudai-x/threejs-skills/threejs-geometry` | Geometry creation and manipulation |
| **threejs-materials** | `claude skills add cloudai-x/threejs-skills/threejs-materials` | Material types and properties |
| **threejs-lighting** | `claude skills add cloudai-x/threejs-skills/threejs-lighting` | Light types and shadows |
