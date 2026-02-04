import crypto from "crypto";
import { performance } from "perf_hooks";
import { signPayload } from "../utils/signing.js";
import { sha256OfBuffer } from "../utils/hashUtils.js";

export type ForensicHeartbeat = {
  assetId: string;
  heartbeatHash: string;
  temporalNonce: number;
  aigisSignature: string;
};

export type HeartbeatCheck = {
  heartbeat: ForensicHeartbeat;
  evidenceHash: string;
  desync?: {
    expected: string;
    actual: string;
  };
};

export function createEvidenceHeartbeat(
  rawBuffer: Buffer,
  aiState: any,
  workspaceSecret: string,
  assetId: string
): ForensicHeartbeat {
  const nonce = performance.now();
  const stateSnapshot = JSON.stringify(aiState || {});
  const compositeBuffer = Buffer.concat([
    rawBuffer,
    Buffer.from(stateSnapshot, "utf8"),
    Buffer.from(workspaceSecret || "", "utf8")
  ]);

  const heartbeatHash = crypto
    .createHash("sha256")
    .update(compositeBuffer)
    .update(String(nonce))
    .digest("hex");

  const aigisSignature = signPayload(JSON.stringify({
    assetId,
    heartbeatHash,
    temporalNonce: nonce
  }));

  return {
    assetId,
    heartbeatHash,
    temporalNonce: nonce,
    aigisSignature
  };
}

export function createEvidenceHeartbeatChecked(
  rawBuffer: Buffer,
  aiState: any,
  workspaceSecret: string,
  assetId: string,
  expectedIntegrityHash?: string | null
): HeartbeatCheck {
  const heartbeat = createEvidenceHeartbeat(rawBuffer, aiState, workspaceSecret, assetId);
  const evidenceHash = sha256OfBuffer(rawBuffer);
  if (expectedIntegrityHash && expectedIntegrityHash !== evidenceHash) {
    return {
      heartbeat,
      evidenceHash,
      desync: {
        expected: expectedIntegrityHash,
        actual: evidenceHash
      }
    };
  }
  return { heartbeat, evidenceHash };
}
