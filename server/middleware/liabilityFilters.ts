const UPL_PATTERNS = [
  /should i sue/i,
  /what are my chances/i,
  /legal advice/i,
  /should i file/i,
  /can you represent/i
];

const TOXIC_PATTERNS = [
  /kill yourself/i,
  /bomb/i,
  /terrorist/i
];

export function forensicToxicityCheck(input: string): boolean {
  const text = String(input || "");
  return TOXIC_PATTERNS.some((pattern) => pattern.test(text));
}

export function evaluateLiability(query: string): { ok: boolean; error?: string; message?: string } {
  if (!query) return { ok: false, error: "Query required" };
  if (UPL_PATTERNS.some((pattern) => pattern.test(query))) {
    return {
      ok: false,
      error: "LIABILITY_BLOCK",
      message: "This system is a forensic tool and cannot provide legal advice. Please consult an attorney."
    };
  }
  if (forensicToxicityCheck(query)) {
    return { ok: false, error: "POLICY_VIOLATION" };
  }
  return { ok: true };
}

export function scrubPII(input: string): string {
  return String(input || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "[SSN]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[DATE]")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[DATE]");
}

export function classifyIntent(query: string): "forensic" | "general" {
  const text = String(query || "").toLowerCase();
  const forensicHints = [
    "exhibit",
    "evidence",
    "anchor",
    "bates",
    "pdf",
    "document",
    "timeline",
    "audit",
    "claim",
    "integrity"
  ];
  return forensicHints.some((hint) => text.includes(hint)) ? "forensic" : "general";
}

export function applyLiabilityFilters(req: any, res: any, next: any) {
  const query = String(req.body?.query || req.body?.userPrompt || "");
  const result = evaluateLiability(query);
  if (!result.ok) {
    return res.status(result.error === "LIABILITY_BLOCK" ? 403 : 400).json({
      error: result.error,
      message: result.message
    });
  }
  return next();
}
