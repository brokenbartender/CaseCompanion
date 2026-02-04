export type AutoDemoStage = { label?: string; progress?: number };
export type DemoState = {
  active: boolean;
  paused: boolean;
  narration: string;
  stage: AutoDemoStage;
  stageProgress: number;
  trace: any[];
  progress: number;
};

export function isAutoDemoEnabled() {
  return false;
}

export function useAutoDemo() {
  const state: DemoState = {
    active: false,
    paused: false,
    narration: "",
    stage: {},
    stageProgress: 0,
    trace: [],
    progress: 0
  };
  return {
    ...state,
    start: () => {},
    startScenario: (_scenario: string) => {},
    pause: () => {},
    resume: () => {},
    stop: () => {}
  };
}
