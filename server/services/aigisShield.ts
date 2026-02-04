import { localAiService } from "./localAiService.js";
import { logAuditEvent } from "../audit.js";

const OLLAMA_SHIELD_MODEL = process.env.OLLAMA_SHIELD_MODEL || "phi3:mini";

const FORBIDDEN_PHRASES = [
  /i (advise|recommend) you to/i,
  /you should sue/i,
  /in my legal opinion/i,
  /legal advice/i
];

const OFF_DOMAIN_PATTERNS = [
  /who won/i,
  /capital of/i,
  /sports/i,
  /politics/i,
  /weather/i,
  /history/i
];

const NON_DEMO_DOC_PATTERNS = [
  /real client/i,
  /production data/i,
  /private file/i,
  /non-demo/i,
  /actual case/i
];

const EXTRACTION_PATTERNS = [
  /show (me )?(the )?code/i,
  /source code/i,
  /implementation details/i,
  /internal logic/i,
  /function (that|which) handles/i,
  /where is (the )?code/i,
  /file path/i,
  /\.env/i,
  /connection string/i,
  /private key/i,
  /hash(ing)? salt/i,
  /server port/i,
  /library version/i
];

const LEXIPRO_SCOPE_HINTS = [
  "lexipro",
  "forensic",
  "audit",
  "chain of custody",
  "immutability",
  "admissibility",
  "anchor",
  "exhibit",
  "ledger",
  "demo",
  "mock"
];

export function checkSafety(query: string) {
  const text = String(query || "");
  const lower = text.toLowerCase();

  if (EXTRACTION_PATTERNS.some((regex) => regex.test(text))) {
    return {
      allowed: false,
      code: "AIGIS-CODE-04",
      message: "SECURITY ALERT: AIGIS-CODE-04 Triggered. Reason: Proprietary implementation details are restricted."
    };
  }

  if (OFF_DOMAIN_PATTERNS.some((regex) => regex.test(text))) {
    return {
      allowed: false,
      code: "AIGIS-OFF-03",
      message: "SECURITY ALERT: AIGIS-OFF-03 Triggered. Reason: General world knowledge requests are disabled to maintain forensic focus."
    };
  }

  if (NON_DEMO_DOC_PATTERNS.some((regex) => regex.test(text))) {
    return {
      allowed: false,
      code: "AIGIS-DOC-02",
      message: "SECURITY ALERT: AIGIS-DOC-02 Triggered. Reason: Requests for non-demo or non-mock document data are blocked."
    };
  }

  const inScope = LEXIPRO_SCOPE_HINTS.some((hint) => lower.includes(hint));
  if (!inScope) {
    return {
      allowed: false,
      code: "AIGIS-DOMAIN-01",
      message: "SECURITY ALERT: AIGIS-DOMAIN-01 Triggered. Reason: Query outside LexiPro Forensic OS functional scope."
    };
  }

  return { allowed: true };
}

export const aigisShield = {
  async verifyAndFilter(responseText: string, workspaceId: string): Promise<{ safe: boolean; output: string; riskScore: number }> {
    const containsUPL = FORBIDDEN_PHRASES.some((regex) => regex.test(responseText));

    const validationPrompt = [
      "You are a compliance officer. Reply with SAFE or UNSAFE.",
      "If the text sounds like legal advice or unsupported claims, respond UNSAFE.",
      "",
      `TEXT: "${responseText}"`
    ].join("\n");

    let auditResponse = "";
    try {
      auditResponse = await localAiService.generate(validationPrompt, {
        stop: [],
        temperature: 0.0,
        model: OLLAMA_SHIELD_MODEL,
        timeoutMs: 8000
      });
    } catch {
      auditResponse = "UNSAFE";
    }

    const isUnsafe = containsUPL || auditResponse.toUpperCase().includes("UNSAFE");

    if (isUnsafe) {
      await logAuditEvent(workspaceId, "AIGIS_SHIELD", "OUTPUT_BLOCKED", {
        reason: containsUPL ? "UPL_DETECTION" : "CONSENSUS_FAILURE"
      });
      return {
        safe: false,
        output: "RESPONSE REDACTED: This output failed the AIGIS Compliance check for legal liability or factual accuracy.",
        riskScore: 95
      };
    }

    return { safe: true, output: responseText, riskScore: 0 };
  },
  async handleHeartbeatDesync(args: {
    workspaceId: string;
    exhibitId?: string;
    filename?: string;
    expectedHash?: string | null;
    actualHash?: string | null;
    reason: string;
  }) {
    await logAuditEvent(args.workspaceId, "AIGIS_SHIELD", "HEARTBEAT_BLOCKED", {
      exhibitId: args.exhibitId,
      filename: args.filename,
      expectedHash: args.expectedHash,
      actualHash: args.actualHash,
      reason: args.reason
    });
    return `SECURITY ALERT: ${args.reason}. Sealing inference gates. Evidence is no longer admissible.`;
  }
};
