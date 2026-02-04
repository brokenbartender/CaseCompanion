import type { EvidenceAnchor } from "../types/evidence";

const anchors: EvidenceAnchor[] = [];

export function registerAnchor(anchor: EvidenceAnchor) {
  anchors.push(anchor);
}

export function getAnchors() {
  return anchors.slice();
}

export function getAnchorsBySource(source: string) {
  return anchors.filter((a) => a.source === source);
}

