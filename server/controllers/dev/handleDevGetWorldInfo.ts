import { Request, Response } from "express";
import { errorHandler, World } from "../../utils/index.js";
import { getDevCredentials } from "../../utils/getDevCredentials.js";

export const handleDevGetWorldInfo = async (req: Request, res: Response) => {
  try {
    const credentials = getDevCredentials();
    const { urlSlug } = credentials;

    const world = World.create(urlSlug, { credentials });
    await world.fetchDetails();

    return res.json({
      success: true,
      world: {
        name: (world as any).name,
        urlSlug: (world as any).urlSlug,
        description: (world as any).description,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDevGetWorldInfo",
      message: "Error fetching world info. Check your API_KEY and DEVELOPMENT_WORLD_SLUG.",
      req,
      res,
    });
  }
};
