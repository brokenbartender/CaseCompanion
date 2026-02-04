export type DemoAction = any;
export type DemoStage = any;

export function dispatchDemoAction(_action: DemoAction) {}
export function onDemoAction(_handler: (action: DemoAction) => void) {
  return () => {};
}
export function dispatchDemoStage(_stage: DemoStage, _detail?: Record<string, any>) {}
export function onDemoStage(_handler: (stage: DemoStage, detail?: Record<string, any>) => void) {
  return () => {};
}
