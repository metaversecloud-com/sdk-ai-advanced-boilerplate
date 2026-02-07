---
name: Write Tests
description: Add Jest test coverage for a server endpoint using supertest. Use when you need to test routes, controllers, SDK mock assertions, or error handling.
---

# Write Tests for a Route

> **Prerequisites**: At least one server route (see [add-route](./add-route.md))

## Inputs Needed

- [ ] **Route to test**: method + path
- [ ] **Controller name**
- [ ] **SDK methods called** (via utility functions like `getDroppedAsset`, `Visitor.get`, `World.create`)
- [ ] **Edge cases**: Admin-only? Body validation? Error scenarios?

## Steps

### 1. Examine the controller

Read the controller and its utility functions. List every utility/SDK method called.

### 2. Understand the mock strategy

This project mocks at the **utils barrel** level:
- `jest.config.ts` maps `@rtsdk/topia` → `server/mocks/@rtsdk/topia.ts` (minimal stubs)
- Tests `jest.mock("../utils/index.js")` to mock the entire utils barrel
- Assert on `mockUtils.getDroppedAsset`, `mockUtils.Visitor.get`, etc. — NOT raw SDK classes

If the controller uses axios for external calls, add `jest.mock("axios")`.

### 3. Create the test file

Create `server/tests/handle<Name>.test.ts`:

```ts
const topiaMock = require("../mocks/@rtsdk/topia").__mock;

import express from "express";
import request from "supertest";
import router from "../routes.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  visitorId: 1,
  urlSlug: "my-world",
};

jest.mock("../utils/index.js", () => ({
  errorHandler: jest.fn(),
  getCredentials: jest.fn(),
  getDroppedAsset: jest.fn(),
  Visitor: { get: jest.fn() },
  World: { create: jest.fn() },
  // Add other utils your controller imports
}));

const mockUtils = jest.mocked(require("../utils/index.js"));

describe("GET /api/<path>", () => {
  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();
  });

  it("should return 200 with success response", async () => {
    mockUtils.getCredentials.mockReturnValue(baseCreds);
    mockUtils.getDroppedAsset.mockResolvedValue({ id: "asset-123" });
    mockUtils.Visitor.get.mockResolvedValue({ isAdmin: false });
    mockUtils.World.create.mockReturnValue({
      triggerParticle: jest.fn().mockResolvedValue({}),
      fireToast: jest.fn().mockResolvedValue({}),
    });

    const app = makeApp();
    const res = await request(app).get("/api/<path>").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

**Note**: Query params arrive as strings (`visitorId: 1` → `"1"`). Use `expect.objectContaining` for credential assertions.

### 4. Add SDK method assertions

```ts
expect(mockUtils.getDroppedAsset).toHaveBeenCalledWith(baseCreds);
expect(mockUtils.Visitor.get).toHaveBeenCalledWith(
  baseCreds.visitorId, baseCreds.urlSlug, { credentials: baseCreds }
);
```

### 5. Add edge cases

**Error handling** — mock `errorHandler` to send a response:
```ts
mockUtils.errorHandler.mockImplementation(({ res }: any) => {
  if (res) return res.status(500).json({ error: "Internal server error" });
});
```

**Admin-only**: Mock `Visitor.get` with `isAdmin: false`, expect 403.

**Body validation** (POST/PUT): Send empty body, expect 400.

## Common Mistakes

- **Importing `app` from non-existent file**: No `app.ts` export. Use `makeApp()` pattern.
- **Mocking SDK directly instead of utils**: Mock `"../utils/index.js"`, not individual SDK classes.
- **`errorHandler` mock not sending response**: Default `jest.fn()` returns undefined — request hangs. Always mock with `res.status().json()`.
- **Missing `topiaMock.reset()`**: Internal topia mock state leaks between tests.
- **Missing `.js` suffix**: ESM imports need `.js`. Jest strips it for relative imports only.
- **Missing axios mock**: If controller calls external APIs, add `jest.mock("axios")`.
