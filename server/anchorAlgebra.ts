type AnchorMeta = {
  id: string;
  exhibitId: string;
  pageNumber: number;
  bbox: [number, number, number, number] | null;
  text?: string | null;
  integrityStatus?: string | null;
};

type AlgebraContext = {
  anchorsById?: Record<string, AnchorMeta>;
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toRect(bbox: [number, number, number, number]) {
  const [a, b, c, d] = bbox;
  if (c > a && d > b) {
    return { x: a, y: b, w: c - a, h: d - b };
  }
  return { x: a, y: b, w: c, h: d };
}

function overlaps(a: [number, number, number, number], b: [number, number, number, number]) {
  const ra = toRect(a);
  const rb = toRect(b);
  const ax2 = ra.x + ra.w;
  const ay2 = ra.y + ra.h;
  const bx2 = rb.x + rb.w;
  const by2 = rb.y + rb.h;
  return ra.x < bx2 && ax2 > rb.x && ra.y < by2 && ay2 > rb.y;
}

function extractDates(text: string) {
  const dates: string[] = [];
  const iso = text.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/g) || [];
  dates.push(...iso);
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  for (const year of years) {
    if (!dates.includes(year)) dates.push(year);
  }
  return dates;
}

function extractFirstNumber(text: string) {
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

function resolveAnchors(anchorIds: string[], context?: AlgebraContext) {
  const anchorsById = context?.anchorsById || {};
  const anchorIdsUsed = anchorIds.filter((id) => !!anchorsById[id]);
  const anchors = anchorIdsUsed.map((id) => anchorsById[id]);
  return { anchorIdsUsed, anchors };
}

export function intersectAnchors(anchorIds: string[], context?: AlgebraContext) {
  const { anchorIdsUsed, anchors } = resolveAnchors(anchorIds, context);
  if (!anchors.length) {
    return { corroborated: false, corroborationCount: 0, anchorIdsUsed: [] as string[] };
  }

  const sources = uniqueStrings(
    anchors.map((a) => `${a.exhibitId}:${a.pageNumber}`)
  );
  const corroborationCount = sources.length;
  return {
    corroborated: corroborationCount >= 2,
    corroborationCount,
    anchorIdsUsed,
  };
}

export function detectContradictions(anchorIds: string[], context?: AlgebraContext) {
  const { anchorIdsUsed, anchors } = resolveAnchors(anchorIds, context);
  if (!anchors.length) {
    return { contradictory: false, conflictingAnchorIds: [] as string[], reasonCode: '' };
  }

  const dates = uniqueStrings(
    anchors.flatMap((a) => (a?.text ? extractDates(a.text) : []))
  );
  if (dates.length > 1) {
    return { contradictory: true, conflictingAnchorIds: anchorIdsUsed, reasonCode: 'TIME_CONFLICT' };
  }

  for (let i = 0; i < anchors.length; i += 1) {
    const a = anchors[i];
    if (!a?.bbox || !a.text) continue;
    const aValue = extractFirstNumber(a.text);
    if (!aValue) continue;
    for (let j = i + 1; j < anchors.length; j += 1) {
      const b = anchors[j];
      if (!b?.bbox || !b.text) continue;
      if (a.exhibitId !== b.exhibitId || a.pageNumber !== b.pageNumber) continue;
      if (!overlaps(a.bbox, b.bbox)) continue;
      const bValue = extractFirstNumber(b.text);
      if (!bValue) continue;
      if (aValue !== bValue) {
        return { contradictory: true, conflictingAnchorIds: [a.id, b.id], reasonCode: 'VALUE_CONFLICT' };
      }
    }
  }

  return { contradictory: false, conflictingAnchorIds: [] as string[], reasonCode: '' };
}

export function classifyDependency(anchorIds: string[], context?: AlgebraContext) {
  const { anchorIdsUsed, anchors } = resolveAnchors(anchorIds, context);
  if (!anchors.length) {
    return { dependencyClass: 'UNSTABLE', corroborationCount: 0, contradictionDetected: false };
  }

  const integrityRevoked = anchors.some((a) => String(a?.integrityStatus || '').toUpperCase() === 'REVOKED');
  const contradictions = detectContradictions(anchorIds, context);
  const intersection = intersectAnchors(anchorIds, context);

  if (integrityRevoked) {
    return { dependencyClass: 'UNSTABLE', corroborationCount: intersection.corroborationCount, contradictionDetected: contradictions.contradictory };
  }
  if (contradictions.contradictory) {
    return { dependencyClass: 'CONFLICTED', corroborationCount: intersection.corroborationCount, contradictionDetected: true };
  }
  if (intersection.corroborationCount >= 2) {
    return { dependencyClass: 'MULTI_SOURCE', corroborationCount: intersection.corroborationCount, contradictionDetected: false };
  }
  return { dependencyClass: 'SINGLE_SOURCE', corroborationCount: intersection.corroborationCount, contradictionDetected: false };
}

