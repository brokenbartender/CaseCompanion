import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReleaseGatePayload, shouldRejectReleaseGate } from '../forensics/releaseGate.ts';

test('release gate: rejects when rejectedCount > 0', () => {
  assert.equal(shouldRejectReleaseGate({ totalCount: 3, rejectedCount: 1 }), true);
});

test('release gate: allows when rejectedCount = 0', () => {
  assert.equal(shouldRejectReleaseGate({ totalCount: 3, rejectedCount: 0 }), false);
});

test('release gate payload schema', () => {
  const payload = buildReleaseGatePayload({
    totalCount: 2,
    rejectedCount: 1,
    reasons: ['UNANCHORED_CLAIM_PRESENT']
  });
  assert.equal(payload.errorCode, 'NO_ANCHOR_NO_OUTPUT');
  assert.equal(payload.totalCount, 2);
  assert.equal(payload.rejectedCount, 1);
  assert.equal(Array.isArray(payload.reasons), true);
});
