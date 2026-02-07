# Particle Effects

> **Source**: virtual-pet, sdk-quest, sdk-scavenger-hunt
> **SDK Methods**: `visitor.triggerParticle({ name, duration })`, `world.triggerParticle({ name, duration, position })`
> **Guide Phase**: Phase 7
> **Difficulty**: Starter
> **Tags**: `visual, effect, celebration, sparkle, smoke, trophy, hearts, animation, feedback`

## When to Use

Use this pattern to trigger visual particle effects in the Topia world. Visitor particles follow the visitor's avatar and are visible to all visitors in the world. World particles appear at a fixed position in the world. Common scenarios include celebrating achievements (badge earned, level up), providing action feedback (watering a plant, petting an animal), and marking discoveries or completions.

## Server Implementation

### Visitor Particle (Follows Avatar)

Trigger a particle effect that follows the visitor's avatar as they move.

```ts
/**
 * Controller to trigger a particle effect on a specific visitor
 * The particle follows the visitor's avatar
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleTriggerVisitorParticle = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { particleName, duration } = req.body;

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Trigger the particle effect on the visitor
    await visitor.triggerParticle({
      name: particleName || "redHeart_float",
      duration: duration || 3,
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTriggerVisitorParticle",
      message: "Error triggering visitor particle effect",
      req,
      res,
    });
  }
};
```

### World Particle (Fixed Position)

Trigger a particle effect at a specific world coordinate. Useful for highlighting locations or assets.

```ts
/**
 * Controller to trigger a particle effect at a specific position in the world
 * The particle appears at the given coordinates and does not follow any visitor
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, DroppedAsset, World } from "../utils/index.js";

export const handleTriggerWorldParticle = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    const { particleName, duration } = req.body;

    // Get the dropped asset to use its position for the particle
    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });
    const { position } = droppedAsset;

    // Create a world instance and trigger the particle at the asset's position
    const world = World.create(urlSlug, { credentials });

    await world.triggerParticle({
      name: particleName || "whiteStar_burst",
      duration: duration || 3,
      position: {
        x: position?.x || 0,
        y: position?.y || 0,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTriggerWorldParticle",
      message: "Error triggering world particle effect",
      req,
      res,
    });
  }
};
```

### Particle as a Non-Blocking Side Effect

Like toasts, particles are often fired alongside other operations. Use `.catch()` to prevent particle failures from blocking the primary logic.

```ts
/**
 * Example of triggering particles as non-blocking side effects
 * Combined with other game actions (badge award, level up, etc.)
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor, World } from "../utils/index.js";

export const handleLevelUp = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // ... perform level up logic (update data object, award badge, etc.) ...

    // Fire particle and toast as non-blocking side effects
    visitor
      .triggerParticle({ name: "medal_float", duration: 5 })
      .catch((error) => console.error("Failed to trigger particle:", error));

    visitor
      .fireToast({ groupId: "level-up", title: "Level Up!", text: "Congratulations!" })
      .catch((error) => console.error("Failed to fire toast:", error));

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleLevelUp",
      message: "Error processing level up",
      req,
      res,
    });
  }
};
```

## Known Particle Names

### Complete Reference (16 known particles)

These particle names have been confirmed across production SDK apps. Names are **case-sensitive** and must be passed exactly as shown.

#### Float Particles (follow an animation path, drift upward)

| Particle Name | Visual Description | Common Use Cases | Source Apps |
|--------------|-------------------|-----------------|------------|
| `"sleep_float"` | Floating Z's | Pet sleeping, resting state | virtual-pet |
| `"guitar_float"` | Floating music notes | Playing music, entertainment action | virtual-pet |
| `"redHeart_float"` | Floating red hearts | Love, affection, feeding, pet care | virtual-pet |
| `"pawPrint_float"` | Floating paw prints | Pet walking, training, exploring | virtual-pet |
| `"medal_float"` | Floating medals | Level up, achievement unlocked | virtual-pet |
| `"trophy_float"` | Floating trophies | First place, race completion, top rank | sdk-race, sdk-quest |
| `"explosion_float"` | Floating explosion | Task completion, item destroyed | sdk-scavenger-hunt |
| `"partyPopper_float"` | Floating party poppers | Game won, celebration, major milestone | sdk-scavenger-hunt |
| `"disco_float"` | Floating disco balls | Discovery, found hidden item | sdk-scavenger-hunt |

#### Burst Particles (radiate outward from center)

| Particle Name | Visual Description | Common Use Cases | Source Apps |
|--------------|-------------------|-----------------|------------|
| `"whiteStar_burst"` | Bursting white stars | Expression grant, unlock, power-up | sdk-quest, virtual-pet |

#### Puff Particles (smoke/cloud effect)

| Particle Name | Visual Description | Common Use Cases | Source Apps |
|--------------|-------------------|-----------------|------------|
| `"blackSmoke_puff"` | Black smoke cloud | Asset deletion, item removal, destruction | Multiple |

#### Sparkle/Effect Particles

| Particle Name | Visual Description | Common Use Cases | Source Apps |
|--------------|-------------------|-----------------|------------|
| `"Sparkle"` | Sparkle highlight (capitalized) | Item collection, asset interaction, general highlight | lunch-swap |
| `"sparkle"` | Sparkle effect (lowercase) | Item collection, general feedback | guide/07-polish |
| `"level_up_sparkle"` | Extended sparkle effect | Level up visual with longer duration | xp-leveling |
| `"fireworks"` | Fireworks burst | Celebration, game win | guide/07-polish |
| `"confetti"` | Falling confetti | Badge awarded, milestone reached | guide/07-polish |

### Naming Convention

Particle names follow these patterns:
- **`{icon}_float`** — animated icon that drifts upward (most common, 9 variants)
- **`{icon}_burst`** — radial burst from center point (1 known variant)
- **`{icon}_puff`** — smoke/cloud expansion (1 known variant)
- **Single word** — generic effects without suffix (`Sparkle`, `fireworks`, `confetti`)

### Choosing a Particle

| Scenario | Recommended Particle | Duration |
|----------|---------------------|----------|
| Achievement / badge earned | `"medal_float"` or `"trophy_float"` | 3-5s |
| Level up | `"level_up_sparkle"` or `"medal_float"` | 3-5s |
| Item collected / discovered | `"disco_float"` or `"Sparkle"` | 3s |
| Game completed / won | `"partyPopper_float"` or `"fireworks"` | 5s |
| Asset removed / destroyed | `"blackSmoke_puff"` or `"explosion_float"` | 3-5s |
| Pet care / affection | `"redHeart_float"` | 3s |
| Expression / emote unlocked | `"whiteStar_burst"` | 3s |
| General positive feedback | `"Sparkle"` or `"confetti"` | 3s |
| Resting / idle state | `"sleep_float"` | 3-5s |

### API Reference

```ts
// Visitor particle (follows avatar)
await visitor.triggerParticle({
  name: "redHeart_float",  // Required: exact particle name string
  duration: 3,              // Required: seconds (recommended 2-5)
});

// World particle (fixed position)
await world.triggerParticle({
  name: "blackSmoke_puff",  // Required: exact particle name string
  duration: 3,               // Required: seconds
  position: {                // Required for world particles
    x: 100,
    y: 200,
  },
});
```

## Client Implementation

Particle effects are server-side only (they render in the Topia world, not in the iframe). The client triggers them via API calls.

### Triggering Particles from Client

```tsx
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";
import { backendAPI, setErrorMessage } from "@utils";

interface CelebrateButtonProps {
  particleName?: string;
}

export const CelebrateButton = ({ particleName = "partyPopper_float" }: CelebrateButtonProps) => {
  const dispatch = useContext(GlobalDispatchContext);

  const handleCelebrate = async () => {
    try {
      await backendAPI.post("/api/trigger-particle", {
        particleName,
        duration: 5,
      });
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <button className="btn" onClick={handleCelebrate}>
      Celebrate
    </button>
  );
};
```

## Variations

| App | Use Case | Scope | Particle | Duration | Notes |
|-----|----------|-------|----------|----------|-------|
| virtual-pet | Pet action feedback | Visitor | `"redHeart_float"`, `"sleep_float"`, etc. | 3-5s | Different particle per action |
| sdk-quest | Expression unlock | Visitor | `"whiteStar_burst"` | 3s | Burst effect for unlocking |
| sdk-scavenger-hunt | Clue discovered | World (at clue position) | `"disco_float"` | 5s | Fixed position at the clue asset |
| sdk-scavenger-hunt | Game completed | Visitor | `"partyPopper_float"` | 5s | Follows the winning visitor |
| lunch-swap | Asset interaction | World (at asset position) | `"Sparkle"` | 3s | Highlights the interacted asset |

## Common Mistakes

- **Using an invalid particle name**: Particle names are specific strings recognized by the Topia renderer. Using an unrecognized name will silently fail with no visual effect. Refer to the known particle names table above or test in a development world.
- **Setting duration too long**: Long-duration particles (>10s) can be visually distracting and may overlap with subsequent effects. Keep durations between 2-5 seconds for most use cases.
- **Awaiting particles in critical paths**: Like toasts, particle calls can fail. Always use `.catch()` when particles are side effects to avoid blocking the primary operation response.
- **Confusing visitor vs world particles**: Visitor particles follow the avatar; world particles are fixed at a position. Using `visitor.triggerParticle` when you want a position-fixed effect (or vice versa) will produce unexpected visual results.
- **Missing position for world particles**: `world.triggerParticle` requires a `position` object with `x` and `y`. Omitting it will cause the particle to appear at the world origin (0, 0) or fail.

## Related Examples

- [Fire Toast](./fire-toast.md) - Often combined with particles for richer feedback
- [Award Badge](./award-badge.md) - Trigger celebration particles when awarding badges
- [Teleport Visitor](./teleport-visitor.md) - Trigger arrival particles after teleporting
