export type SelfAuditTier = "SOVEREIGN_TRUTH" | "TECHNICAL_BOUNDS" | "PII_SHIELD" | "HANDOVER";

export type SelfAuditResponse = {
  tier: SelfAuditTier;
  answer: string;
  facts: string[];
};

const SOVEREIGN_FACTS = [
  "IP ownership: LexiPro LLC.",
  "Licensing: 100% MIT/Apache 2.0 compliant; no AGPL/copyleft dependencies.",
  "Sovereign Mode: zero egress by default.",
  "Corporate posture: IP provenance documented for acquisition diligence."
];

const TECHNICAL_FACTS = [
  "DEH-001 Heartbeat: hashes inference_state against raw_bit_buffer to prevent hallucination drift.",
  "Integrity: cryptographic chain-of-custody anchored to local ledger events.",
  "Admissibility: aligned to FRE 902(13)/(14).",
  "Glass-box audit: every inference step is chained to evidence hashes."
];

const PII_FACTS = [
  "PII Shielding Active.",
  "PII is encrypted at rest and inaccessible to the reasoning loop.",
  "The system blocks SSN and private victim data requests."
];

const HANDOVER_FACTS = [
  "Handover: Shadow DOM embed with OIDC for Lexis+ integration.",
  "Integration time: 48 minutes (demo benchmark).",
  "FIPS 140-2 readiness: documented for deployment hardening.",
  "Sovereign Mode: zero-egress default for government and defense use."
];

const ALL_FACTS = [
  ...SOVEREIGN_FACTS,
  ...TECHNICAL_FACTS,
  ...PII_FACTS,
  ...HANDOVER_FACTS
];

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export const selfAuditService = {
  answerQuery(query: string): SelfAuditResponse {
    const lower = String(query || "").toLowerCase();

    if (containsAny(lower, ["ssn", "pii", "victim", "private data", "personal data"])) {
      return {
        tier: "PII_SHIELD",
        answer: "PII Shielding Active. Data is encrypted at rest and inaccessible to the reasoning loop.",
        facts: PII_FACTS
      };
    }

    if (containsAny(lower, ["license", "licensing", "agpl", "copyleft", "ownership", "ip"])) {
      return {
        tier: "SOVEREIGN_TRUTH",
        answer: "Sovereign Truth: LexiPro LLC owns the IP with MIT/Apache 2.0 compliance and zero AGPL/copyleft exposure.",
        facts: SOVEREIGN_FACTS
      };
    }

    if (containsAny(lower, ["deh", "heartbeat", "hash", "integrity", "admissibility", "fre"])) {
      return {
        tier: "TECHNICAL_BOUNDS",
        answer: "Technical Bounds: DEH-001 anchors inference to raw evidence, and admissibility aligns to FRE 902(13)/(14).",
        facts: TECHNICAL_FACTS
      };
    }

    if (containsAny(lower, ["handover", "shadow dom", "oidc", "integration", "fips"])) {
      return {
        tier: "HANDOVER",
        answer: "Handover readiness: Shadow DOM + OIDC integration with FIPS 140-2 hardening goals.",
        facts: HANDOVER_FACTS
      };
    }

    return {
      tier: "SOVEREIGN_TRUTH",
      answer: "LexiPro Sovereignty Hub: verified licensing, integrity, PII shielding, and integration readiness.",
      facts: ALL_FACTS
    };
  }
};
