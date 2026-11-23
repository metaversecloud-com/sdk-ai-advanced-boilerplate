import { PropsWithChildren } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "./GlobalContext";
import { ActionType, InitialState } from "./types";

const GlobalState: React.FC<PropsWithChildren & {
  initialState: InitialState;
  dispatch: React.Dispatch<ActionType>;
}> = (props) => {
  const { initialState, dispatch } = props;
  return (
    <GlobalStateContext.Provider value={initialState}>
      <GlobalDispatchContext.Provider value={dispatch}>{props.children}</GlobalDispatchContext.Provider>
    </GlobalStateContext.Provider>
  );
};

export default GlobalState;