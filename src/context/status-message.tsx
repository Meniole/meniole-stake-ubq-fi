import { createContext, useContext, useReducer } from "react";

type StatusMessage = {
  successMessage: string | null;
  errorMessage: string | null;
};

type StatusMessageActions = {
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  clearMessages: () => void;
};

type StatusMessageAction = { type: "setSuccess"; message: string | null } | { type: "setError"; message: string | null } | { type: "clear" };

const StatusMessageStateContext = createContext<StatusMessage | null>(null);
const StatusMessageActionsContext = createContext<StatusMessageActions | null>(null);

export const useStatusMessageState = () => {
  const context = useContext(StatusMessageStateContext);
  if (!context) {
    throw new Error("useStatusMessageState must be used within StatusMessageProvider");
  }
  return context;
};

export const useStatusMessageActions = () => {
  const context = useContext(StatusMessageActionsContext);
  if (!context) {
    throw new Error("useStatusMessageActions must be used within StatusMessageProvider");
  }
  return context;
};

export const useStatusMessage = () => {
  return {
    ...useStatusMessageState(),
    ...useStatusMessageActions(),
  };
};

export function StatusMessageProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(statusMessageReducer, {
    successMessage: null,
    errorMessage: null,
  });

  const actions = {
    setSuccessMessage: (msg: string | null) => dispatch({ type: "setSuccess", message: msg }),
    setErrorMessage: (msg: string | null) => dispatch({ type: "setError", message: msg }),
    clearMessages: () => dispatch({ type: "clear" }),
  };

  return (
    <StatusMessageActionsContext.Provider value={actions}>
      <StatusMessageStateContext.Provider value={state}>{children}</StatusMessageStateContext.Provider>
    </StatusMessageActionsContext.Provider>
  );
}

function statusMessageReducer(state: StatusMessage, action: StatusMessageAction): StatusMessage {
  switch (action.type) {
    case "setSuccess":
      return { successMessage: action.message, errorMessage: null };
    case "setError":
      return { successMessage: null, errorMessage: action.message };
    case "clear":
      return { successMessage: null, errorMessage: null };
    default:
      return state;
  }
}
