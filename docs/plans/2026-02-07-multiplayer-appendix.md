## Appendix: Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Build on Colyseus** | Proven rooms + transport + Redis adapter. We add interpolation + Topia layer. |
| **Decorator schema** | Devs mark synced fields. Framework handles serialization. Zero boilerplate. |
| **Entity owns input** | `onInput()` on the entity, not centralized. Keeps game logic cohesive per entity type. |
| **`defer()` for SDK calls** | Game loop stays fast (sub-ms ticks). Persistence is async with retry. |
| **Redis-optional** | Single process for dev/small games. Redis for production. Same code, zero config change. |
| **Bots as players** | Same input pipeline, same validation. Accurate testing. Trivial human↔bot swap. |
| **TestRoom sync harness** | No sockets, no timers, no Redis. Manual ticks. Fast, deterministic, debuggable. |
| **Three interpolation modes** | `true` (linear/Hermite), `false` (snap), `'physics'` (extrapolation). Per entity type. |
| **Four phases** | Each shippable. Wiggle first (proves core), generalize second (proves API), scale third, release fourth. |

## Appendix: Risk Register

| Risk | Mitigation |
|------|-----------|
| Colyseus breaking changes | Pin to `^0.15.0`, wrap in our `TopiaRoom` abstraction |
| Interpolation feels wrong | Configurable buffer (50-200ms), Hermite vs linear toggle, extensive visual testing |
| Redis adds ops complexity | Redis-optional by default, clear docs on when to enable |
| Physics determinism across client/server | Server-authoritative; client physics is visual-only (prediction) |
| Third-party developer adoption | Scaffold CLI, comprehensive docs, Wiggle + Grid Arena + Bumper Balls as templates |
| Matter.js too heavy for some games | Physics is opt-in import; tree-shaken when not used |
