# SDK Apps AI Documentation

This folder contains guidelines and examples for AI assistants working with Topia SDK applications.

## Files

| File | Purpose |
|------|---------|
| `rules.md` | Base rules for SDK development (detailed version) |
| `style-guide.md` | CSS classes and component styling patterns |

## Templates

| File | Purpose |
|------|---------|
| `templates/prompts.md` | Ideal prompts to give Claude for implementing SDK features |
| `templates/component.tsx` | React component template |
| `templates/plan.md` | Implementation plan template |

## Examples

| File | SDK Feature |
|------|-------------|
| `examples/awardBadge.md` | Grant inventory items (badges) with toast notifications |
| `examples/badges.md` | Complete badges system: ecosystem cache, visitor inventory, UI display |
| `examples/getAnchorAssets.md` | Fetch dropped assets by scene and unique name |
| `examples/handleDropAssets.md` | Create and drop assets into a world |
| `examples/handleGetConfiguration.md` | Retrieve world/visitor configuration |
| `examples/handleRemoveDroppedAsset.md` | Delete asset with effects and notifications |
| `examples/handleRemoveDroppedAssets.md` | Bulk delete assets |
| `examples/handleResetGameState.md` | Reset game state (admin only) |
| `examples/handleUpdateDroppedAsset.md` | Update asset properties |
| `examples/inventoryCache.md` | Cache ecosystem inventory items with 24h TTL |
| `examples/leaderboard.md` | Store, parse, sort, and display visitor leaderboards |

## Quick Start

1. Read `../CLAUDE.md` first (main entry point)
2. Reference `style-guide.md` for UI components
3. Check `examples/` for SDK patterns
