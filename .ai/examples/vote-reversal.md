# Vote/Selection Reversal

> **Source**: sdk-poll
> **SDK Methods**: `droppedAsset.updateDataObject()` with lock
> **Guide Phase**: Phase 3
> **Difficulty**: Intermediate

## When to Use

Add vote/selection reversal when your app allows visitors to change a previous choice and the system must accurately decrement the old option's count while incrementing the new one. This pattern applies to polling, voting, item equipping, team selection, or any scenario where a visitor's current selection replaces their previous one and both tallies must update atomically.

## Server Implementation

### Data Object Shape

```ts
/**
 * The poll/vote data is stored on the key dropped asset's data object.
 *
 * Structure:
 * - options: map of option ID to its current vote count
 * - votes: map of profileId to the option they currently have selected
 */
interface PollDataObject {
  options: Record<string, number>;  // e.g., { "optionA": 12, "optionB": 8 }
  votes: Record<string, string>;    // e.g., { "profile123": "optionA" }
  totalVotes: number;
}

const DEFAULT_POLL_DATA: PollDataObject = {
  options: {},
  votes: {},
  totalVotes: 0,
};
```

### Vote Handler with Reversal

Create `server/utils/handleVote.ts`:

```ts
import { Credentials } from "../types.js";
import { DroppedAsset } from "./topiaInit.js";

interface VoteResult {
  success: boolean;
  previousVote: string | null;
  currentVote: string;
  options: Record<string, number>;
  totalVotes: number;
}

export const handleVote = async ({
  credentials,
  keyAssetId,
  selectedOption,
  validOptions,
}: {
  credentials: Credentials;
  keyAssetId: string;
  selectedOption: string;
  validOptions: string[];
}): Promise<VoteResult> => {
  const { profileId, urlSlug } = credentials;

  // Validate the selected option
  if (!validOptions.includes(selectedOption)) {
    throw new Error(`Invalid option: ${selectedOption}. Valid options: ${validOptions.join(", ")}`);
  }

  // Fetch the key asset with its data object
  const keyAsset = await DroppedAsset.create(keyAssetId, urlSlug, {
    credentials: { ...credentials, assetId: keyAssetId },
  });
  await keyAsset.fetchDataObject();

  const data = keyAsset.dataObject as PollDataObject | undefined;

  // Initialize data object if missing
  if (!data?.options || !data?.votes) {
    const initialOptions: Record<string, number> = {};
    for (const opt of validOptions) {
      initialOptions[opt] = 0;
    }

    const lockId = `${keyAssetId}-init-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
    await keyAsset.setDataObject(
      {
        options: initialOptions,
        votes: {},
        totalVotes: 0,
      },
      { lock: { lockId, releaseLock: true } },
    );
    await keyAsset.fetchDataObject();
  }

  const currentData = keyAsset.dataObject as PollDataObject;
  const previousVote = currentData.votes[profileId] || null;

  // If voting for the same option, no change needed
  if (previousVote === selectedOption) {
    return {
      success: true,
      previousVote,
      currentVote: selectedOption,
      options: currentData.options,
      totalVotes: currentData.totalVotes,
    };
  }

  // Build the update payload
  const updatePayload: Record<string, any> = {};

  // Decrement old option (if visitor had a previous vote)
  if (previousVote && currentData.options[previousVote] !== undefined) {
    const oldCount = currentData.options[previousVote];
    // Guard against negative values
    updatePayload[`options.${previousVote}`] = Math.max(0, oldCount - 1);
  }

  // Increment new option
  const newCount = (currentData.options[selectedOption] || 0) + 1;
  updatePayload[`options.${selectedOption}`] = newCount;

  // Record the visitor's new vote
  updatePayload[`votes.${profileId}`] = selectedOption;

  // Update total votes (only increment if this is a new voter)
  if (!previousVote) {
    updatePayload.totalVotes = (currentData.totalVotes || 0) + 1;
  }

  // Apply update with lock to prevent concurrent write conflicts
  const lockId = `${keyAssetId}-vote-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
  await keyAsset.updateDataObject(updatePayload, {
    lock: { lockId, releaseLock: true },
    analytics: [
      {
        analyticName: "votes",
        profileId,
        uniqueKey: profileId,
        urlSlug,
      },
    ],
  });

  // Build updated options for response
  const updatedOptions = { ...currentData.options };
  if (previousVote && updatedOptions[previousVote] !== undefined) {
    updatedOptions[previousVote] = Math.max(0, updatedOptions[previousVote] - 1);
  }
  updatedOptions[selectedOption] = newCount;

  return {
    success: true,
    previousVote,
    currentVote: selectedOption,
    options: updatedOptions,
    totalVotes: previousVote ? currentData.totalVotes : (currentData.totalVotes || 0) + 1,
  };
};
```

### Controller Example

```ts
// server/controllers/handleCastVote.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";
import { handleVote } from "../utils/handleVote.js";

// Define valid options for this poll
const VALID_OPTIONS = ["optionA", "optionB", "optionC", "optionD"];

export const handleCastVote = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { selectedOption, keyAssetId } = req.body;

    if (!selectedOption) {
      return res.status(400).json({ success: false, error: "selectedOption is required" });
    }

    if (!keyAssetId) {
      return res.status(400).json({ success: false, error: "keyAssetId is required" });
    }

    const result = await handleVote({
      credentials,
      keyAssetId,
      selectedOption,
      validOptions: VALID_OPTIONS,
    });

    return res.json(result);
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleCastVote",
      message: "Error casting vote.",
      req,
      res,
    });
  }
};
```

### Removing a Vote (Unvoting)

```ts
/**
 * Allow a visitor to remove their vote entirely without selecting a new option.
 */
export const handleRemoveVote = async ({
  credentials,
  keyAssetId,
}: {
  credentials: Credentials;
  keyAssetId: string;
}): Promise<{ success: boolean; removedVote: string | null; options: Record<string, number> }> => {
  const { profileId, urlSlug } = credentials;

  const keyAsset = await DroppedAsset.create(keyAssetId, urlSlug, {
    credentials: { ...credentials, assetId: keyAssetId },
  });
  await keyAsset.fetchDataObject();

  const currentData = keyAsset.dataObject as PollDataObject;
  const previousVote = currentData.votes?.[profileId] || null;

  if (!previousVote) {
    return { success: true, removedVote: null, options: currentData.options };
  }

  const updatePayload: Record<string, any> = {};
  const oldCount = currentData.options[previousVote] || 0;
  updatePayload[`options.${previousVote}`] = Math.max(0, oldCount - 1);
  updatePayload[`votes.${profileId}`] = null;
  updatePayload.totalVotes = Math.max(0, (currentData.totalVotes || 0) - 1);

  const lockId = `${keyAssetId}-unvote-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;
  await keyAsset.updateDataObject(updatePayload, {
    lock: { lockId, releaseLock: true },
  });

  const updatedOptions = { ...currentData.options };
  updatedOptions[previousVote] = Math.max(0, oldCount - 1);

  return { success: true, removedVote: previousVote, options: updatedOptions };
};
```

## Client Implementation

### Types

```ts
// shared/types.ts
export interface PollState {
  options: Record<string, number>;
  myVote: string | null;
  totalVotes: number;
}
```

### Reducer Update

```ts
// Add to context/types.ts
export interface InitialState {
  // ... existing fields
  poll?: PollState;
}

export const SET_POLL = "SET_POLL";

// Add to reducer
case SET_POLL: {
  return {
    ...state,
    poll: payload,
  };
}
```

### Poll Component

```tsx
import { useContext, useState } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@context/GlobalContext";
import { backendAPI, setErrorMessage } from "@utils";
import { ErrorType, SET_POLL } from "@context/types";

interface PollOption {
  id: string;
  label: string;
}

const OPTIONS: PollOption[] = [
  { id: "optionA", label: "Option A" },
  { id: "optionB", label: "Option B" },
  { id: "optionC", label: "Option C" },
  { id: "optionD", label: "Option D" },
];

export const PollView = ({ keyAssetId }: { keyAssetId: string }) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { poll } = useContext(GlobalStateContext);
  const [loading, setLoading] = useState(false);

  const handleVote = async (selectedOption: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await backendAPI.post("/api/vote", { selectedOption, keyAssetId });

      if (response.data.success) {
        dispatch({
          type: SET_POLL,
          payload: {
            options: response.data.options,
            myVote: response.data.currentVote,
            totalVotes: response.data.totalVotes,
          },
        });
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = poll?.totalVotes || 0;

  return (
    <div className="container">
      <h2 className="h2">Cast Your Vote</h2>
      {OPTIONS.map((option) => {
        const count = poll?.options?.[option.id] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isSelected = poll?.myVote === option.id;

        return (
          <div key={option.id} className="card" style={{ marginBottom: "8px" }}>
            <div className="card-details">
              <button
                className={`btn ${isSelected ? "" : "btn-outline"}`}
                onClick={() => handleVote(option.id)}
                disabled={loading}
                style={{ width: "100%" }}
              >
                {option.label} ({count} votes - {percentage}%)
              </button>
            </div>
          </div>
        );
      })}
      <p className="p2">Total votes: {totalVotes}</p>
    </div>
  );
};
```

## Variations

| App            | Selection Type | Reversal Behavior                     | Lock Strategy              |
|----------------|----------------|---------------------------------------|----------------------------|
| sdk-poll       | Vote on option | Decrement old, increment new          | Minute-rounded lock        |
| item-equip     | Equip gear     | Unequip old slot, equip new           | Per-visitor lock           |
| team-picker    | Join team      | Leave old team count, join new        | Per-asset lock             |
| preference     | Set favorite   | Remove from old list, add to new      | No lock (single visitor)   |

## Common Mistakes

- **Forgetting `Math.max(0, count - 1)`**: Always guard decrements against going negative. Race conditions or data corruption could cause a count to be 0 when a decrement is attempted.
- **Not checking if the vote is the same**: If a visitor selects the same option they already have, skip the update entirely. Without this check, you double-count and corrupt tallies.
- **Using separate `updateDataObject` calls for decrement and increment**: Always combine the decrement and increment into a single `updateDataObject` call with one lock. Separate calls create a window where the data is inconsistent.
- **Not initializing option counts**: Before the first vote, ensure all options exist in the `options` map with a count of 0. Missing keys cause `undefined + 1 = NaN`.
- **Storing votes on the visitor instead of the asset**: Vote tallies must live on the shared dropped asset so all visitors see the same counts. The visitor's individual vote is recorded within the asset's `votes` map, keyed by `profileId`.
- **Missing lock on concurrent writes**: Voting is inherently concurrent. Always use a lock when updating the shared poll data object to prevent lost updates.

## Related Examples

- [Leaderboard](./leaderboard.md) -- displaying poll results as ranked options
- [Get Configuration](./get-configuration.md) -- initializing poll options from asset data
- [Reset Game State](./reset-game-state.md) -- resetting all votes to zero
