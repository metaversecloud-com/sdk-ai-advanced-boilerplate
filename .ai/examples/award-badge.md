Use the SDK's Visitor controller to grant inventory items (badges) and display toast notifications

```ts
/**
 * Utility function to award a badge to a visitor if they don't already have it
 *
 * @param credentials - Topia credentials for API authentication
 * @param visitor - The visitor instance to award the badge to
 * @param visitorInventory - The visitor's current inventory containing badges
 * @param badgeName - The name of the badge to award
 * @returns Promise resolving to success status or standardized error
 */
import { Credentials } from "../../server/types/Credentials.ts";
import { getCachedInventoryItems, standardizeError } from "../../server/utils/index.ts";

export const awardBadge = async ({
  credentials,
  visitor,
  visitorInventory,
  badgeName,
}: {
  credentials: Credentials;
  visitor: any;
  visitorInventory: any;
  badgeName: string;
}) => {
  try {
    // Check if the visitor already has this badge to avoid duplicate awards
    if (visitorInventory.badges[badgeName]) return { success: true };

    // Fetch available inventory items from the ecosystem
    const inventoryItems = await getCachedInventoryItems({ credentials });

    // Find the specific badge in the inventory items
    const inventoryItem = inventoryItems?.find((item) => item.name === badgeName);
    if (!inventoryItem) throw new Error(`Inventory item ${badgeName} not found in ecosystem`);

    // Grant the inventory item (badge) to the visitor using the SDK
    await visitor.grantInventoryItem(inventoryItem, 1);

    // Display a toast notification to the visitor about their new badge
    await visitor
      .fireToast({
        title: "Badge Awarded",
        text: `You have earned the ${badgeName} badge!`,
      })
      .catch(() => console.error(`Failed to fire toast after awarding the ${badgeName} badge.`));

    return { success: true };
  } catch (error: any) {
    return standardizeError(error);
  }
};
```
