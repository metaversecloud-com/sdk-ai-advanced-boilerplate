import { useContext, useEffect, useMemo, useState } from "react";
import { Route, Routes, useNavigate, useSearchParams } from "react-router-dom";

// pages
import { Error, Home } from "./pages";

// context
import { GlobalDispatchContext } from "./context/GlobalContext";
import { InteractiveParams, SET_HAS_INTERACTIVE_PARAMS } from "./context/types";

// utils
import { setupBackendAPI } from "./utils/backendAPI";

const App = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hasInitBackendAPI, setHasInitBackendAPI] = useState(false);
  const [hasMissingParams, setHasMissingParams] = useState(false);

  const dispatch = useContext(GlobalDispatchContext);

  const interactiveParams: InteractiveParams = useMemo(() => {
    return {
      assetId: searchParams.get("assetId") || "",
      displayName: searchParams.get("displayName") || "",
      identityId: searchParams.get("identityId") || "",
      interactiveNonce: searchParams.get("interactiveNonce") || "",
      interactivePublicKey: searchParams.get("interactivePublicKey") || "",
      profileId: searchParams.get("profileId") || "",
      sceneDropId: searchParams.get("sceneDropId") || "",
      uniqueName: searchParams.get("uniqueName") || "",
      urlSlug: searchParams.get("urlSlug") || "",
      username: searchParams.get("username") || "",
      visitorId: searchParams.get("visitorId") || "",
    };
  }, [searchParams]);

  useEffect(() => {
    if (interactiveParams.assetId) {
      dispatch!({
        type: SET_HAS_INTERACTIVE_PARAMS,
        payload: { hasInteractiveParams: true },
      });
    }
  }, [interactiveParams]);

  useEffect(() => {
    if (!interactiveParams.assetId) setHasMissingParams(true);
    if (!hasInitBackendAPI) setupBackend();
  }, [hasInitBackendAPI, interactiveParams]);

  const setupBackend = () => {
    setupBackendAPI(interactiveParams)
      .catch((error) => {
        console.error(error?.response?.data?.message);
        navigate("*");
      })
      .finally(() => setHasInitBackendAPI(true));
  };

  if (hasMissingParams) {
    return (
      <div className="flex flex-col gap-4 text-center justify-center h-screen">
        <h2>Missing Interactive Parameters</h2>
        <p>Required interactive parameters are missing, please access this app inside of a Topia world.</p>
        <p className="p2">
          To ensure the app loads correctly, it must be added as an interactive asset in the world with the correct
          Developer Public Key and "Add player session credentials to asset interactions" toggled on. View our{" "}
          <a
            className="text-success"
            href="https://docs.google.com/presentation/d/12F72CH-MsvcfbEMZ4mO-OyLhViJeq1IfLgjk9xadEaw/edit?usp=sharing"
          >
            SDK Tutorial
          </a>{" "}
          for more details.
        </p>
        <p className="p2">
          <i>If you believe this is an error, please contact support.</i>
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Error />} />
    </Routes>
  );
};

export default App;
