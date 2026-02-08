> **Part of**: [@topia/multiplayer Implementation Plan](./2026-02-07-multiplayer-00-overview.md)
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 4: Physics + External Release

> Open up to third-party game developers with physics support, scaffolding CLI, docs, and npm publish.

### Task 29: PhysicsWorld (Matter.js Integration)

**Files:**
- Create: `packages/multiplayer/src/game/PhysicsWorld.ts`
- Create: `packages/multiplayer/tests/game/PhysicsWorld.test.ts`

Wrap Matter.js as an optional physics engine. The `PhysicsWorld` syncs entity positions with physics bodies automatically — developers set forces/velocity, physics resolves collisions, entity schema fields update.

```typescript
const physics = PhysicsWorld.create({ engine: 'matter', gravity: { x: 0, y: 0 } });
```

**Commit message:** `feat(multiplayer): add PhysicsWorld with Matter.js integration`

---

### Task 30: Physics Interpolation Mode

**Files:**
- Modify: `packages/multiplayer/src/client/Interpolator.ts`
- Create: `packages/multiplayer/tests/client/Interpolator.physics.test.ts`

Add `interpolate: 'physics'` mode that uses velocity + acceleration for extrapolation between server updates. Better for physics games where objects have momentum.

**Commit message:** `feat(multiplayer): add physics extrapolation interpolation mode`

---

### Task 31: Third Physics Game Example

**Files:**
- Create: `packages/multiplayer/examples/bumper-balls/`

A physics-based game: bumper balls in an arena. Players control a ball, apply thrust, bounce off walls and each other. Validates physics interpolation and Matter.js integration.

**Commit message:** `feat(multiplayer): add Bumper Balls physics game example`

---

### Task 32: CLI Scaffolding Tool

**Files:**
- Create: `packages/create-topia-game/`

`npx create-topia-game` interactive scaffolding:
1. Game name
2. Game type (continuous / grid / physics)
3. Max players
4. Bot support (y/n)
5. Topia hooks (leaderboard / badges / none)

Generates a project from templates with the right configuration.

**Commit message:** `feat(create-topia-game): add interactive scaffolding CLI`

---

### Task 33: Documentation Site

**Files:**
- Create: `packages/multiplayer/docs/`

Markdown docs (publishable via Docusaurus or similar):
- Getting Started (5 minutes to first game)
- API Reference (TopiaGame, Entity, TopiaClient, BotBehavior)
- Guides per game type (continuous, grid, physics, racing)
- Architecture deep-dive (three layers, Redis scaling)
- Migration from Lance.gg

**Commit message:** `docs(multiplayer): add documentation site with guides and API reference`

---

### Task 34: npm Publish + CI

**Files:**
- Create: `.github/workflows/multiplayer-ci.yml`
- Create: `.github/workflows/multiplayer-publish.yml`

CI pipeline:
- Lint + type-check
- Unit tests
- Integration tests (with Redis service container)
- Build check
- npm publish on tag (scoped to `@topia/multiplayer`)

**Commit message:** `ci(multiplayer): add CI/CD pipeline with npm publish`

---

