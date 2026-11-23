Use the SDK's DroppedAssetFactory to create new Dropped Assets and add to / drop in a world

```ts
/**
 * Example of creating and dropping both an image asset and a text asset into a Topia world
 *
 * @returns Promise resolving to the ids of the dropped assets or void if error occurs
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials, Asset, DroppedAsset } from "../../server/utils/index.ts";

// Array of pre-defined assets with various properties including image layers and positioning
const droppableAssets = [
  {
    name: "Image One",
    layer0: "https://mybucket.s3.amazonaws.com/image1_backgroundLayer.png",
    layer1: "",
    imageOffsetX: "2",
    imageOffsetY: "-2",
    textOffsetX: "6",
    textOffsetY: "-11",
    yOrderAdjust: "0",
    isTextTopLayer: "false",
  },
  {
    name: "Image Two",
    layer0: "https://mybucket.s3.amazonaws.com/image2_backgroundLayer.png",
    layer1: "https://mybucket.s3.amazonaws.com/image2_topLayer.png",
    imageOffsetX: "3",
    imageOffsetY: "-1",
    textOffsetX: "0",
    textOffsetY: "-27",
    yOrderAdjust: "1000",
  },
  {
    name: "Image Three",
    layer0: "https://mybucket.s3.amazonaws.com/image3_backgroundLayer.png",
    layer1: "https://mybucket.s3.amazonaws.com/image3_topLayer.png",
    imageOffsetX: "1",
    imageOffsetY: "-1",
    textOffsetX: "6",
    textOffsetY: "-11",
    yOrderAdjust: "1000",
  },
];

export const handleDropAssets = async (
  req: Request,
  res: Response,
): Promise<Response<any, Record<string, any>> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug, interactivePublicKey, sceneDropId } = credentials;
    const { text } = req.body;

    // Get the dropped asset to determine position for the new assets
    const droppedAsset = await DroppedAsset.get(assetId, urlSlug, { credentials });

    // Select a random asset template from the predefined options
    const random = Math.floor(Math.random() * droppableAssets.length);
    const droppableAsset = droppableAssets[random];
    const { layer0, layer1, imageOffsetX, imageOffsetY, textOffsetX, textOffsetY, isTextTopLayer, yOrderAdjust } =
      droppableAsset;

    const { position } = droppedAsset;

    if (!layer0 && !layer1) {
      throw "Droppable asset layers not found. Please check environment variables.";
    }

    // Create a web image asset using the SDK
    const webImageAsset = await Asset.create("webImageAsset", {
      credentials,
    });

    // Drop the web image asset into the world at calculated position
    const webImageDroppedAsset = await DroppedAsset.drop(webImageAsset, {
      clickType: DroppedAssetClickType.LINK,
      clickableLink: "https://topia.io",
      clickableLinkTitle: "My awesome link!",
      clickableDisplayTextDescription: "Description",
      clickableDisplayTextHeadline: "Title",
      isInteractive: true,
      interactivePublicKey,
      layer0,
      layer1,
      position: {
        x: (position?.x || 0) + (parseInt(imageOffsetX) || 0),
        y: (position?.y || 0) + (parseInt(imageOffsetY) || 0),
      },
      sceneDropId,
      uniqueName: `${sceneDropId}-image-${assetId}`,
      urlSlug,
    });

    // Calculate position for the text asset
    let textPosition = { x: 0, y: 0 };
    if (position?.x) textPosition.x = Math.round(position.x);
    if (position?.y) textPosition.y = Math.round(position.y);

    // Apply text position offset X
    if (textOffsetX) {
      if (typeof textOffsetX === "number") {
        textPosition.x += textOffsetX; // Fixed: was missing += operator
      } else {
        textPosition.x = textPosition.x + parseInt(textOffsetX);
      }
    } else {
      textPosition.x = textPosition.x - 1;
    }

    // Apply text position offset Y
    if (textOffsetY) {
      if (typeof textOffsetY === "number") {
        textPosition.y += textOffsetY; // Fixed: was missing += operator
      } else {
        textPosition.y = textPosition.y + parseInt(textOffsetY);
      }
    } else {
      textPosition.y = textPosition.y - 26;
    }

    // Create a text asset using the SDK
    const textAsset = await Asset.create("textAsset", {
      credentials,
    });

    // Drop the text asset into the world at calculated position
    const textDroppedAsset = await DroppedAsset.drop(textAsset, {
      position: textPosition,
      isInteractive: true,
      isTextTopLayer: !isTextTopLayer || isTextTopLayer === "true" ? true : false,
      interactivePublicKey,
      sceneDropId,
      text,
      textColor: "black",
      textSize: 16,
      textWeight: "normal",
      textWidth: 190,
      uniqueName: `${sceneDropId}-text-${assetId}`,
      urlSlug,
      yOrderAdjust: parseInt(yOrderAdjust) || 1000,
    });

    return res.json({
      success: true,
      textDroppedAssetId: textDroppedAsset.id,
      webImageDroppedAssetId: webImageDroppedAsset.id,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDropAssets",
      message: "Error dropping assets",
      req,
      res,
    });
  }
};
```
