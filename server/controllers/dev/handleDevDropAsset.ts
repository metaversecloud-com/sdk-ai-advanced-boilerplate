import { Request, Response } from "express";
import { errorHandler, Asset, DroppedAsset } from "../../utils/index.js";
import { getDevCredentials } from "../../utils/getDevCredentials.js";

export const handleDevDropAsset = async (req: Request, res: Response) => {
  try {
    const credentials = getDevCredentials();
    const { urlSlug } = credentials;

    const { position, layer0, layer1, uniqueName, clickableLink, sceneDropId } = req.body;

    if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
      return res.status(400).json({
        success: false,
        message: "position.x and position.y (numbers) are required.",
      });
    }

    const asset = await Asset.create("webImageAsset", { credentials });

    const droppedAsset = await DroppedAsset.drop(asset, {
      position,
      urlSlug,
      isInteractive: true,
      interactivePublicKey: process.env.INTERACTIVE_KEY,
      ...(layer0 && { layer0 }),
      ...(layer1 && { layer1 }),
      ...(uniqueName && { uniqueName }),
      ...(sceneDropId && { sceneDropId }),
      ...(clickableLink && { clickableLink, clickType: "link" }),
    });

    return res.json({
      success: true,
      droppedAsset: {
        id: (droppedAsset as any).id,
        position: (droppedAsset as any).position,
        uniqueName: (droppedAsset as any).uniqueName,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDevDropAsset",
      message: "Error dropping asset in dev world",
      req,
      res,
    });
  }
};
