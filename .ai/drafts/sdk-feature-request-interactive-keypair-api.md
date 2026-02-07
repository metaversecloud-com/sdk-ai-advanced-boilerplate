# Feature Request: Create Interactive Key Pairs via API Key

## Summary

There is currently no SDK method to programmatically create or manage interactive key pairs. Developers must manually navigate the Topia platform UI to generate an `interactiveKey` and `interactiveSecret`, then copy-paste them into their `.env` file. This is a major source of confusion and attrition for new RTSDK developers.

Adding a method like `User.createInteractiveKeyPair()` (authenticated via API key) would allow setup scripts to fully automate the onboarding flow — developer provides their API key, the script generates the interactive credentials, writes `.env`, and they're ready to go.

## Expected Behavior

A developer with a valid API key should be able to create an interactive key pair programmatically:

```typescript
import { Topia, UserFactory } from "@rtsdk/topia";

const topia = new Topia({
  apiDomain: "api.topia.io",
  apiProtocol: "https",
  apiKey: process.env.API_KEY,
});

const User = new UserFactory(topia);
const user = User.create();

// Create a new interactive key pair for a specific app
const keyPair = await user.createInteractiveKeyPair({
  name: "my-lunch-swap-app",          // Human-readable label
  description: "Lunch Swap game",      // Optional description
});

// keyPair = {
//   interactivePublicKey: "xFNUVGJH...",
//   interactiveSecret: "YWI1NzJi...",
//   name: "my-lunch-swap-app",
//   createdAt: "2026-02-07T...",
// }
```

## Current Behavior

Interactive key pairs can only be created through the Topia platform admin UI. There is no SDK method to create, list, rotate, or revoke them. The SDK has methods to *query* worlds by key (`user.fetchWorldsByKey()`, `user.fetchInteractiveWorldsByKey(publicKey)`) but no methods to manage the keys themselves.

This creates a painful onboarding flow:
1. Developer gets an API key (straightforward)
2. Developer must find the correct UI page to create interactive keys (confusing)
3. Developer must copy-paste the key and secret into `.env` (error-prone)
4. Many developers give up at step 2

## Possible Solution

### New Methods on User

```typescript
// Create a new interactive key pair
await user.createInteractiveKeyPair(options: {
  name: string;                    // Required label
  description?: string;            // Optional
}): Promise<{
  interactivePublicKey: string;
  interactiveSecret: string;
  name: string;
  createdAt: string;
}>

// List existing interactive key pairs (public keys only, secrets not re-exposed)
await user.fetchInteractiveKeyPairs(): Promise<Array<{
  interactivePublicKey: string;
  name: string;
  createdAt: string;
}>>

// Revoke/delete an interactive key pair
await user.deleteInteractiveKeyPair(publicKey: string): Promise<void>
```

### Security Model

- All key management methods require **API key authentication** (not interactive credentials, since those are what we're creating)
- Secrets are only returned at creation time (like AWS access keys)
- Key pairs are scoped to the authenticated user/organization

### Usage Pattern: Automated Setup Script

This is the primary use case — a zero-friction developer onboarding flow:

```javascript
#!/usr/bin/env node
// scripts/setup.js

import { Topia, UserFactory } from "@rtsdk/topia";
import { writeFileSync } from "fs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  console.log("Welcome! Let's set up your Topia app.\n");

  const apiKey = await ask("Enter your API Key: ");

  // Initialize SDK with just the API key
  const topia = new Topia({
    apiDomain: "api.topia.io",
    apiProtocol: "https",
    apiKey,
  });

  const User = new UserFactory(topia);
  const user = User.create();

  // Auto-generate interactive credentials
  console.log("\nCreating interactive key pair...");
  const keyPair = await user.createInteractiveKeyPair({
    name: "my-app-" + Date.now(),
  });

  // Write .env
  writeFileSync(".env", [
    `API_KEY=${apiKey}`,
    `INTERACTIVE_KEY=${keyPair.interactivePublicKey}`,
    `INTERACTIVE_SECRET=${keyPair.interactiveSecret}`,
    `INSTANCE_DOMAIN=api.topia.io`,
    `INSTANCE_PROTOCOL=https`,
    `NODE_ENV="development"`,
  ].join("\n"));

  console.log("\n✅ .env created! Run `npm run dev` to start.");
  rl.close();
}

main();
```

**Before (current):** Developer needs API key + manually created interactive keys + world slug = 3 separate steps across different UIs.

**After (with this feature):** Developer needs only an API key. Everything else is automated.

## Context (Environment)

- SDK version: `@rtsdk/topia` ^0.17.7+
- Affects: All interactive app developers using the RTSDK
- Impact: This is the #1 friction point in the developer onboarding flow. Developers who can't find or understand interactive keys often abandon the SDK entirely. Automating key creation would dramatically reduce time-to-first-app and improve retention.

## Detailed Description

The Topia SDK already has a tiered authentication model:

| Auth Type | Created Via | SDK Methods |
|-----------|------------|-------------|
| API Key | Platform UI | Used in `Topia()` constructor |
| Interactive Key Pair | Platform UI (manual only) | `fetchInteractiveWorldsByKey()` — query only, no create/delete |
| Session Credentials | Topia iframe (automatic) | `getCredentials()` validates them |

The gap is clear: API keys and session credentials have programmatic workflows, but interactive key pairs are stuck in a manual-only flow. Adding CRUD methods for interactive key pairs — gated behind API key auth — would complete the credential management story and unblock fully automated setup.

## Possible Implementation

### API Endpoints (if not already existing internally)

```
POST   /api/v1/interactive-keys        → Create key pair (returns public + secret)
GET    /api/v1/interactive-keys        → List key pairs (public keys only)
DELETE /api/v1/interactive-keys/:key   → Revoke key pair
```

All endpoints require `Authorization: Bearer <API_KEY>` header.

### SDK Implementation

Add methods to the `User` class (similar pattern to existing `fetchWorldsByKey`):

```typescript
// In User class
async createInteractiveKeyPair(
  options: { name: string; description?: string }
): Promise<InteractiveKeyPairResponse> {
  const result = await this.tpiaxios.post("/api/v1/interactive-keys", options);
  return result.data;
}

async fetchInteractiveKeyPairs(): Promise<InteractiveKeyPairSummary[]> {
  const result = await this.tpiaxios.get("/api/v1/interactive-keys");
  return result.data;
}

async deleteInteractiveKeyPair(publicKey: string): Promise<void> {
  await this.tpiaxios.delete(`/api/v1/interactive-keys/${publicKey}`);
}
```

### Type Definitions

```typescript
interface InteractiveKeyPairResponse {
  interactivePublicKey: string;
  interactiveSecret: string;
  name: string;
  createdAt: string;
}

interface InteractiveKeyPairSummary {
  interactivePublicKey: string;
  name: string;
  createdAt: string;
  // Note: secret is NOT included in list responses
}
```
