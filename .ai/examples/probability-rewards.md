# Probability-Based Rewards

> **Source**: sdk-grow-together
> **SDK Methods**: `visitor.updateDataObject()`, `visitor.incrementDataObjectValue()`
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate
> **Tags**: `random, chance, drop-rate, luck, reward, RNG, loot, weight`

## When to Use

Add probability-based rewards when your app needs to give visitors randomized outcomes from actions. This pattern covers tiered loot tables, random range rewards, chance-based multipliers, and rare item drops. Use it for any mechanic where the reward for an action is not fixed -- such as harvesting crops, opening chests, completing challenges, or composting items.

## Server Implementation

### Reward Configuration

Create `server/utils/rewardConfig.ts`:

```ts
/**
 * Reward tier definitions.
 * Each tier has a probability weight, and a min/max reward range.
 * Probabilities should sum to 1.0 (100%).
 */

export interface RewardTier {
  name: string;
  probability: number; // 0.0 to 1.0
  coinMin: number;
  coinMax: number;
  xpMin: number;
  xpMax: number;
  label: string;
}

export const REWARD_TIERS: RewardTier[] = [
  { name: "common", probability: 0.5, coinMin: 1, coinMax: 5, xpMin: 5, xpMax: 10, label: "Common" },
  { name: "uncommon", probability: 0.25, coinMin: 5, coinMax: 15, xpMin: 10, xpMax: 25, label: "Uncommon" },
  { name: "rare", probability: 0.15, coinMin: 15, coinMax: 40, xpMin: 25, xpMax: 50, label: "Rare" },
  { name: "epic", probability: 0.08, coinMin: 40, coinMax: 100, xpMin: 50, xpMax: 100, label: "Epic" },
  { name: "legendary", probability: 0.02, coinMin: 100, coinMax: 250, xpMin: 100, xpMax: 250, label: "Legendary" },
];

/**
 * Multiplier chances applied after base reward calculation.
 * Only one multiplier can apply (checked in order, first match wins).
 */
export interface MultiplierChance {
  name: string;
  probability: number;
  multiplier: number;
  label: string;
}

export const MULTIPLIER_CHANCES: MultiplierChance[] = [
  { name: "triple", probability: 0.02, multiplier: 3, label: "TRIPLE REWARD!" },
  { name: "double", probability: 0.1, multiplier: 2, label: "Double Reward!" },
  // If none match, multiplier is 1 (no bonus)
];
```

### Reward Calculation Utility

Create `server/utils/calculateReward.ts`:

```ts
import { REWARD_TIERS, MULTIPLIER_CHANCES, RewardTier, MultiplierChance } from "./rewardConfig.js";

export interface RewardResult {
  tier: string;
  tierLabel: string;
  baseCoins: number;
  baseXp: number;
  multiplier: number;
  multiplierLabel: string | null;
  finalCoins: number;
  finalXp: number;
}

/**
 * Generate a random integer in range [min, max] (inclusive).
 */
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Select a tier based on weighted probabilities.
 * Uses cumulative probability distribution.
 */
const selectTier = (tiers: RewardTier[]): RewardTier => {
  const roll = Math.random();
  let cumulative = 0;

  for (const tier of tiers) {
    cumulative += tier.probability;
    if (roll < cumulative) {
      return tier;
    }
  }

  // Fallback to last tier (handles floating-point edge cases)
  return tiers[tiers.length - 1];
};

/**
 * Check for multiplier bonus.
 * Returns the first matching multiplier or null.
 */
const checkMultiplier = (chances: MultiplierChance[]): MultiplierChance | null => {
  for (const chance of chances) {
    if (Math.random() < chance.probability) {
      return chance;
    }
  }
  return null;
};

/**
 * Calculate a complete reward from an action.
 *
 * 1. Select a reward tier based on weighted probabilities
 * 2. Roll random values within the tier's min/max ranges
 * 3. Check for a multiplier bonus
 * 4. Apply multiplier to get final values
 */
export const calculateReward = (): RewardResult => {
  // Step 1: Select tier
  const tier = selectTier(REWARD_TIERS);

  // Step 2: Roll base values
  const baseCoins = randomInRange(tier.coinMin, tier.coinMax);
  const baseXp = randomInRange(tier.xpMin, tier.xpMax);

  // Step 3: Check for multiplier
  const multiplierResult = checkMultiplier(MULTIPLIER_CHANCES);
  const multiplier = multiplierResult ? multiplierResult.multiplier : 1;
  const multiplierLabel = multiplierResult ? multiplierResult.label : null;

  // Step 4: Apply multiplier
  const finalCoins = baseCoins * multiplier;
  const finalXp = baseXp * multiplier;

  return {
    tier: tier.name,
    tierLabel: tier.label,
    baseCoins,
    baseXp,
    multiplier,
    multiplierLabel,
    finalCoins,
    finalXp,
  };
};
```

### Probability Quick Reference

| Roll Type | Code | Example |
|-----------|------|---------|
| Random int in range | `Math.floor(Math.random() * (max - min + 1)) + min` | 5-15 coins |
| Percentage check | `Math.random() < 0.1` | 10% chance |
| Weighted selection | Cumulative probability loop | Loot tier |
| Boolean coin flip | `Math.random() < 0.5` | Heads/tails |

### Controller with Reward Granting

```ts
// server/controllers/handleHarvest.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { calculateReward } from "../utils/calculateReward.js";

export const handleHarvest = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId, profileId } = credentials;

    // Calculate randomized reward
    const reward = calculateReward();

    // Fetch visitor and update data
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();

    // Increment coins
    await visitor.incrementDataObjectValue("coins", reward.finalCoins, {
      analytics: [
        {
          analyticName: "coinsEarned",
          incrementBy: reward.finalCoins,
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    });

    // Increment XP
    await visitor.incrementDataObjectValue("totalXp", reward.finalXp, {
      analytics: [
        {
          analyticName: "xpEarned",
          incrementBy: reward.finalXp,
          profileId,
          uniqueKey: profileId,
          urlSlug,
        },
      ],
    });

    // Fire toast for rare+ rewards
    if (reward.tier === "rare" || reward.tier === "epic" || reward.tier === "legendary") {
      await visitor
        .fireToast({
          title: `${reward.tierLabel} Reward!`,
          text: `You earned ${reward.finalCoins} coins and ${reward.finalXp} XP!${
            reward.multiplierLabel ? ` (${reward.multiplierLabel})` : ""
          }`,
        })
        .catch(() => console.error("Failed to fire reward toast"));
    }

    return res.json({
      success: true,
      reward: {
        tier: reward.tier,
        tierLabel: reward.tierLabel,
        coins: reward.finalCoins,
        xp: reward.finalXp,
        multiplier: reward.multiplier,
        multiplierLabel: reward.multiplierLabel,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleHarvest",
      message: "Error harvesting.",
      req,
      res,
    });
  }
};
```

### Item-Quality-Based Probability Tables

For apps where reward probabilities vary based on the item being used:

```ts
/**
 * Different items have different probability distributions.
 * E.g., a rare watering can gives better drop rates.
 */
export const ITEM_REWARD_TABLES: Record<string, RewardTier[]> = {
  basic_tool: [
    { name: "common", probability: 0.6, coinMin: 1, coinMax: 3, xpMin: 3, xpMax: 8, label: "Common" },
    { name: "uncommon", probability: 0.25, coinMin: 3, coinMax: 10, xpMin: 8, xpMax: 20, label: "Uncommon" },
    { name: "rare", probability: 0.12, coinMin: 10, coinMax: 25, xpMin: 20, xpMax: 40, label: "Rare" },
    { name: "epic", probability: 0.03, coinMin: 25, coinMax: 60, xpMin: 40, xpMax: 80, label: "Epic" },
  ],
  golden_tool: [
    { name: "uncommon", probability: 0.3, coinMin: 5, coinMax: 15, xpMin: 10, xpMax: 25, label: "Uncommon" },
    { name: "rare", probability: 0.4, coinMin: 15, coinMax: 40, xpMin: 25, xpMax: 50, label: "Rare" },
    { name: "epic", probability: 0.2, coinMin: 40, coinMax: 100, xpMin: 50, xpMax: 100, label: "Epic" },
    { name: "legendary", probability: 0.1, coinMin: 100, coinMax: 250, xpMin: 100, xpMax: 250, label: "Legendary" },
  ],
};

// Usage: pass item-specific tiers to selectTier
const tier = selectTier(ITEM_REWARD_TABLES[itemType] || REWARD_TIERS);
```

## Client Implementation

### Types

```ts
// shared/types.ts
export interface RewardDisplay {
  tier: string;
  tierLabel: string;
  coins: number;
  xp: number;
  multiplier: number;
  multiplierLabel: string | null;
}
```

### Reward Popup Component

```tsx
import { useState, useEffect } from "react";

interface RewardPopupProps {
  reward: RewardDisplay | null;
  onDismiss: () => void;
}

export const RewardPopup = ({ reward, onDismiss }: RewardPopupProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reward) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [reward, onDismiss]);

  if (!reward || !visible) return null;

  const tierColors: Record<string, string> = {
    common: "#9e9e9e",
    uncommon: "#4caf50",
    rare: "#2196f3",
    epic: "#9c27b0",
    legendary: "#ff9800",
  };

  return (
    <div className="card" style={{ borderLeft: `4px solid ${tierColors[reward.tier] || "#9e9e9e"}` }}>
      <div className="card-details">
        <h3 className="card-title">{reward.tierLabel} Reward!</h3>
        <p className="p2">+{reward.coins} coins</p>
        <p className="p2">+{reward.xp} XP</p>
        {reward.multiplierLabel && <p className="p1">{reward.multiplierLabel}</p>}
      </div>
    </div>
  );
};
```

## Variations

| App             | Reward Types       | Probability Model       | Multiplier                        |
|-----------------|--------------------|-------------------------|-----------------------------------|
| grow-together   | Coins, XP, seeds   | Item-quality tiers      | Compost 2x/3x                    |
| virtual-pet     | Treats, XP         | Flat random range       | Training bonus 1.5x              |
| treasure-hunt   | Coins, items       | Location-based tiers    | Streak multiplier                |
| gacha-game      | Characters, items  | Weighted rarity table   | Pity system (guaranteed at N)    |

## Common Mistakes

- **Probabilities not summing to 1.0**: Always verify that tier probabilities add up to exactly 1.0 (or close enough to handle floating-point). If they don't sum correctly, some tiers may be over- or under-represented.
- **Using `Math.random()` without server-side enforcement**: All reward calculations must happen on the server. Never calculate rewards on the client and send them to the server, as clients can manipulate results.
- **Missing fallback tier**: The `selectTier` function must have a fallback return (the last tier) to handle floating-point edge cases where `Math.random()` returns exactly 1.0 or cumulative rounding causes no tier to match.
- **Not using `incrementDataObjectValue` for additive rewards**: When granting coins or XP, use `incrementDataObjectValue` instead of reading, adding, and writing back. The increment method is atomic and prevents race conditions.
- **Forgetting to cap negative outcomes**: If your system allows negative rewards (penalties), always use `Math.max(0, value)` to prevent visitor balances from going negative.

## Related Examples

- [XP and Leveling](./xp-leveling.md) -- using randomized XP rewards with level progression
- [Action Cooldowns](./action-cooldowns.md) -- gating reward-granting actions with cooldowns
- [Daily Limits and Streaks](./daily-limits-streaks.md) -- combining daily caps with random rewards
- [Inventory Cache](./inventory-cache.md) -- awarding inventory items as rare drops
