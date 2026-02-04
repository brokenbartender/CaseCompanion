import test from "node:test";
import assert from "node:assert/strict";
import { computeTeleportSelection, normalizeTeleportBBox } from "../../src/utils/teleport.ts";

test("normalizeTeleportBBox returns null for invalid inputs", () => {
  assert.equal(normalizeTeleportBBox(null), null);
  assert.equal(normalizeTeleportBBox(undefined), null);
  assert.equal(normalizeTeleportBBox([1, 2, 3] as any), null);
  assert.equal(normalizeTeleportBBox([1, 2, 3, "x"] as any), null);
  assert.equal(normalizeTeleportBBox(["a", "b", "c", "d"] as any), null);
});

test("normalizeTeleportBBox rounds to 2 decimals and preserves order", () => {
  const bbox = normalizeTeleportBBox([1.234, 2.345, 3.456, 4.567]);
  assert.deepEqual(bbox, [1.23, 2.35, 3.46, 4.57]);
});

test("normalizeTeleportBBox accepts negative and reversed coordinates", () => {
  const bbox = normalizeTeleportBBox([10, 20, -5, -1]);
  assert.deepEqual(bbox, [-5, -1, 10, 20]);
});

test("computeTeleportSelection normalizes bbox and returns deterministic nonce", () => {
  const input = {
    exhibitId: "exhibit-1",
    pageNumber: 3,
    anchorId: "anchor-1",
    bbox: [1.239, 2.341, 3.456, 4.567]
  };
  const first = computeTeleportSelection(input);
  const second = computeTeleportSelection(input);

  assert.deepEqual(first.bbox, [1.24, 2.34, 3.46, 4.57]);
  assert.equal(first.nonce, second.nonce);
});

test("computeTeleportSelection treats anchorId 0 and empty string differently", () => {
  const base = {
    exhibitId: "exhibit-1",
    pageNumber: 1,
    bbox: [1, 2, 3, 4]
  };
  const zeroNumber = computeTeleportSelection({ ...base, anchorId: 0 as any });
  const zeroString = computeTeleportSelection({ ...base, anchorId: "0" });
  const empty = computeTeleportSelection({ ...base, anchorId: "" });

  assert.notEqual(zeroNumber.nonce, empty.nonce);
  assert.notEqual(zeroString.nonce, empty.nonce);
});

test("normalizeTeleportBBox enforces coordinate ordering", () => {
  const bbox = normalizeTeleportBBox([100, 100, 50, 50]);
  assert.deepEqual(bbox, [50, 50, 100, 100]);
});
