# SDK App Analysis Tracker

Track when each app in the `metaversecloud-com` GitHub org was last analyzed. Use this to routinely scan for updates, additions, and changes — and pull new examples, patterns, templates, and skills into this boilerplate.

## How to Use

1. **Periodic scan**: Every few days, check repos with `gh api repos/metaversecloud-com/{repo}/commits?per_page=1` to see if there are commits newer than `last_analyzed`.
2. **Re-analyze**: If a repo has new commits, clone/fetch it and update the corresponding `.ai/apps/{name}.md` file. Update `last_analyzed` and `last_commit` here.
3. **New repos**: When a new SDK app appears in the org, add it to the "Not Yet Analyzed" section, then analyze and promote it.

## Analyzed Apps

Apps that have a detailed analysis file in `.ai/apps/`.

| Repo | Analysis File | SDK Version | Last Analyzed | Last Commit Checked | Priority for Re-analysis |
|------|--------------|-------------|---------------|--------------------|-----------------------|
| `sdk-grow-together` | `sdk-grow-together.md` | `^0.19.4` | 2025-05-01 | — | Low (recent SDK) |
| `sdk-scavenger-hunt` | `sdk-scavenger-hunt.md` | `^0.19.4` | 2025-05-01 | — | Low (recent SDK) |
| `sdk-quest` | `sdk-quest.md` | `^0.19.4` | 2025-05-01 | — | Low (recent SDK) |
| `sdk-race` | `sdk-race.md` | `^0.19.3` | 2025-05-01 | — | Low (recent SDK) |
| `sdk-quiz` | `sdk-quiz.md` | `^0.19.3` | 2025-05-01 | — | Low (recent SDK) |
| `sdk-bulletin-board-app` | `sdk-bulletin-board.md` | `^0.15.8` | 2025-05-01 | — | Medium (older SDK) |
| `sdk-leaderboard` | `sdk-leaderboard.md` | `^0.17.3` | 2025-05-01 | — | Medium (older SDK) |
| `sdk-poll` | `sdk-poll.md` | `^0.15.8` | 2025-05-01 | — | Medium (older SDK) |
| `scene-swapper` | `scene-swapper.md` | — | 2025-05-01 | — | Medium |
| `sdk-stride-check-in` | `sdk-stride-check-in.md` | `^0.15.8` | 2025-05-01 | — | Medium (older SDK) |
| `virtual-pet` | `virtual-pet.md` | `^0.15.9` | 2025-05-01 | — | Medium (older SDK) |
| `sdk-trivia` | `sdk-trivia.md` | `^0.17.3` | 2025-05-01 | — | Low (boilerplate clone) |

> **Note**: `last_analyzed` dates of 2025-05-01 are approximate — these analyses were created during the initial boilerplate build. Exact dates are not known.

## Not Yet Analyzed — High Priority

New apps with unique patterns not covered by existing analyses. Analyze these first.

| Repo | Description | SDK Version | Unique Patterns | Status |
|------|------------|-------------|-----------------|--------|
| `ee-apps` | Experience Engine apps | `@rtsdk/topia-tools@^0.1.0` | New architecture, physics/collision, `topia dev` CLI | Not started |
| `connect4` | On-canvas Connect 4 game | `^0.15.9` | On-canvas gameplay, dynamic asset board, `node-cron`, `express-queue` | Not started |
| `sdk-chess-game` | Chess with game engine | `^0.15.8` | `chess.js` integration, Redis state, controller subdirectories | Not started |
| `sdk-wiggle` | Real-time multiplayer snake | `^0.15.8` | `lance-gg` + `@rtsdk/lance-topia`, Socket.io, physics multiplayer | Not started |
| `sdk-build-an-asset` | Asset customization builder | `^0.18.3` | `jimp` image composition, S3 storage, asset claiming/ownership | Not started |
| `jukebox` | YouTube music jukebox | `^0.15.8` | `@googleapis/youtube`, Redis, `updateBroadcast`/`updateMediaType`/`updateUploadedMediaSelected` | Not started |
| `sdk-cms` | Content management system | `^0.17.4` | `link-preview-js`, asset search, content list CRUD | Not started |
| `breakout` | Speed networking breakouts | — | Group assignment, timed session rotation, visitor grouping | Not started |
| `sdk-tictactoe` | On-canvas TicTacToe | `^0.15.8` | On-canvas board game (simpler than Connect4), `node-cron` | Not started |
| `sdk-npc-voice-session` | NPC voice interaction | `^0.17.7` | Voice session management, NPC patterns (early stage) | Not started |

## Not Yet Analyzed — Medium Priority

Interesting but more niche. Analyze after high-priority apps.

| Repo | Description | Unique Patterns | Status |
|------|------------|-----------------|--------|
| `sdk-emote-unlock` | Emote/expression unlocking | Dedicated emote workflow, `ngrok` dev pattern | Not started |
| `sdk-toast-notifications` | Scheduled toast system | `node-cron` scheduled tasks, `luxon` datetime | Not started |
| `sdk-skill-sprint` | Skill-based sprint game | May have skill progression patterns | Not started |
| `ai-npc-demo` | AI NPC demo | AI character integration, multi-client architecture | Not started |
| `breakout` | Speed networking | Group management, timed sessions | Not started |
| `airtable` | Airtable integration | External service sync (very old SDK `^0.8.5`) | Not started |

## Not Relevant / Low Priority

Repos that are not SDK apps, are archived, use non-JS SDKs, or provide minimal learning value.

| Category | Repos |
|----------|-------|
| **SDKs & boilerplates** | `mc-sdk-js`, `mc-sdk-csharp`, `sdk-ai-boilerplate`, `sdk-ai-advanced-boilerplate`, `sdk-ts-boilerplate`, `sdk-boilerplate`, `sdk-rt-boilerplate`, `sdk-template`, `sdk-examples`, `sdk-styles`, `rtsdk-components` |
| **Infrastructure** | `infra-terrkube`, `infra-terraform`, `infra-cloud-formation`, `heroku-nginx` |
| **Unity** | `com.metaversecloud.unity`, `avatar-builder-unity` |
| **C# apps** | `sdk-paddle-battle`, `sdk-tenis` |
| **Archived** | `scene-manager-archive`, `sdk-calendarOLD`, `sdk-scavenger-huntOLD`, `topia-activity-apps`, `quest`, `jukebox-archived`, `sdk-bluejens` |
| **Very old / minimal** | `sdk-pong`, `sdk-collaborative-puzzle`, `sdk-move-select-visitors`, `sdk-checkin`, `sdk-calendar`, `sdk-bluejeans`, `inworld-npc-demo`, `multiplayer-games`, `multiplayer-iframe-game-example`, `soccer-hotshot`, `Soccer`, `Engine-Sharks-Minnows`, `math-capture`, `skyfall` |
| **Non-SDK** | `Topia-Documentation`, `lance`, `Llangchain-Llama2-Template`, `nautical-math-adventure`, `mc-sdk-local-testing` |
| **Codex experiments** | `*-codex` repos, `sushi-smash-codex` |
| **Other** | `lunch-swap` (our app), `jpl_test`, `sdk-topia-activity-apps`, `sdk-bounty-builders-poc` |

## Scan Log

Record each scan here for audit trail.

| Date | Scanned By | Repos Checked | New Commits Found | Actions Taken |
|------|-----------|---------------|-------------------|---------------|
| 2026-02-07 | Claude Opus 4.6 | All 83 org repos | Initial scan | Created tracker, identified 10 high-priority new repos |
