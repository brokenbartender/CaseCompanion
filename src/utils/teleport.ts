import type { TeleportSelection } from "../contexts/TeleportContext";

type TeleportSelectionInput = Omit<TeleportSelection, "nonce"> & {
  bbox?: [number, number, number, number] | null;
};

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

export function normalizeTeleportBBox(
  bbox?: [number, number, number, number] | null
): [number, number, number, number] | null {
  if (!bbox) return null;
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const nums = bbox.map((value) => Number(value));
  if (!nums.every((value) => Number.isFinite(value))) return null;
  const rounded = nums.map((value) => Math.round(value * 100) / 100);
  const x1 = Math.min(rounded[0], rounded[2]);
  const y1 = Math.min(rounded[1], rounded[3]);
  const x2 = Math.max(rounded[0], rounded[2]);
  const y2 = Math.max(rounded[1], rounded[3]);
  return [x1, y1, x2, y2];
}

export function computeTeleportSelection(input: TeleportSelectionInput): TeleportSelection {
  const normalizedBBox = normalizeTeleportBBox(input.bbox);
  const key = [
    input.exhibitId,
    String(input.pageNumber),
    String(input.anchorId ?? ""),
    normalizedBBox ? normalizedBBox.join(",") : "null"
  ].join("|");
  const nonce = fnv1a(key);
  return {
    ...input,
    bbox: normalizedBBox,
    nonce
  };
}
