import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { cryptoShredder } from "./cryptoShredder.js";

type LlmAuditInput = {
  workspaceId: string;
  userId: string;
  requestId?: string | null;
  promptKey?: string | null;
  provider: string;
  model: string;
  purpose: string;
  payload: any;
};

export async function recordLlmAudit(input: LlmAuditInput) {
  const payloadJson = JSON.stringify(input.payload ?? {});
  const payloadHash = crypto.createHash("sha256").update(payloadJson).digest("hex");

  await cryptoShredder.loadWorkspaceKey(input.workspaceId).catch(() => false);
  const keyHex = cryptoShredder.getWorkspaceKey(input.workspaceId) || cryptoShredder.ensureWorkspaceKey(input.workspaceId);
  const encrypted = cryptoShredder.encrypt(payloadJson, keyHex);
  await cryptoShredder.persistWorkspaceKey(input.workspaceId).catch(() => false);

  return prisma.llmAudit.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      requestId: input.requestId || null,
      promptKey: input.promptKey || null,
      provider: input.provider,
      model: input.model,
      purpose: input.purpose,
      payloadHash,
      payloadEnvelopeJson: JSON.stringify(encrypted)
    }
  });
}
