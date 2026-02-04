export type DemoAction =
  | { type: "assistant:teleport" }
  | { type: "assistant:withheld" }
  | { type: "export:packet" }
  | { type: "security:view" }
  | { type: "intake:triage" };

export const DEMO_ACTION_EVENT = "lexipro:demo-action";
export const DEMO_STAGE_EVENT = "lexipro:demo-stage";
const DEMO_ACTION_QUEUE_KEY = "lexipro:demo-action-queue";

export type DemoStage =
  | "PREFLIGHT"
  | "SEEDING"
  | "INTAKE"
  | "TELEPORT"
  | "WITHHELD"
  | "AUDIT"
  | "EXPORT"
  | "COMPLETE";

function isDemoModeActive() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("lexipro_demo_env") === "1";
}

function readActionQueue(): DemoAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(DEMO_ACTION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeActionQueue(queue: DemoAction[]) {
  if (typeof window === "undefined") return;
  try {
    if (!queue.length) {
      window.sessionStorage.removeItem(DEMO_ACTION_QUEUE_KEY);
      return;
    }
    window.sessionStorage.setItem(DEMO_ACTION_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function enqueueAction(action: DemoAction) {
  if (!isDemoModeActive()) return;
  const queue = readActionQueue();
  queue.push(action);
  writeActionQueue(queue);
}

function flushActionQueue(handler: (action: DemoAction) => void) {
  if (!isDemoModeActive()) return;
  const queue = readActionQueue();
  if (!queue.length) return;
  writeActionQueue([]);
  queue.forEach((action) => handler(action));
}

export function dispatchDemoAction(action: DemoAction) {
  if (typeof window === "undefined") return;
  enqueueAction(action);
  window.dispatchEvent(new CustomEvent(DEMO_ACTION_EVENT, { detail: action }));
}

export function onDemoAction(handler: (action: DemoAction) => void) {
  if (typeof window === "undefined") return () => {};
  flushActionQueue(handler);
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as DemoAction | undefined;
    if (!detail?.type) return;
    handler(detail);
  };
  window.addEventListener(DEMO_ACTION_EVENT, listener as EventListener);
  return () => window.removeEventListener(DEMO_ACTION_EVENT, listener as EventListener);
}

export function dispatchDemoStage(stage: DemoStage, detail?: Record<string, any>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DEMO_STAGE_EVENT, { detail: { stage, ...detail } }));
}

export function onDemoStage(handler: (stage: DemoStage, detail?: Record<string, any>) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as { stage?: DemoStage } | undefined;
    if (!detail?.stage) return;
    handler(detail.stage, detail as Record<string, any>);
  };
  window.addEventListener(DEMO_STAGE_EVENT, listener as EventListener);
  return () => window.removeEventListener(DEMO_STAGE_EVENT, listener as EventListener);
}
