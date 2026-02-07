const topiaMock = require("../mocks/@rtsdk/topia").__mock;

import express from "express";
import request from "supertest";
import { requireDevMode } from "../middleware/requireDevMode.js";
import devRouter from "../routes.dev.js";

// Mock the utils
jest.mock("../utils/index.js", () => ({
  errorHandler: jest.fn(({ res, message }: any) => {
    if (res) return res.status(500).json({ success: false, message });
    return { error: message };
  }),
  Asset: {
    create: jest.fn(),
  },
  DroppedAsset: {
    drop: jest.fn(),
  },
  World: {
    create: jest.fn(),
  },
}));

jest.mock("../utils/getDevCredentials.js", () => ({
  getDevCredentials: jest.fn(() => ({
    assetId: "",
    displayName: "dev",
    identityId: "",
    interactiveNonce: "",
    interactivePublicKey: "test-key",
    profileId: "",
    sceneDropId: "",
    uniqueName: "",
    urlSlug: "test-world",
    username: "dev",
    visitorId: 0,
  })),
}));

const mockUtils = jest.mocked(require("../utils/index.js"));
const mockDevCreds = jest.mocked(require("../utils/getDevCredentials.js"));

function makeDevApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/dev", requireDevMode, devRouter);
  return app;
}

describe("dev routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    topiaMock.reset();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      API_KEY: "test-api-key",
      INTERACTIVE_KEY: "test-key",
      DEVELOPMENT_WORLD_SLUG: "test-world",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("requireDevMode middleware", () => {
    test("returns 404 when NODE_ENV is not development", async () => {
      process.env.NODE_ENV = "production";
      const app = makeDevApp();
      const res = await request(app).get("/api/dev/world-info");
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Not found");
    });

    test("returns 503 when API_KEY is missing", async () => {
      delete process.env.API_KEY;
      const app = makeDevApp();
      const res = await request(app).get("/api/dev/world-info");
      expect(res.status).toBe(503);
      expect(res.body.message).toContain("API_KEY");
    });

    test("passes through when in development with API_KEY", async () => {
      const mockWorld = {
        fetchDetails: jest.fn().mockResolvedValue({}),
        name: "Test World",
        urlSlug: "test-world",
        description: "A test world",
      };
      mockUtils.World.create.mockReturnValue(mockWorld);

      const app = makeDevApp();
      const res = await request(app).get("/api/dev/world-info");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/dev/world-info", () => {
    test("returns world details", async () => {
      const mockWorld = {
        fetchDetails: jest.fn().mockResolvedValue({}),
        name: "Test World",
        urlSlug: "test-world",
        description: "A test world",
      };
      mockUtils.World.create.mockReturnValue(mockWorld);

      const app = makeDevApp();
      const res = await request(app).get("/api/dev/world-info");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.world).toEqual({
        name: "Test World",
        urlSlug: "test-world",
        description: "A test world",
      });
      expect(mockUtils.World.create).toHaveBeenCalledWith("test-world", {
        credentials: expect.objectContaining({ urlSlug: "test-world" }),
      });
    });

    test("calls errorHandler on failure", async () => {
      const mockWorld = {
        fetchDetails: jest.fn().mockRejectedValue(new Error("Bad API key")),
      };
      mockUtils.World.create.mockReturnValue(mockWorld);

      const app = makeDevApp();
      const res = await request(app).get("/api/dev/world-info");

      expect(res.status).toBe(500);
      expect(mockUtils.errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "handleDevGetWorldInfo",
        }),
      );
    });
  });

  describe("POST /api/dev/drop-asset", () => {
    test("returns 400 when position is missing", async () => {
      const app = makeDevApp();
      const res = await request(app).post("/api/dev/drop-asset").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("position");
    });

    test("returns 400 when position.x is not a number", async () => {
      const app = makeDevApp();
      const res = await request(app).post("/api/dev/drop-asset").send({ position: { x: "abc", y: 0 } });

      expect(res.status).toBe(400);
    });

    test("drops asset with correct parameters", async () => {
      const mockAsset = { id: "asset-1" };
      const mockDroppedAsset = { id: "dropped-1", position: { x: 100, y: 200 }, uniqueName: "test" };

      mockUtils.Asset.create.mockResolvedValue(mockAsset);
      mockUtils.DroppedAsset.drop.mockResolvedValue(mockDroppedAsset);

      const app = makeDevApp();
      const res = await request(app).post("/api/dev/drop-asset").send({
        position: { x: 100, y: 200 },
        layer0: "https://example.com/img.png",
        uniqueName: "test",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.droppedAsset.id).toBe("dropped-1");

      expect(mockUtils.Asset.create).toHaveBeenCalledWith("webImageAsset", {
        credentials: expect.objectContaining({ urlSlug: "test-world" }),
      });
      expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledWith(
        mockAsset,
        expect.objectContaining({
          position: { x: 100, y: 200 },
          urlSlug: "test-world",
          isInteractive: true,
          interactivePublicKey: "test-key",
          layer0: "https://example.com/img.png",
          uniqueName: "test",
        }),
      );
    });

    test("sets clickType to link when clickableLink is provided", async () => {
      const mockAsset = { id: "asset-1" };
      const mockDroppedAsset = { id: "dropped-1", position: { x: 0, y: 0 } };

      mockUtils.Asset.create.mockResolvedValue(mockAsset);
      mockUtils.DroppedAsset.drop.mockResolvedValue(mockDroppedAsset);

      const app = makeDevApp();
      await request(app).post("/api/dev/drop-asset").send({
        position: { x: 0, y: 0 },
        clickableLink: "https://example.com",
      });

      expect(mockUtils.DroppedAsset.drop).toHaveBeenCalledWith(
        mockAsset,
        expect.objectContaining({
          clickableLink: "https://example.com",
          clickType: "link",
        }),
      );
    });
  });
});
