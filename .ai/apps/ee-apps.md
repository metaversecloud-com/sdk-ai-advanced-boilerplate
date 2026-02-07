# EE Apps (Experience Engine)

**Repo**: `metaversecloud-com/ee-apps`
**Runtime**: Topia Experience Engine (NOT standard SDK)
**Quality**: High complexity, low documentation — 12+ production games with sophisticated game logic, but no tests and script-based architecture
**Last Analyzed**: 2026-02-07

## Important: Experience Engine vs SDK

EE apps are fundamentally different from SDK apps:

| | **SDK Apps** | **Experience Engine Apps** |
|--|------------|--------------------------|
| **Runtime** | Express + React (your server) | Topia game engine (script runtime) |
| **Latency** | HTTP request/response (~100ms+) | 60fps game loop (~16ms) |
| **UI** | Iframe drawers/modals | On-canvas sprites and text |
| **State** | Data objects + webhooks | In-memory via scriptManager |
| **Use case** | Session persistence, drawers, badges, leaderboards | Collision, physics, real-time gameplay |

**Best together**: Game Engine for low-latency gameplay + SDK for persistent state, UI drawers (inventory/stats), badges, leaderboards.

## What It Does

A collection of 12+ games built for Topia's Experience Engine: T_Pong, T_Platformer, T_BlockBreaker, GlitchLava, ElectricFence, CaptureTheFlag, TournamentManager, and more. Each game runs as SystemScript classes inside the engine runtime, using sprites, collision callbacks, and a shared phase management pattern.

### Games Included

- **T_Pong** — Team-based pong with multi-ball, camping detection, round system (~400 lines)
- **T_Platformer** — Side-scrolling platformer with obstacles and checkpoints
- **T_BlockBreaker** — Brick-breaking game with paddle and ball physics
- **GlitchLava** — Floor-is-lava survival with glitch zones
- **ElectricFence** — Avoid electric barriers while navigating
- **CaptureTheFlag** — Team-based flag capture with zones
- **TournamentManager** — Meta-system for running multi-round tournaments with lives and sudden death

## Architecture

```
ee-apps/
├── T_Pong/
│   ├── PongGameManager.js          Main game logic (~400 lines)
│   ├── PongConfig.js               Tunable constants (speeds, sizes, timers)
│   └── PongBallManager.js          Ball physics and collision
├── T_Platformer/
│   ├── PlatformerGameManager.js    Level management, obstacle spawning
│   └── PlatformerConfig.js         Level definitions
├── TournamentManager/
│   ├── TournamentScript.js         Round-robin bracket management
│   └── TournamentConfig.js         Lives, rounds, sudden death rules
├── shared/
│   ├── PhaseManager.js             LOBBY → COUNTDOWN → ACTIVE → GAME_OVER
│   ├── TextLayout.js               Text rendering (align/justify)
│   └── SpriteHelpers.js            Sprite layer management utilities
└── [other games]/
```

No Express, no React, no routes. Scripts run inside Topia's engine runtime.

## Core APIs (Experience Engine)

| API | Purpose |
|-----|---------|
| `scriptManager.getSystem()` | Access the game system instance |
| `PseudoSprite` | Create/manage on-canvas sprite objects |
| `PseudoList` | Ordered collection for game entities |
| `PseudoMap` | Key-value store for player state |
| `this.onCollision(callback)` | Register collision event handlers |
| `this.onUpdate(callback)` | Per-frame update loop (60fps) |
| `sprite.topAdjust` / `sprite.bottomAdjust` | Sprite layer ordering |

## Key Patterns

### 1. Phase Manager (UNIQUE — Reusable Across All EE Games)

Universal game state machine used by every game in the collection:

```js
// Shared phase progression
const PHASES = {
  LOBBY: "lobby",        // Waiting for players
  COUNTDOWN: "countdown", // 3-2-1 start sequence
  ACTIVE: "active",       // Game in progress
  GAME_OVER: "game_over", // Results display
};

class PhaseManager {
  transition(newPhase) {
    this.phase = newPhase;
    this.phaseStartTime = Date.now();
    this.onPhaseChange(newPhase);
  }

  update() {
    if (this.phase === PHASES.COUNTDOWN && this.elapsed() > 3000) {
      this.transition(PHASES.ACTIVE);
    }
    if (this.phase === PHASES.ACTIVE && this.elapsed() > this.config.timeLimit) {
      this.transition(PHASES.GAME_OVER);
    }
  }
}
```

### 2. Sprite Layer Management

Controls visual stacking via topAdjust/bottomAdjust — critical for games with overlapping elements:

```js
// Ensure ball renders above paddles, paddles above background
ball.topAdjust = 10;
paddle.topAdjust = 5;
background.bottomAdjust = -10;

// Dynamic layer changes (e.g., power-up highlight)
sprite.topAdjust = isActive ? 15 : 5;
```

### 3. Collision-Based Gameplay Callbacks

All game interactions driven by collision detection rather than HTTP:

```js
this.onCollision("ball", "paddle", (ball, paddle) => {
  const hitPosition = (ball.y - paddle.y) / paddle.height;
  ball.velocityX *= -1;
  ball.velocityY = hitPosition * MAX_BOUNCE_ANGLE;
});

this.onCollision("player", "flag", (player, flag) => {
  if (player.team !== flag.team) {
    this.scoreCapture(player);
  }
});
```

### 4. Tournament Round System with Lives and Sudden Death

TournamentManager orchestrates multi-round competitive play across any game type:

```js
class TournamentScript {
  startRound() {
    this.roundNumber++;
    this.activePlayers = this.players.filter(p => p.lives > 0);

    if (this.activePlayers.length <= 1) {
      return this.declareWinner(this.activePlayers[0]);
    }

    if (this.roundNumber > this.config.suddenDeathRound) {
      this.enableSuddenDeath(); // Shrinking arena, faster speeds
    }

    this.gameManager.start(this.activePlayers);
  }

  onGameEnd(results) {
    const loser = results.lastPlace;
    loser.lives--;
    this.startRound();
  }
}
```

### 5. Config Systems as Separate Scripts

Every game externalizes tunable values for easy balancing:

```js
// PongConfig.js
export default {
  BALL_SPEED: 4,
  PADDLE_SPEED: 3,
  MAX_BALLS: 3,
  CAMPING_THRESHOLD_MS: 5000,  // Anti-camping timer
  ROUND_TIME_LIMIT: 60000,
  TEAM_SIZE: 2,
  SCORE_TO_WIN: 5,
};
```

### 6. PongGameManager — Team and Camping Detection

Most complex single game manager. Detects when players hold the ball too long ("camping"):

```js
// Anti-camping: if ball stays near one paddle too long, speed it up
if (Date.now() - this.lastPaddleHit > config.CAMPING_THRESHOLD_MS) {
  ball.velocityX *= 1.5; // Force ball away from camper
  this.showWarning(campingPlayer, "Keep it moving!");
}
```

### 7. Text Layout Components

Shared text rendering with alignment and justification for scoreboards and UI:

```js
class TextLayout {
  render(text, options = {}) {
    const { align = "center", justify = "middle", fontSize = 16 } = options;
    const sprite = new PseudoSprite("text");
    sprite.text = text;
    sprite.fontSize = fontSize;
    // Calculate position based on align/justify within bounding box
    sprite.x = this.calculateX(align, sprite.width);
    sprite.y = this.calculateY(justify, sprite.height);
    return sprite;
  }
}
```

## Relevance by Game Type

| Game Type | Applicable Patterns |
|-----------|-------------------|
| **Real-Time Competitive** | Phase manager, collision callbacks, anti-camping |
| **Racing / Platformer** | Per-frame update loop, obstacle spawning, checkpoint tracking |
| **Tournament / Bracket** | TournamentManager with lives, sudden death, round progression |
| **Team-Based** | Team assignment, team scoring, flag capture patterns |
| **Puzzle / Block** | Sprite grid management, layer ordering, brick destruction |
| **Any EE game** | Phase manager, config externalization, sprite layer management |

## Weaknesses

- No tests of any kind
- Script-based paradigm is completely different from SDK apps — limited portability
- Minimal inline documentation
- No TypeScript — all plain JavaScript
- Game state is entirely in-memory (no persistence across restarts)
- Hard to debug outside the Topia engine runtime

## Unique Examples Worth Extracting

1. **Phase Manager Pattern** — LOBBY/COUNTDOWN/ACTIVE/GAME_OVER state machine. Universal for any game with rounds.
2. **Tournament System** — Multi-round bracket with lives, elimination, and sudden death. Reusable meta-system.
3. **Config Externalization** — Separate config scripts for game balancing. Simple but effective pattern.
4. **Collision-Based Game Design** — Designing all interactions around collision callbacks rather than HTTP/webhooks.
