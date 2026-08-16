import { createContext } from "react";
import { ActionType, InitialState } from "./types";
import { initialState } from "./constants";

export const GlobalStateContext = createContext<InitialState>(initialState);

export const GlobalDispatchContext = createContext<React.Dispatch<ActionType> | null>(null);
