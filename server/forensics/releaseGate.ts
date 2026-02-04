import { HALLUCINATION_RISK_MSG } from '../shared/constants.js';

export { HALLUCINATION_RISK_MSG };

export const RELEASE_GATE_ERROR_CODE = 'NO_ANCHOR_NO_OUTPUT';

export type ReleaseGatePayload = {
  errorCode: typeof RELEASE_GATE_ERROR_CODE;
  message: string;
  totalCount: number;
  rejectedCount: number;
  reasons: string[];
  rejectedDraft?: string;
};

export function buildReleaseGatePayload(input: {
  totalCount: number;
  rejectedCount: number;
  reasons: string[];
  rejectedDraft?: string;
}): ReleaseGatePayload {
  return {
    errorCode: RELEASE_GATE_ERROR_CODE,
    message: HALLUCINATION_RISK_MSG,
    totalCount: input.totalCount,
    rejectedCount: input.rejectedCount,
    reasons: input.reasons,
    rejectedDraft: input.rejectedDraft
  };
}

export function shouldRejectReleaseGate(input: { totalCount: number; rejectedCount: number }): boolean {
  return input.rejectedCount > 0;
}
