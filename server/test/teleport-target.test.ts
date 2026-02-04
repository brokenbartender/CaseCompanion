import test from "node:test";
import assert from "node:assert/strict";
import { computeTeleportSelection, normalizeTeleportBBox } from "../../src/utils/teleport.ts";

test("normalizeTeleportBBox rounds consistently", () => {
  const normalized = normalizeTeleportBBox([100.1234, 200.5678, 120.9999, 30.3333]);
  assert.deepEqual(normalized, [100.12, 30.33, 121, 200.57]);
});

test("computeTeleportSelection is deterministic for stable inputs", () => {
  const input = {
    exhibitId: "ex1",
    pageNumber: 1,
    bbox: [100.1234, 200.5678, 120.9999, 30.3333] as [number, number, number, number],
    anchorId: "a1",
    requestedAt: 100
  };
  const first = computeTeleportSelection(input);
  const second = computeTeleportSelection({ ...input, requestedAt: 999 });
  assert.equal(first.nonce, second.nonce);
  assert.deepEqual(first.bbox, [100.12, 30.33, 121, 200.57]);
});

test("computeTeleportSelection changes when anchor id changes", () => {
  const base = {
    exhibitId: "ex1",
    pageNumber: 1,
    bbox: [10, 20, 30, 40] as [number, number, number, number]
  };
  const withAnchor = computeTeleportSelection({ ...base, anchorId: "a1" });
  const withOtherAnchor = computeTeleportSelection({ ...base, anchorId: "a2" });
  assert.notEqual(withAnchor.nonce, withOtherAnchor.nonce);
});
