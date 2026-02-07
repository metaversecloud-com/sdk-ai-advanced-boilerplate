# Input Sanitization

> **Source**: sdk-stride-check-in, sdk-bulletin-board
> **SDK Methods**: N/A (pure utility)
> **Guide Phase**: Phase 2
> **Difficulty**: Starter
> **Tags**: `sanitize, validate, XSS, security, escape, clean, user-input`

## When to Use

Use input sanitization on every user-provided value before storing it in data objects, leaderboards, or analytics. This prevents XSS attacks, data corruption, and display issues. Sanitize strings, validate types, enforce length limits, and remove special characters where appropriate.

## Server Implementation

### Core Sanitization Utilities

Create reusable sanitization functions:

```typescript
// server/utils/sanitization.ts

/**
 * Sanitizes a string by trimming whitespace and enforcing length limits
 */
export const sanitizeString = (
  input: unknown,
  maxLength: number = 100,
  allowEmpty: boolean = false
): string => {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  const trimmed = input.trim();

  if (!allowEmpty && trimmed.length === 0) {
    throw new Error("Input cannot be empty");
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  return trimmed;
};

/**
 * Sanitizes display names by removing special characters and limiting length
 */
export const sanitizeDisplayName = (name: unknown): string => {
  const sanitized = sanitizeString(name, 50);

  // Remove HTML tags and special characters that could cause issues
  const cleaned = sanitized
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>\"'`]/g, "") // Remove dangerous characters
    .replace(/\s+/g, " "); // Normalize whitespace

  if (cleaned.length === 0) {
    throw new Error("Display name contains only invalid characters");
  }

  return cleaned;
};

/**
 * Validates and sanitizes numeric input
 */
export const sanitizeNumber = (
  input: unknown,
  min?: number,
  max?: number
): number => {
  const num = Number(input);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error("Input must be a valid number");
  }

  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }

  return num;
};

/**
 * Validates boolean input
 */
export const sanitizeBoolean = (input: unknown): boolean => {
  if (typeof input === "boolean") {
    return input;
  }

  if (input === "true" || input === "1") {
    return true;
  }

  if (input === "false" || input === "0") {
    return false;
  }

  throw new Error("Input must be a boolean value");
};

/**
 * Validates array input and enforces bounds
 */
export const sanitizeArray = <T>(
  input: unknown,
  maxLength: number = 100,
  allowEmpty: boolean = false
): T[] => {
  if (!Array.isArray(input)) {
    throw new Error("Input must be an array");
  }

  if (!allowEmpty && input.length === 0) {
    throw new Error("Array cannot be empty");
  }

  if (input.length > maxLength) {
    throw new Error(`Array exceeds maximum length of ${maxLength} items`);
  }

  return input as T[];
};

/**
 * Comprehensive input validation helper
 */
export const validateInput = (schema: Record<string, unknown>, input: Record<string, unknown>) => {
  const errors: string[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    try {
      if (typeof validator === "function") {
        validator(input[key]);
      }
    } catch (error) {
      errors.push(`${key}: ${(error as Error).message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }
};
```

### Usage in Controllers

Apply sanitization before any data object operations:

```typescript
// server/controllers/handleSubmitEntry.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { sanitizeString, sanitizeDisplayName, sanitizeNumber } from "../utils/sanitization.js";

export const handleSubmitEntry = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { message, score } = req.body;

    // Sanitize all inputs
    const sanitizedMessage = sanitizeString(message, 500, false);
    const sanitizedScore = sanitizeNumber(score, 0, 1000000);
    const sanitizedDisplayName = sanitizeDisplayName(credentials.displayName);

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    // Safe to use sanitized values in data object
    await droppedAsset.updateDataObject({
      entries: [
        ...(droppedAsset.dataObject?.entries || []),
        {
          profileId: credentials.profileId,
          displayName: sanitizedDisplayName,
          message: sanitizedMessage,
          score: sanitizedScore,
          timestamp: Date.now(),
        },
      ],
    });

    return res.json({
      success: true,
      message: "Entry submitted successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSubmitEntry",
      message: "Error submitting entry",
      req,
      res,
    });
  }
};
```

### Validation Schema Pattern

For complex inputs, use a validation schema:

```typescript
// server/controllers/handleUpdateConfiguration.ts
import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, DroppedAsset } from "../utils/index.js";
import { validateInput, sanitizeString, sanitizeNumber, sanitizeBoolean } from "../utils/sanitization.js";

export const handleUpdateConfiguration = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const config = req.body;

    // Define validation schema
    validateInput(
      {
        title: (val: unknown) => sanitizeString(val, 100),
        description: (val: unknown) => sanitizeString(val, 500, true),
        maxParticipants: (val: unknown) => sanitizeNumber(val, 1, 100),
        isActive: (val: unknown) => sanitizeBoolean(val),
      },
      config
    );

    const visitor = await Visitor.get(credentials.visitorId, credentials.urlSlug, {
      credentials,
    });

    if (!visitor.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin privileges required",
      });
    }

    const droppedAsset = await DroppedAsset.get(
      credentials.assetId,
      credentials.urlSlug,
      { credentials }
    );

    await droppedAsset.updateDataObject({
      config: {
        title: sanitizeString(config.title, 100),
        description: sanitizeString(config.description, 500, true),
        maxParticipants: sanitizeNumber(config.maxParticipants, 1, 100),
        isActive: sanitizeBoolean(config.isActive),
      },
    });

    return res.json({
      success: true,
      message: "Configuration updated successfully",
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateConfiguration",
      message: "Error updating configuration",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Client-side Validation (UX Enhancement)

While server-side validation is mandatory, add client-side validation for better UX:

```typescript
// client/src/components/EntryForm.tsx
import { useState, useContext } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage } from "@/utils";

export const EntryForm = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const MAX_LENGTH = 500;

  const validateMessage = (value: string): boolean => {
    if (value.trim().length === 0) {
      setError("Message cannot be empty");
      return false;
    }

    if (value.length > MAX_LENGTH) {
      setError(`Message cannot exceed ${MAX_LENGTH} characters`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateMessage(message)) {
      return;
    }

    try {
      const response = await backendAPI.post("/api/entries", {
        message: message.trim(),
      });

      if (response.data.success) {
        setMessage("");
        setError(null);
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container">
      <label className="label">Your Message</label>
      <textarea
        className="input"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          validateMessage(e.target.value);
        }}
        placeholder="Enter your message..."
        maxLength={MAX_LENGTH}
      />
      <p className="p2">
        {message.length} / {MAX_LENGTH} characters
      </p>
      {error && <p className="p2" style={{ color: "var(--error-color)" }}>{error}</p>}
      <button className="btn" type="submit" disabled={!!error}>
        Submit
      </button>
    </form>
  );
};
```

## Variations

| App | Sanitization Focus | Notes |
|-----|-------------------|-------|
| sdk-stride-check-in | Display names only | Simple name validation on check-in |
| sdk-bulletin-board | Messages + titles | HTML stripping for user posts |
| sdk-quiz | Question text + answers | Array validation for answer options |
| virtual-pet | Pet names | Alphanumeric + spaces only |

## Common Mistakes

1. **Client-only validation**: Always validate server-side. Client validation can be bypassed.

2. **Forgetting to trim**: Always call `.trim()` on strings before checking length or emptiness.

3. **Not checking types**: Use `typeof` checks or TypeScript runtime validation. Don't assume POST body types.

4. **Allowing HTML**: Never store raw HTML in data objects unless you have a sanitization library. Strip tags with regex.

5. **No length limits**: Always enforce maximum lengths to prevent data object bloat and display issues.

6. **Inconsistent error messages**: Return clear validation errors like "Display name cannot exceed 50 characters" instead of generic "Invalid input".

7. **Not sanitizing credentials**: Even though credentials come from query params, sanitize `displayName` and `username` before displaying or storing.

## Related Examples

- [admin-permission-guard.md](./admin-permission-guard.md) - Validate admin inputs too
- [owner-vs-viewer.md](./owner-vs-viewer.md) - Sanitize owner-submitted data
- [locking-strategies.md](./locking-strategies.md) - Sanitize before locked writes
