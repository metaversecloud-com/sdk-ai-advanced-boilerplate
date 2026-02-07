# API Endpoints

<!--
All API routes follow the pattern:
  UI -> client/src/utils/backendAPI.ts -> server/routes.ts -> controllers -> Topia SDK

Routes are defined in `server/routes.ts` and map to controller functions in `server/controllers/`.
Credentials are passed as query parameters and extracted via `getCredentials(req.query)`.
-->

## Route Table

<!-- List every API endpoint the app exposes. Include the standard health check routes. -->

| Method | Path | Controller | Description | Auth |
|--------|------|-----------|-------------|------|
| GET | `/api/` | (inline) | Health check | None |
| GET | `/api/system/health` | (inline) | System status | None |
| [METHOD] | `/api/[PATH]` | `[CONTROLLER_NAME]` | [DESCRIPTION] | [VISITOR / ADMIN / NONE] |
| [METHOD] | `/api/[PATH]` | `[CONTROLLER_NAME]` | [DESCRIPTION] | [VISITOR / ADMIN / NONE] |
| [METHOD] | `/api/[PATH]` | `[CONTROLLER_NAME]` | [DESCRIPTION] | [VISITOR / ADMIN / NONE] |
| [METHOD] | `/api/[PATH]` | `[CONTROLLER_NAME]` | [DESCRIPTION] | [VISITOR / ADMIN / NONE] |

<!-- Example:
| Method | Path | Controller | Description | Auth |
|--------|------|-----------|-------------|------|
| GET | `/api/` | (inline) | Health check | None |
| GET | `/api/system/health` | (inline) | System status | None |
| GET | `/api/game-state` | `handleGetGameState` | Get world config + visitor data | Visitor |
| POST | `/api/offer` | `handleCreateOffer` | Create a new trade offer | Visitor |
| POST | `/api/offer/accept` | `handleAcceptOffer` | Accept an open offer | Visitor |
| DELETE | `/api/offer/:offerId` | `handleCancelOffer` | Cancel own offer | Visitor |
| PUT | `/api/admin/config` | `handleUpdateConfig` | Update world configuration | Admin |
| POST | `/api/admin/reset` | `handleResetGame` | Reset all game data | Admin |
-->

## Endpoint Details

<!-- For each non-trivial endpoint, document the full request/response contract. Copy this block for each endpoint. -->

### [METHOD] `/api/[PATH]` - [DESCRIPTION]

**Controller**: `[CONTROLLER_NAME]`
**File**: `server/controllers/[FILENAME].ts`

**Request**:

```typescript
// Query parameters (always present via backendAPI interceptor)
interface QueryParams {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  username: string;
  urlSlug: string;
  visitorId: string;
}

// Request body (for POST/PUT/PATCH)
interface RequestBody {
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

**Response (success)**:

```typescript
// HTTP 200
interface SuccessResponse {
  success: true;
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
  [PROPERTY_NAME]: [PROPERTY_TYPE]; // [DESCRIPTION]
}
```

**Response (error)**:

```typescript
// HTTP 4xx/5xx (handled by errorHandler)
interface ErrorResponse {
  success: false;
  error: string;
}
```

**SDK Methods Used**:

- `[SDK_CLASS].[METHOD]()` - [PURPOSE]
- `[SDK_CLASS].[METHOD]()` - [PURPOSE]

---

### [METHOD] `/api/[PATH]` - [DESCRIPTION]

**Controller**: `[CONTROLLER_NAME]`
**File**: `server/controllers/[FILENAME].ts`

**Request**:

```typescript
interface RequestBody {
  [PROPERTY_NAME]: [PROPERTY_TYPE];
}
```

**Response (success)**:

```typescript
interface SuccessResponse {
  success: true;
  [PROPERTY_NAME]: [PROPERTY_TYPE];
}
```

**SDK Methods Used**:

- `[SDK_CLASS].[METHOD]()` - [PURPOSE]

---

<!-- Add more endpoint detail blocks as needed. -->

## Authentication & Authorization

<!--
Topia SDK apps use interactive credentials for authentication. The credentials flow is:
  URL query params -> App.tsx extracts -> backendAPI interceptor attaches -> getCredentials(req.query) validates

Document any additional authorization logic beyond standard credential validation.
-->

### Credential Validation

All routes (except health check) require valid interactive credentials passed as query parameters. The `getCredentials()` utility validates their presence.

### Admin Authorization

<!-- How does the app determine if a user is an admin? What routes require admin access? -->

- Admin status is checked via: [DESCRIBE_ADMIN_CHECK]
- Admin-only routes: [LIST_ADMIN_ROUTES]

<!-- Example:
- Admin status is checked via: `const visitor = await Visitor.get(visitorId, urlSlug, { credentials }); const { isAdmin } = visitor;`
- Admin-only routes: PUT /api/admin/config, POST /api/admin/reset
-->

## Rate Limiting

<!-- Document any rate limiting considerations. Topia SDK calls have their own rate limits. -->

| Concern | Mitigation |
|---------|-----------|
| [RATE_LIMIT_CONCERN] | [MITIGATION_STRATEGY] |

<!-- Example:
| Concern | Mitigation |
|---------|-----------|
| Rapid offer creation | Debounce on client, 1 offer per visitor per minute |
| SDK API rate limits | Cache world data object, batch updates where possible |
| Concurrent data writes | Use locking pattern with time-bucketed lockIds |
-->

## Webhook Endpoints (if applicable)

<!-- If the app uses Topia zone webhooks (e.g., visitor enters/exits a zone), document them here. Remove this section if not applicable. -->

| Webhook Type | Path | Trigger | Handler |
|-------------|------|---------|---------|
| [ENTER_ZONE / EXIT_ZONE / OTHER] | `/api/[PATH]` | [TRIGGER_DESCRIPTION] | `[HANDLER_NAME]` |

<!-- Example:
| Webhook Type | Path | Trigger | Handler |
|-------------|------|---------|---------|
| ENTER_ZONE | `/api/webhook/zone-enter` | Visitor walks into game zone | `handleZoneEnter` |
| EXIT_ZONE | `/api/webhook/zone-exit` | Visitor leaves game zone | `handleZoneExit` |
-->

## External Integrations (if applicable)

<!-- Document any external services the API communicates with beyond the Topia SDK. Remove this section if not applicable. -->

| Service | Purpose | Endpoint / SDK | Auth Method |
|---------|---------|---------------|-------------|
| [SERVICE_NAME] | [PURPOSE] | [ENDPOINT_OR_SDK] | [AUTH_METHOD] |

<!-- Example:
| Service | Purpose | Endpoint / SDK | Auth Method |
|---------|---------|---------------|-------------|
| AWS S3 | Image uploads for bulletin posts | `@aws-sdk/client-s3` | IAM credentials via env vars |
| Topia Leaderboard | Cross-world leaderboard display | `EcosystemFactory` | JWT via interactive credentials |
-->

## Routes File Structure

<!-- Show the expected structure of server/routes.ts after all endpoints are added. -->

```typescript
// server/routes.ts
import { Router } from "express";
import {
  [CONTROLLER_IMPORTS]
} from "./controllers/index.js";

const router = Router();

// Health
router.get("/", (req, res) => res.json({ message: "[APP_NAME] API" }));
router.get("/system/health", (req, res) => res.json({ status: "ok" }));

// [ROUTE_GROUP_NAME]
[ROUTE_DEFINITIONS]

// Admin
[ADMIN_ROUTE_DEFINITIONS]

export default router;
```
