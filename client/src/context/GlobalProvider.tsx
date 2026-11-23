import { useReducer } from "react";
import { globalReducer } from "./reducer";
import GlobalState from "./GlobalState";
import { initialState } from "./constants";

const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  return (
    <GlobalState initialState={state} dispatch={dispatch}>
      {children}
    </GlobalState>
  );
};

export default GlobalProvider;
