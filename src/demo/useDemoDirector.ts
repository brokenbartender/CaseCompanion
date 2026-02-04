import { useEffect, useMemo, useState } from "react";
import type { DemoStage } from "./demoActions";

export type DemoDirectorState = {
  active: boolean;
  running: boolean;
  stage: DemoStage;
  stageStatus: Record<DemoStage, "pending" | "running" | "done" | "error">;
  error: string | null;
  retries: number;
};

const DEFAULT_STAGE_STATUS: Record<DemoStage, "pending" | "running" | "done" | "error"> = {
  PREFLIGHT: "pending",
  SEEDING: "pending",
  INTAKE: "pending",
  TELEPORT: "pending",
  WITHHELD: "pending",
  AUDIT: "pending",
  EXPORT: "pending",
  COMPLETE: "pending"
};

let state: DemoDirectorState = {
  active: false,
  running: false,
  stage: "PREFLIGHT",
  stageStatus: { ...DEFAULT_STAGE_STATUS },
  error: null,
  retries: 0
};

const listeners = new Set<(next: DemoDirectorState) => void>();

const emit = (partial: Partial<DemoDirectorState>) => {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(state));
};

export function useDemoDirector() {
  const [local, setLocal] = useState<DemoDirectorState>(() => state);

  useEffect(() => {
    const listener = (next: DemoDirectorState) => setLocal(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return useMemo(() => ({
    ...local,
    activate: () => emit({ active: true }),
    deactivate: () => emit({ active: false, running: false }),
    setRunning: (running: boolean) => emit({ running }),
    setStage: (stage: DemoStage) => emit({ stage }),
    setStageStatus: (stage: DemoStage, status: DemoDirectorState["stageStatus"][DemoStage]) =>
      emit({ stageStatus: { ...state.stageStatus, [stage]: status } }),
    setError: (error: string | null) => emit({ error }),
    bumpRetries: () => emit({ retries: state.retries + 1 }),
    reset: () => emit({
      active: true,
      running: false,
      stage: "PREFLIGHT",
      stageStatus: { ...DEFAULT_STAGE_STATUS },
      error: null,
      retries: 0
    })
  }), [local]);
}
