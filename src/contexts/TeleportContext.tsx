import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type TeleportSelection = {
  exhibitId: string;
  pageNumber: number;
  bbox?: [number, number, number, number] | null;
  anchorId?: string;
  nonce?: number;
  requestedAt?: number;
  switchCompletedAt?: number;
};

type TeleportContextValue = {
  target: TeleportSelection | null;
  setTarget: (next: TeleportSelection) => void;
  clearTarget: () => void;
};

const TeleportContext = createContext<TeleportContextValue | null>(null);

export function TeleportProvider({ children }: { children: React.ReactNode }) {
  const [target, setTargetState] = useState<TeleportSelection | null>(null);

  const setTarget = useCallback((next: TeleportSelection) => {
    setTargetState({
      ...next,
      requestedAt: next.requestedAt ?? Date.now(),
      nonce: next.nonce ?? Date.now()
    });
  }, []);

  const clearTarget = useCallback(() => {
    setTargetState(null);
  }, []);

  const value = useMemo(() => ({ target, setTarget, clearTarget }), [target, setTarget, clearTarget]);

  return <TeleportContext.Provider value={value}>{children}</TeleportContext.Provider>;
}

export function useTeleport() {
  const ctx = useContext(TeleportContext);
  if (!ctx) {
    throw new Error("useTeleport must be used within a TeleportProvider");
  }
  return ctx;
}
