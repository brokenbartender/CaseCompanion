import crypto from "crypto";
import { logAuditEvent } from "../audit.js";

export async function logAiRefusal(input: {
  workspaceId: string;
  userId: string;
  prompt: string;
  enforcementLayer: string;
  reason?: string;
}) {
  try {
    const promptHash = crypto.createHash("sha256").update(input.prompt || "").digest("hex");
    await logAuditEvent(input.workspaceId, input.userId, "AI_REFUSAL", {
      event: "AI_REFUSAL",
      reason: input.reason || "HALLUCINATION_RISK",
      prompt_hash: promptHash,
      timestamp: new Date().toISOString(),
      enforcement_layer: input.enforcementLayer
    });
  } catch {
    // Non-blocking: refusal logging should never break response flow.
  }
}
