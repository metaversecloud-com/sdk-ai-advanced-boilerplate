# @topia/multiplayer Framework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable, horizontally-scalable multiplayer framework for Topia iframe minigames that provides server-authoritative game loops, client-side interpolation/prediction, and native Topia SDK integration — letting any new iframe minigame get smooth multiplayer "for free."

**Architecture:** Three-layer design — Layer 1 (Colyseus transport + rooms + Redis scaling), Layer 2 (Game Abstractions: entities, interpolation, prediction, input, AI bots, spectators), Layer 3 (Topia Integration: credential auth from iframe params, auto room-per-sceneDropId, async SDK hooks for persistence). The framework is a standalone npm package (`@topia/multiplayer`) consumed by Topia SDK apps.

**Tech Stack:** TypeScript, Colyseus 0.15+, Socket.io (via Colyseus transport), Redis (optional, for horizontal scaling), Matter.js (optional, Phase 4 physics), Vite (client bundling), Jest + supertest (testing).

---

## Table of Contents

- [Phase 1: Core Loop (Wiggle Rewrite)](./2026-02-07-multiplayer-01-core-loop.md) — Tasks 1–12
- [Phase 2: Bots + Spectators + Polish](./2026-02-07-multiplayer-02-bots-spectators.md) — Tasks 13–20
- [Phase 3: Scaling + Second Game](./2026-02-07-multiplayer-03-scaling.md) — Tasks 21–28
- [Phase 4: Physics + External Release](./2026-02-07-multiplayer-04-physics-release.md) — Tasks 29–34
- [Appendix: Key Design Decisions + Risk Register](./2026-02-07-multiplayer-appendix.md)

---

## Package Structure

The framework lives in a new `packages/multiplayer/` directory at the repo root (npm workspace). Games consume it as `@topia/multiplayer` (server) and `@topia/multiplayer/client` (client).

```
packages/multiplayer/
├── package.json                    # @topia/multiplayer
├── tsconfig.json
├── src/
│   ├── index.ts                    # Server exports
│   ├── client.ts                   # Client exports (separate entry)
│   │
│   ├── core/                       # Layer 1: Colyseus wrapper
│   │   ├── TopiaGameServer.ts      # Colyseus Server + Express mount
│   │   ├── TopiaRoom.ts            # Colyseus Room subclass with Topia hooks
│   │   └── transport.ts            # Socket.io transport config
│   │
│   ├── game/                       # Layer 2: Game abstractions
│   │   ├── TopiaGame.ts            # TopiaGame.define() factory
│   │   ├── Entity.ts               # Base entity with @schema decorators
│   │   ├── schema.ts               # Decorator implementation
│   │   ├── InputHandler.ts         # Input batching + sequence numbering
│   │   ├── BotBehavior.ts          # Bot AI base class
│   │   └── types.ts                # Shared types
│   │
│   ├── client/                     # Layer 2: Client-side
│   │   ├── TopiaClient.ts          # Client connection + render loop
│   │   ├── Interpolator.ts         # Snapshot buffer + interpolation math
│   │   ├── Predictor.ts            # Local player prediction + reconciliation
│   │   └── InputSender.ts          # Client input packaging
│   │
│   ├── topia/                      # Layer 3: Topia integration
│   │   ├── TopiaCredentials.ts     # Extract + validate iframe params
│   │   ├── TopiaSDKBridge.ts       # Pre-initialized SDK instances
│   │   ├── DeferQueue.ts           # Async SDK call queue (non-blocking)
│   │   └── RoomNaming.ts           # sceneDropId → room ID mapping
│   │
│   └── testing/                    # Test utilities
│       └── TestRoom.ts             # Synchronous room for unit tests
│
├── tests/
│   ├── core/
│   │   ├── TopiaGameServer.test.ts
│   │   └── TopiaRoom.test.ts
│   ├── game/
│   │   ├── Entity.test.ts
│   │   ├── schema.test.ts
│   │   ├── TopiaGame.test.ts
│   │   ├── BotBehavior.test.ts
│   │   └── InputHandler.test.ts
│   ├── client/
│   │   ├── Interpolator.test.ts
│   │   ├── Predictor.test.ts
│   │   └── TopiaClient.test.ts
│   ├── topia/
│   │   ├── TopiaCredentials.test.ts
│   │   ├── DeferQueue.test.ts
│   │   └── RoomNaming.test.ts
│   └── testing/
│       └── TestRoom.test.ts
│
└── examples/
    └── wiggle/                     # Wiggle rewrite using the framework
        ├── server/
        │   ├── wiggle-game.ts      # TopiaGame.define() for Wiggle
        │   ├── entities/
        │   │   ├── SnakeEntity.ts
        │   │   └── FoodEntity.ts
        │   └── bots/
        │       └── WanderBot.ts
        └── client/
            ├── index.ts            # TopiaClient.connect()
            └── renderers/
                ├── SnakeRenderer.ts
                └── FoodRenderer.ts
```

---

