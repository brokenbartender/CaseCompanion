import crypto from 'crypto';
import { prisma } from './lib/prisma.js';
import { logAuditEvent } from './audit.js';
import { storageService } from './storageService.js';

export type DerivedArtifactPayload = {
  id: string;
  requestId: string;
  workspaceId: string;
  artifactType: string;
  anchorIdsUsed: string[];
  exhibitIdsUsed: string[];
  exhibitIntegrityHashesUsed: Array<{ exhibitId: string; integrityHash: string }>;
  proofContract?: {
    version: string;
    policyId: string;
    policyHash: string;
    decision: "RELEASED" | "WITHHELD_422";
    evidenceDigest: string;
    promptKey: string;
    provider: string;
    model: string;
    temperature: number;
    guardrailsHash: string;
    releaseCert: {
      version: string;
      kid: string;
      policyHash: string;
    };
    anchorCount: number;
    claimCount: number;
    createdAt: string;
  };
  proofContractHash?: string;
  replayHash?: string;
  claimProofs?: Array<{
    claimId: string;
    claim: string;
    anchorIds: string[];
    sourceSpans: Array<{
      anchorId: string;
      exhibitId?: string | null;
      pageNumber?: number | null;
      lineNumber?: number | null;
      bbox?: [number, number, number, number] | null;
      spanText?: string | null;
      integrityStatus?: string | null;
      integrityHash?: string | null;
    }>;
    verification: {
      grounding: "PASS" | "FAIL";
      semantic: "PASS" | "FAIL";
      audit: "PASS" | "FAIL";
      releaseGate: "PASS" | "FAIL";
    };
  }>;
  claimProofHashes?: Array<{
    claimId: string;
    hash: string;
    verification: {
      grounding: "PASS" | "FAIL";
      semantic: "PASS" | "FAIL";
      audit: "PASS" | "FAIL";
      releaseGate: "PASS" | "FAIL";
    };
  }>;
  claimProofsHash?: string;
  createdAt: string;
};

type ClaimProof = NonNullable<DerivedArtifactPayload["claimProofs"]>[number];
type ClaimProofHash = NonNullable<DerivedArtifactPayload["claimProofHashes"]>[number];

function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeProofContract(contract: NonNullable<DerivedArtifactPayload["proofContract"]>) {
  return {
    version: contract.version,
    policyId: contract.policyId,
    policyHash: contract.policyHash,
    decision: contract.decision,
    evidenceDigest: contract.evidenceDigest,
    promptKey: contract.promptKey,
    provider: contract.provider,
    model: contract.model,
    temperature: contract.temperature,
    guardrailsHash: contract.guardrailsHash,
    releaseCert: {
      version: contract.releaseCert.version,
      kid: contract.releaseCert.kid,
      policyHash: contract.releaseCert.policyHash
    },
    anchorCount: contract.anchorCount,
    claimCount: contract.claimCount,
    createdAt: contract.createdAt
  };
}

export function hashProofContract(contract: NonNullable<DerivedArtifactPayload["proofContract"]>) {
  return sha256(JSON.stringify(normalizeProofContract(contract)));
}

function normalizeClaimProof(proof: ClaimProof) {
  const anchorIds = [...(proof.anchorIds || [])].map(String).sort();
  const spans = (proof.sourceSpans || []).map((span: ClaimProof["sourceSpans"][number]) => ({
    anchorId: span.anchorId,
    exhibitId: span.exhibitId ?? null,
    pageNumber: span.pageNumber ?? null,
    lineNumber: span.lineNumber ?? null,
    bbox: span.bbox ?? null,
    spanText: span.spanText ?? null,
    integrityStatus: span.integrityStatus ?? null,
    integrityHash: span.integrityHash ?? null
  }));
  spans.sort((a: typeof spans[number], b: typeof spans[number]) => {
    const aKey = `${a.anchorId || ""}:${a.exhibitId || ""}:${a.pageNumber ?? ""}:${a.lineNumber ?? ""}`;
    const bKey = `${b.anchorId || ""}:${b.exhibitId || ""}:${b.pageNumber ?? ""}:${b.lineNumber ?? ""}`;
    return aKey.localeCompare(bKey);
  });
  return {
    claimId: proof.claimId,
    claim: proof.claim,
    anchorIds,
    sourceSpans: spans,
    verification: proof.verification
  };
}

function hashClaimProof(proof: ClaimProof) {
  return sha256(JSON.stringify(normalizeClaimProof(proof)));
}

export async function recordDerivedArtifact(
  payload: Omit<DerivedArtifactPayload, 'id' | 'createdAt'>,
  actorId: string
) {
  const proofContractHash = payload.proofContract
    ? hashProofContract(payload.proofContract)
    : undefined;
  const claimProofHashes: ClaimProofHash[] = payload.claimProofs?.map((proof) => ({
    claimId: proof.claimId,
    hash: hashClaimProof(proof),
    verification: proof.verification
  })) ?? [];
  const claimProofsHash = claimProofHashes.length
    ? sha256(JSON.stringify(claimProofHashes.map((entry) => entry.hash).sort()))
    : undefined;
  const replayHash = proofContractHash
    ? sha256(JSON.stringify({
        proofContractHash,
        claimProofsHash: claimProofsHash || null
      }))
    : undefined;
  const record: DerivedArtifactPayload = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...payload,
    proofContractHash,
    replayHash,
    claimProofHashes: claimProofHashes.length ? claimProofHashes : undefined,
    claimProofsHash
  };
  const auditEvent = await logAuditEvent(payload.workspaceId, actorId, 'DERIVED_ARTIFACT', {
    ...record,
    details: {
      claimProofsHash,
      claimProofHashes,
      proofContractHash,
      replayHash
    }
  });
  try {
    const serialized = Buffer.from(JSON.stringify(record, null, 2));
    const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');
    const storageKey = `work_products/${payload.workspaceId}/${record.id}.json`;
    await storageService.upload(storageKey, serialized);
    await prisma.workProduct.create({
      data: {
        workspaceId: payload.workspaceId,
        matterId: null,
        exhibitId: null,
        auditEventId: auditEvent.id,
        title: `Derived Artifact: ${record.artifactType || 'unknown'}`,
        type: 'AI_SUMMARY',
        format: 'JSON',
        storageKey,
        sha256,
        metadataJson: JSON.stringify({
          requestId: record.requestId,
          artifactType: record.artifactType,
          anchorCount: record.anchorIdsUsed?.length || 0,
          exhibitCount: record.exhibitIdsUsed?.length || 0
        })
      }
    });
  } catch {
    // best-effort; audit event is the source of truth
  }
}

export async function listDerivedArtifacts(workspaceId: string, limit = 10) {
  const events = await prisma.auditEvent.findMany({
    where: { workspaceId, eventType: 'DERIVED_ARTIFACT' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map((event: any) => {
    let payload: any = {};
    try {
      payload = JSON.parse(event.payloadJson || '{}');
    } catch {
      payload = {};
    }
    return {
      id: payload.id || event.id,
      requestId: payload.requestId || '',
      workspaceId: payload.workspaceId || event.workspaceId,
      artifactType: payload.artifactType || '',
      anchorIdsUsed: payload.anchorIdsUsed || [],
      exhibitIdsUsed: payload.exhibitIdsUsed || [],
      exhibitIntegrityHashesUsed: payload.exhibitIntegrityHashesUsed || [],
      proofContract: payload.proofContract || undefined,
      proofContractHash: payload.proofContractHash || undefined,
      replayHash: payload.replayHash || undefined,
      claimProofs: payload.claimProofs || undefined,
      claimProofHashes: payload.claimProofHashes || undefined,
      claimProofsHash: payload.claimProofsHash || undefined,
      createdAt: payload.createdAt || event.createdAt.toISOString(),
    } as DerivedArtifactPayload;
  });
}
