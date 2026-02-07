# PRD (Product Requirements Document) Template

Use this template to define the full scope of a new Topia SDK app or major feature **before writing any code**. A completed PRD ensures that agents and developers share a common understanding of what will be built, how data flows, and what the user experiences.

## When to Create a PRD

- Before building any **new** Topia SDK app from scratch
- Before adding a **major feature** that introduces new data models, API endpoints, or user flows
- Before any work that significantly changes the existing architecture or data object schemas

You do **not** need a full PRD for small bug fixes, styling tweaks, or minor enhancements that stay within existing patterns.

## How to Use This Template

1. **Copy** all template files from this directory into your project's planning folder (e.g., `.ai/prd/` or `docs/prd/`).
2. **Fill in** each `[PLACEHOLDER]` with specifics for your app or feature. Remove instructional comments (lines starting with `<!-- -->`) once you have replaced them with real content.
3. **Review** the completed PRD before any code is written. Walk through each section and confirm:
   - The data model defaults and locking strategy are correct.
   - Every user flow maps to at least one API endpoint.
   - Every API endpoint has a corresponding UI screen or action that calls it.
   - Edge cases (no data, errors, concurrent users) are accounted for.
4. **Iterate** as needed. The PRD is a living document during planning; once implementation starts, treat it as the source of truth and update it if scope changes.

## Template Files

| File | Purpose |
|------|---------|
| `overview.md` | App name, concept, audience, success metrics, tech constraints |
| `user-flows.md` | Entry points, step-by-step user journeys, admin flows, edge cases |
| `data-models.md` | Data object schemas (World, Visitor, DroppedAsset, Ecosystem), defaults, locking |
| `api-endpoints.md` | Route contracts, request/response shapes, auth notes, webhooks |
| `ui-screens.md` | Screen inventory, components, data requirements, SDK CSS classes |

## Filling Out Each Section

### overview.md
Start here. Define what the app is and why it exists. Keep the one-line description under 120 characters. Success metrics should be measurable (e.g., "80% of visitors complete the primary flow").

### user-flows.md
Map every path a user can take. Start from how they enter the app (clicking an asset, entering a zone, webhook trigger) and trace each step to completion. Include admin flows separately. Identify at least 3 edge cases.

### data-models.md
Define TypeScript interfaces for every data object. Specify which SDK object stores each piece of data (World, Visitor, DroppedAsset, User, or Ecosystem). Include default values that `setDataObject` will use for initialization. Document the locking strategy for any data that multiple users might write concurrently.

### api-endpoints.md
List every route the server will expose. For each route, specify the HTTP method, path, controller function, request body shape, and response shape. Note which routes require admin privileges. Include webhook endpoints if the app uses zone-based triggers.

### ui-screens.md
Inventory every screen, modal, and overlay. For each, list the SDK CSS classes it will use, what API calls it makes on mount or user action, and what loading/error states look like. Reference the SDK style guide (`../.ai/style-guide.md`) for available classes.

## Checklist Before Implementation

- [ ] Every user flow step has a corresponding API endpoint
- [ ] Every API endpoint has a corresponding UI action or webhook trigger
- [ ] Data object schemas include default values and locking strategy
- [ ] Edge cases are documented with expected behavior
- [ ] Admin-only routes and screens are clearly marked
- [ ] SDK CSS classes are specified for all UI components
- [ ] Success metrics are defined and measurable
