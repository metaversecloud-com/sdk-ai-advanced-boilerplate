import { ActionType, SET_ERROR } from "@/context/types";
import { Dispatch } from "react";

export const setErrorMessage = (
  dispatch: Dispatch<ActionType> | null,
  error:
    | string
    | {
        message?: string;
        response?: { data?: { error?: { message?: string }; message?: string } };
      },
) => {
  console.error(error);

  if (!dispatch) return;

  let message = error;

  if (typeof error !== "string") {
    message = error.response?.data?.error?.message || error.response?.data?.message || error.message || error;
  }

  dispatch({
    type: SET_ERROR,
    payload: { error: error === "" ? error : `Error: ${JSON.stringify(message)}` },
  });
};
