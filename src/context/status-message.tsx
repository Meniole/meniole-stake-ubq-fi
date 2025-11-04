import { createContext, useContext, useReducer, useMemo } from "react";

type StatusMessage = {
  successMessage: string | null;
  errorMessage: string | null;
};

type StatusMessageContext = {
  successMessage: string | null;
  errorMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  clearMessages: () => void;
};

type StatusMessageAction =
  | { type: "setSuccess"; message: string | null }
  | { type: "setError"; message: string | null }
  | { type: "clear" };

const StatusMessageContext = createContext<StatusMessageContext>({
  successMessage: null,
  errorMessage: null,
  setSuccessMessage: () => { },
  setErrorMessage: () => { },
  clearMessages: () => { },
});

export const useStatusMessage = () => {
  return useContext(StatusMessageContext);
};

export function StatusMessageProvider({ children }: { children: React.ReactNode }) {
  const [statusMessage, dispatch] = useReducer(statusMessageReducer, {
    successMessage: null,
    errorMessage: null,
  });

  const contextValue = useMemo(() => ({
    ...statusMessage,
    setSuccessMessage: (msg: string | null) => {
      dispatch({ type: "setSuccess", message: msg });
    },
    setErrorMessage: (msg: string | null) => {
      dispatch({ type: "setError", message: msg });
    },
    clearMessages: () => {
      dispatch({ type: "clear" });
    },
  }), [statusMessage]);

  return (
    <StatusMessageContext.Provider value={contextValue}>
      {children}
    </StatusMessageContext.Provider>
  );
}

function statusMessageReducer(_: StatusMessage, action: StatusMessageAction): StatusMessage {
  switch (action.type) {
    case "setSuccess": {
      return { successMessage: action.message, errorMessage: null };
    }
    case "setError": {
      return { successMessage: null, errorMessage: action.message };
    }
    case "clear": {
      return { successMessage: null, errorMessage: null };
    }
    default: {
      throw Error("Unknown action");
    }
  }
}