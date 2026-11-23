import { ActionType, SET_GAME_STATE } from "@/context/types";
import { Dispatch } from "react";

export const setGameState = (dispatch: Dispatch<ActionType> | null, gameState: object) => {
  if (!dispatch || !setGameState) return;

  dispatch({
    type: SET_GAME_STATE,
    payload: { ...gameState, error: "" },
  });
};
