export const GOVERNANCE_LABELS = {
  withheld: "WITHHELD",
  proven: "PROVEN",
  releaseGate: "RELEASE GATE",
} as const;

export type GovernanceLabelKey = keyof typeof GOVERNANCE_LABELS;

export const GOVERNANCE_TONES: Record<GovernanceLabelKey, "red" | "green" | "amber"> = {
  withheld: "red",
  proven: "green",
  releaseGate: "amber",
};

