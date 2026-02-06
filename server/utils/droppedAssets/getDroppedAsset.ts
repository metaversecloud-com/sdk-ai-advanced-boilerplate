import { Credentials, IDroppedAsset } from "../../types/index.js";
import { DroppedAsset, initializeDroppedAssetDataObject, standardizeError } from "../index.js";

export const getDroppedAsset = async (credentials: Credentials): Promise<IDroppedAsset> => {
  try {
    const { assetId, urlSlug } = credentials;

    const droppedAsset = (await DroppedAsset.get(assetId, urlSlug, { credentials })) as IDroppedAsset;

    // If the application will make any updates to a dropped asset's data object we need to
    // first instantiate to ensure it's existence and define it's proper structure.
    // The same should be true for World, User, and Visitor data objects
    await initializeDroppedAssetDataObject(droppedAsset);

    if (!droppedAsset) throw "Dropped asset not found";

    await droppedAsset.fetchDataObject();

    return droppedAsset;
  } catch (error) {
    throw standardizeError(error);
  }
};
