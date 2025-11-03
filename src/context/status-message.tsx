import { createContext, useContext, useState, useCallback, useMemo } from "react";

type StatusMessageContext = {
  successMessage: string | null;
  errorMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  clearMessages: () => void;
};

const StatusMessageContext = createContext<StatusMessageContext>({
  successMessage: null,
  errorMessage: null,
  setSuccessMessage: () => {},
  setErrorMessage: () => {},
  clearMessages: () => {},
});

export const useStatusMessage = () => useContext(StatusMessageContext);

export function StatusMessageProvider({ children }: { children: React.ReactNode }) {
  const [successMessage, setSuccess] = useState<string | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);

  const setSuccessMessage = useCallback((msg: string | null) => {
    setSuccess(msg);
    setError(null);
  }, []);

  const setErrorMessage = useCallback((msg: string | null) => {
    setError(msg);
    setSuccess(null);
  }, []);

  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ successMessage, errorMessage, setSuccessMessage, setErrorMessage, clearMessages }),
    [successMessage, errorMessage, setSuccessMessage, setErrorMessage, clearMessages]
  );

  return <StatusMessageContext.Provider value={value}>{children}</StatusMessageContext.Provider>;
}
