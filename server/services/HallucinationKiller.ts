import { semanticAdversary } from "./SemanticAdversary.js";

export type GroundingResult =
  | { approved: true }
  | { approved: false; reason: "UNCITED_CLAIMS" }
  | { approved: false; reason: "FABRICATED_CITATION"; details: string };

export type AnchorEvidence = {
  id: string;
  text?: string | null;
};

const citeTagRegex = /<cite[^>]*>([^<]+)<\/cite>/gi;
const pageCitationRegex = /(\(|\[)\s*[^)\]]+,\s*p\.?\s*\d+(?:\s*-\s*\d+)?\s*(\)|\])/i;

export class GroundingError extends Error {
  status = 422;
  code = "UNPROCESSABLE_ENTITY";
  details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = "GroundingError";
    this.details = details;
  }
}

type CitedClaim = {
  anchorId: string;
  claim: string;
};

type ClaimGroup = {
  claim: string;
  anchorIds: string[];
};

function normalizeSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasPageCitation(sentence: string) {
  return pageCitationRegex.test(sentence);
}

function extractSentences(text: string) {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function enforcePageCitations(response: string) {
  const raw = response.replace(citeTagRegex, "").trim();
  if (!raw) return false;
  const sentences = extractSentences(raw);
  if (!sentences.length) return false;
  for (const sentence of sentences) {
    if (!/[a-zA-Z0-9]/.test(sentence)) continue;
    if (!hasPageCitation(sentence)) {
      return false;
    }
  }
  return true;
}

const HIGH_RISK_CLAIM_KEYWORDS = [
  "liability",
  "damages",
  "termination",
  "breach",
  "penalty",
  "indemn",
  "settlement",
  "verdict",
  "payment",
  "interest",
  "fine",
  "sanction",
  "deadline",
  "tax",
  "warranty"
];

function assessClaimRisk(text: string) {
  const value = String(text || "").toLowerCase();
  if (!value) return "STANDARD";
  const hasNumber = /\d/.test(value);
  const hasDate = /\b(19|20)\d{2}\b/.test(value) || /\b\d{4}-\d{2}-\d{2}\b/.test(value);
  const hasKeyword = HIGH_RISK_CLAIM_KEYWORDS.some((kw) => value.includes(kw));
  return hasNumber || hasDate || hasKeyword ? "HIGH" : "STANDARD";
}

function extractClaimGroupsFromJson(response: string): ClaimGroup[] | null {
  try {
    const parsed = JSON.parse(response || "{}");
    const claims = Array.isArray(parsed?.claims) ? parsed.claims : [];
    if (!claims.length) return null;
    const out: ClaimGroup[] = [];
    for (const entry of claims) {
      const claimText = normalizeSentence(String(entry?.text || ""));
      const anchorIds = Array.isArray(entry?.anchorIds)
        ? entry.anchorIds.map((id: any) => String(id || "").trim()).filter(Boolean)
        : [];
      out.push({ claim: claimText, anchorIds });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function extractClaimsFromJson(response: string): CitedClaim[] | null {
  try {
    const parsed = JSON.parse(response || "{}");
    const claims = Array.isArray(parsed?.claims) ? parsed.claims : [];
    if (!claims.length) return null;
    const out: CitedClaim[] = [];
    for (const entry of claims) {
      const claimText = normalizeSentence(String(entry?.text || ""));
      const anchorIds = Array.isArray(entry?.anchorIds) ? entry.anchorIds : [];
      for (const anchorId of anchorIds) {
        const id = String(anchorId || "").trim();
        if (!id) continue;
        out.push({ anchorId: id, claim: claimText });
      }
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function extractCitedClaims(response: string): CitedClaim[] {
  const matches: { anchorId: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = citeTagRegex.exec(response)) !== null) {
    const anchorId = String(match[1] || "").trim();
    if (!anchorId) continue;
    matches.push({ anchorId, start: match.index, end: match.index + match[0].length });
  }

  if (!matches.length) return [];

  const claims: CitedClaim[] = [];
  for (const match of matches) {
    const before = response.slice(0, match.start);
    const after = response.slice(match.end);
    const startIdx = Math.max(
      before.lastIndexOf("."),
      before.lastIndexOf("!"),
      before.lastIndexOf("?"),
      before.lastIndexOf("\n")
    );
    const endIdxRaw = [after.indexOf("."), after.indexOf("!"), after.indexOf("?"), after.indexOf("\n")]
      .filter((idx) => idx >= 0)
      .sort((a, b) => a - b)[0];
    const endIdx = endIdxRaw === undefined ? response.length : match.end + endIdxRaw + 1;
    const slice = response.slice(startIdx >= 0 ? startIdx + 1 : 0, endIdx);
    const claim = normalizeSentence(slice.replace(citeTagRegex, ""));
    claims.push({ anchorId: match.anchorId, claim: claim || normalizeSentence(response.replace(citeTagRegex, "")) });
  }

  return claims;
}

export async function verifyGrounding(
  response: string,
  availableAnchors: Array<string | AnchorEvidence>
): Promise<GroundingResult> {
  const anchors = new Set<string>();
  const evidenceById = new Map<string, string>();

  for (const entry of availableAnchors) {
    if (typeof entry === "string") {
      anchors.add(String(entry));
    } else if (entry && typeof entry === "object") {
      const id = String(entry.id || "");
      if (!id) continue;
      anchors.add(id);
      if (entry.text) {
        evidenceById.set(id, String(entry.text));
      }
    }
  }

  const claimGroups = extractClaimGroupsFromJson(response) || [];
  if (claimGroups.length > 0) {
    for (const group of claimGroups) {
      if (!group.claim || !group.anchorIds.length) {
        return { approved: false, reason: "UNCITED_CLAIMS" };
      }
      for (const anchorId of group.anchorIds) {
        if (!anchors.has(anchorId)) {
          return { approved: false, reason: "FABRICATED_CITATION", details: anchorId };
        }
      }
      let supportCount = 0;
      for (const anchorId of group.anchorIds) {
        const evidenceText = evidenceById.get(anchorId) || "";
        const supports = await semanticAdversary.verifyLogicalSupport(group.claim, evidenceText);
        if (!supports) {
          throw new GroundingError(`Citation ${anchorId} does not logically support the statement.`, anchorId);
        }
        supportCount += 1;
      }
      if (assessClaimRisk(group.claim) === "HIGH" && supportCount < 2) {
        throw new GroundingError("High-risk claim requires corroboration from at least two anchors.", group.anchorIds[0]);
      }
    }
    const citeClaims = extractCitedClaims(response);
    for (const { anchorId } of citeClaims) {
      if (!anchors.has(anchorId)) {
        return { approved: false, reason: "FABRICATED_CITATION", details: anchorId };
      }
    }
    return { approved: true };
  }

  const jsonClaims = extractClaimsFromJson(response) || [];
  const citeClaims = extractCitedClaims(response);
  if (jsonClaims.length === 0 && citeClaims.length === 0) {
    return { approved: false, reason: "UNCITED_CLAIMS" };
  }

  for (const { anchorId } of [...jsonClaims, ...citeClaims]) {
    if (!anchors.has(anchorId)) {
      return { approved: false, reason: "FABRICATED_CITATION", details: anchorId };
    }
  }

  const semanticClaims = jsonClaims.length ? jsonClaims : citeClaims;
  for (const { anchorId, claim } of semanticClaims) {
    const evidenceText = evidenceById.get(anchorId) || "";
    const supports = await semanticAdversary.verifyLogicalSupport(claim, evidenceText);
    if (!supports) {
      throw new GroundingError(`Citation ${anchorId} does not logically support the statement.`, anchorId);
    }
  }

  if (citeClaims.length === 0 && !enforcePageCitations(response)) {
    return { approved: false, reason: "UNCITED_CLAIMS" };
  }

  return { approved: true };
}
