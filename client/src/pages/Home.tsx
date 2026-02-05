import { useContext, useEffect, useState } from "react";

// components
import { PageContainer } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { droppedAsset, hasInteractiveParams } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const imgSrc = droppedAsset?.topLayerURL || droppedAsset?.bottomLayerURL;

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state")
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  return (
    <PageContainer isLoading={isLoading} headerText="Server side example using interactive parameters">
      {droppedAsset?.id && (
        <div className="flex flex-col w-full items-start">
          <p className="mt-4 mb-2">
            You have successfully retrieved the dropped asset details for {droppedAsset.assetName}!
          </p>
          {imgSrc && <img className="w-96 h-96 object-cover rounded-2xl my-4" alt="preview" src={imgSrc} />}
        </div>
      )}
    </PageContainer>
  );
};

export default Home;
