import { Credentials } from "../types/Credentials.js";

export const getDevCredentials = (): Credentials => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is required for dev routes. Add it to your .env file.");
  }
  if (!process.env.DEVELOPMENT_WORLD_SLUG) {
    throw new Error("DEVELOPMENT_WORLD_SLUG is required for dev routes. Add it to your .env file.");
  }

  return {
    assetId: "",
    displayName: "dev",
    identityId: "",
    interactiveNonce: "",
    interactivePublicKey: process.env.INTERACTIVE_KEY || "",
    profileId: "",
    sceneDropId: "",
    uniqueName: "",
    urlSlug: process.env.DEVELOPMENT_WORLD_SLUG,
    username: "dev",
    visitorId: 0,
  };
};
