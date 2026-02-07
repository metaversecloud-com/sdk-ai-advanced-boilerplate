# Fire Toast Notifications

> **Source**: Consolidated from all apps
> **SDK Methods**: `visitor.fireToast({ groupId, title, text })`, `world.fireToast({ groupId, title, text })`
> **Guide Phase**: Phase 7
> **Difficulty**: Starter

## When to Use

Use this pattern to display in-world toast notifications to visitors. Toasts are lightweight, non-blocking messages that appear as overlay banners. Use visitor-scoped toasts when feedback is for a single user (e.g., "Badge earned!", "Action completed"). Use world-scoped toasts when all visitors should see the message (e.g., "Game reset by admin", "New round starting").

## Server Implementation

### Visitor-Specific Toast

Send a toast notification visible only to a single visitor.

```ts
/**
 * Controller to fire a toast notification for a specific visitor
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleFireVisitorToast = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { title, text } = req.body;

    // Get the visitor instance
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // Fire a toast notification to this specific visitor
    await visitor.fireToast({
      groupId: "my-app", // Groups toasts so new ones replace old ones in the same group
      title: title || "Notification",
      text: text || "",
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleFireVisitorToast",
      message: "Error firing toast notification",
      req,
      res,
    });
  }
};
```

### World-Wide Toast

Send a toast notification visible to all visitors currently in the world.

```ts
/**
 * Controller to fire a toast notification to all visitors in the world
 * Typically used for admin announcements or global game events
 *
 * @returns JSON response with success status or error
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor, World } from "../utils/index.js";

export const handleFireWorldToast = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const { title, text } = req.body;

    // Optionally verify the user is an admin before broadcasting
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only admins can send world-wide notifications",
      });
    }

    // Create a world instance and fire the toast to everyone
    const world = World.create(urlSlug, { credentials });

    await world.fireToast({
      groupId: "my-app-announcement",
      title: title || "Announcement",
      text: text || "",
    });

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleFireWorldToast",
      message: "Error firing world toast notification",
      req,
      res,
    });
  }
};
```

### Toast as a Side Effect (Non-Blocking)

In many apps, toasts are fired as side effects of other actions. Use `.catch()` to prevent toast failures from breaking the primary operation.

```ts
/**
 * Example of firing a toast as a non-blocking side effect
 * Used after awarding a badge, completing an action, etc.
 */
import { Request, Response } from "express";
import { VisitorInterface } from "@rtsdk/topia";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleCompleteAction = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });

    // ... perform the primary action (e.g., award badge, update data) ...

    // Fire toast as a non-blocking side effect
    // If the toast fails, it should not prevent the response from being sent
    visitor
      .fireToast({
        groupId: "action-complete",
        title: "Nice Work!",
        text: "You've successfully completed the task!",
      })
      .catch((error) => console.error("Failed to fire toast:", error));

    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCompleteAction",
      message: "Error completing action",
      req,
      res,
    });
  }
};
```

### Toast with groupId Targeting

The `groupId` parameter controls toast grouping. Toasts with the same `groupId` replace each other, preventing notification spam.

```ts
// Different groupIds for different notification categories
// Each group shows at most one toast at a time

// Badge notification group - new badge toasts replace previous badge toasts
await visitor.fireToast({
  groupId: "badge-earned",
  title: "Badge Awarded",
  text: `You earned the ${badgeName} badge!`,
});

// Progress notification group - separate from badge toasts
await visitor.fireToast({
  groupId: "progress-update",
  title: "Progress",
  text: `${cluesFound} of ${totalClues} clues found`,
});

// Error feedback group
await visitor.fireToast({
  groupId: "error-feedback",
  title: "Oops!",
  text: "That action is not available right now.",
});
```

## Client Implementation

Toast notifications are server-side only (they display in the Topia world renderer, not in the iframe). The client triggers them via API calls.

### Triggering a Toast from Client

```tsx
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";
import { backendAPI, setErrorMessage } from "@utils";

export const NotifyButton = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const handleNotify = async () => {
    try {
      await backendAPI.post("/api/fire-toast", {
        title: "Hello!",
        text: "This is a notification from the app.",
      });
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <button className="btn" onClick={handleNotify}>
      Send Notification
    </button>
  );
};
```

## Variations

| App | Use Case | Scope | groupId | Notes |
|-----|----------|-------|---------|-------|
| award-badge (all apps) | Badge earned confirmation | Visitor | `"badge-earned"` | Non-blocking `.catch()` pattern |
| sdk-quiz | Correct/incorrect answer feedback | Visitor | `"quiz-feedback"` | Immediate feedback after answer |
| sdk-race | Race started announcement | World | `"race-event"` | All visitors see the countdown |
| sdk-grow-together | Plant watered notification | Visitor | `"garden-action"` | Confirms garden interaction |
| sdk-scavenger-hunt | Clue discovered | Visitor | `"clue-found"` | Shows progress count |
| Admin actions (all apps) | Game reset notification | World | `"admin-action"` | Admin-only, broadcasts to all |

## Common Mistakes

- **Awaiting toast in critical paths**: Toast calls can occasionally fail due to network issues. Always use `.catch()` when firing toasts as side effects to prevent them from blocking the primary response.
- **Using the same groupId everywhere**: Toasts with the same `groupId` replace each other. Use distinct `groupId` values for different notification categories so important messages are not overwritten by unrelated ones.
- **Sending toasts too frequently**: Rapid successive toasts with different `groupId` values can overwhelm the visitor with notifications. Throttle toast calls or batch messages when performing multiple actions.
- **Forgetting admin checks on world toast**: World-wide toasts are visible to everyone. Always verify `isAdmin` before allowing broadcasts to prevent visitors from spamming all users.
- **Expecting toasts in the iframe**: Toast notifications appear in the Topia world renderer, not inside your app's iframe. For in-iframe feedback, use standard React state and UI components instead.

## Related Examples

- [Award Badge](./award-badge.md) - Fires a toast after granting a badge
- [Teleport Visitor](./teleport-visitor.md) - Often combined with a toast to explain the teleport
- [Reset Game State](./reset-game-state.md) - World toast to announce game reset
