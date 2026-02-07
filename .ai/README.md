# SDK Apps AI Documentation

Master navigation hub for all AI assistant documentation for building Topia SDK applications.

## Quick Start

| Task | Start Here |
|------|-----------|
| **Building a new app** | `checklists/new-app.md` → `templates/prd/` → `guide/` |
| **Adding a feature** | `checklists/new-feature.md` → `skills/README.md` → `guide/decision-tree.md` |
| **Step-by-step runbook** | `skills/README.md` — task-to-skill lookup table |
| **Looking up a pattern** | `guide/decision-tree.md` → `examples/README.md` |
| **Pre-deploy check** | `checklists/pre-deploy.md` |
| **SDK API reference** | `apps/sdk-reference.md` |
| **Styling components** | `style-guide.md` |

## Directory Structure

```
.ai/
├── README.md                    ← You are here
├── rules.md                     Base development rules
├── style-guide.md               SDK CSS classes & component styling
│
├── guide/                       Implementation guide (7 phases)
│   ├── README.md                Phase index & SDK factory reference
│   ├── 01-boilerplate-setup.md  Project scaffolding, SDK init, credentials
│   ├── 02-core-game-logic.md    Controllers, routes, asset management
│   ├── 03-data-objects.md       Data objects, locking, visitor tracking
│   ├── 04-leaderboard.md        Leaderboard implementation
│   ├── 05-analytics.md          Analytics integration
│   ├── 06-badges-achievements.md Badge system, inventory, expressions
│   ├── 07-polish.md             Particles, sound, toasts, teleport
│   └── decision-tree.md         "I want to do X" → pattern lookup
│
├── templates/
│   ├── prd/                     PRD template (create before coding)
│   │   ├── README.md            PRD instructions
│   │   ├── overview.md          App concept template
│   │   ├── user-flows.md        User journey template
│   │   ├── data-models.md       Data object schema template
│   │   ├── api-endpoints.md     Route contract template
│   │   └── ui-screens.md        Screen inventory template
│   ├── controller.md            Server controller template
│   ├── data-object-schema.md    Data object design template
│   ├── component.tsx            React component template
│   ├── plan.md                  Implementation plan template
│   ├── workflow.md              Workflow steps & deliverable format
│   └── prompts.md               Ideal prompts for SDK features
│
├── skills/                      Step-by-step runbooks (11 files)
│   ├── README.md                Task-to-skill lookup table
│   ├── add-route.md             Add server route + controller
│   ├── add-component.md         Add client page or component
│   ├── add-data-object.md       Design and implement data object
│   ├── add-leaderboard.md       Implement leaderboard (composes foundations)
│   ├── add-badges.md            Implement badges/achievements
│   ├── add-game-mechanic.md     Add XP, cooldowns, streaks
│   ├── add-analytics.md         Add analytics tracking
│   ├── add-admin-feature.md     Add admin-only functionality
│   ├── write-tests.md           Add test coverage for a route
│   └── debug-sdk.md             Troubleshoot common SDK issues
│
├── examples/                    34 copy-paste code examples
│   ├── README.md                Categorized index
│   │   # Asset Management (7)
│   ├── drop-asset.md
│   ├── update-asset.md
│   ├── remove-asset.md
│   ├── remove-assets-bulk.md
│   ├── get-anchor-assets.md
│   ├── relocate-asset.md
│   ├── spawn-interactive-asset.md
│   │   # Data & Configuration (4)
│   ├── get-configuration.md
│   ├── reset-game-state.md
│   ├── data-object-init.md
│   ├── cross-visitor-data.md
│   │   # Badges & Inventory (4)
│   ├── badges.md
│   ├── award-badge.md
│   ├── inventory-cache.md
│   ├── grant-expression.md
│   │   # Leaderboard (1)
│   ├── leaderboard.md
│   │   # Visitor Actions (5)
│   ├── teleport-visitor.md
│   ├── open-close-iframe.md
│   ├── fire-toast.md
│   ├── particle-effects.md
│   ├── sound-effects.md
│   │   # Game Mechanics (5)
│   ├── xp-leveling.md
│   ├── action-cooldowns.md
│   ├── daily-limits-streaks.md
│   ├── probability-rewards.md
│   ├── vote-reversal.md
│   │   # World Management (3)
│   ├── scene-switching.md
│   ├── webhook-zone-trigger.md
│   ├── world-activity-trigger.md
│   │   # Security & Patterns (5)
│   ├── admin-permission-guard.md
│   ├── input-sanitization.md
│   ├── locking-strategies.md
│   ├── owner-vs-viewer.md
│   └── real-time-sse-redis.md
│
├── checklists/
│   ├── new-app.md               Starting a new SDK app
│   ├── new-feature.md           Adding to existing app
│   └── pre-deploy.md            Shipping checklist
│
└── apps/                        Production app documentation (13 files)
    ├── sdk-reference.md         Complete SDK API reference
    ├── sdk-grow-together.md     Gardening game (High quality)
    ├── virtual-pet.md           Tamagotchi-style pet (High)
    ├── sdk-scavenger-hunt.md    Clue-finding + challenge (High)
    ├── sdk-race.md              Multiplayer racing (Medium-High)
    ├── sdk-quiz.md              Timed quiz race (Medium-High)
    ├── sdk-quest.md             Daily item collection (Medium-High)
    ├── sdk-bulletin-board.md    Community bulletin board (Medium-High)
    ├── sdk-leaderboard.md       Universal leaderboard (Medium-High)
    ├── sdk-poll.md              In-world voting (Medium)
    ├── scene-swapper.md         Scene management (Medium)
    ├── sdk-stride-check-in.md   School check-in (Medium)
    └── sdk-trivia.md            Boilerplate clone (Low)
```

## RPG Relevance Ranking

For building the Lunch Swap RPG, prioritize these production apps:

1. **sdk-grow-together** — Full inventory/economy, XP/leveling, social mechanics, tool system
2. **virtual-pet** — XP/leveling, cooldowns, pet spawning, owner vs viewer detection
3. **sdk-scavenger-hunt** — Badge achievements, cross-world progress, dynamic spawning
4. **sdk-quest** — Daily limits, streaks, tiered badges, item relocation
5. **sdk-race** — Real-time SSE/Redis, sequential checkpoints, scene switching
6. **sdk-quiz** — Zone-based triggers, timed challenges
7. **sdk-bulletin-board** — Approval workflows, S3 uploads, anchor placement
8. **sdk-leaderboard** — Cross-app JWT data, EcosystemFactory
