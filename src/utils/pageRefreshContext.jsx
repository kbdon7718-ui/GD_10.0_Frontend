import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const PageRefreshContext = createContext(null);

export function PageRefreshProvider({ children }) {
  const handlerRef = useRef(null);
  const [hasHandler, setHasHandler] = useState(false);

  const setRefreshHandler = useCallback((handler) => {
    handlerRef.current = typeof handler === "function" ? handler : null;
    setHasHandler(!!handlerRef.current);
  }, []);

  const refresh = useCallback(() => {
    const handler = handlerRef.current;
    if (typeof handler === "function") handler();
  }, []);

  const value = useMemo(
    () => ({ refresh, setRefreshHandler, hasHandler }),
    [refresh, setRefreshHandler, hasHandler]
  );

  return (
    <PageRefreshContext.Provider value={value}>
      {children}
    </PageRefreshContext.Provider>
  );
}

export function usePageRefresh() {
  const ctx = useContext(PageRefreshContext);
  if (!ctx) {
    throw new Error("usePageRefresh must be used within PageRefreshProvider");
  }
  return ctx;
}
