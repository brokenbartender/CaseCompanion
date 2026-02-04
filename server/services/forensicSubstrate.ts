import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma.js";
import { logAuditEvent as defaultLogAuditEvent } from "../audit.js";
import { generateProofPacket as defaultGenerateProofPacket } from "./packagingService.js";
import { verifyAuditChain as defaultVerifyAuditChain } from "./auditService.js";
import { shouldRejectReleaseGate } from "../forensics/releaseGate.js";

export type IngestEvidenceInput = {
  workspaceId: string;
  userId: string;
  file: any;
  matterIdOrSlug?: string;
};

export type ResolveAnchorsInput = {
  workspaceId: string;
  exhibitId: string;
};

export type ReleaseGateInput = {
  totalClaims: number;
  rejectedClaims: number;
};

export type AuditEventInput = {
  workspaceId: string;
  actorId: string;
  eventType: string;
  payload: any;
};

export type ExportProofPacketInput = {
  workspaceId: string;
  matterId: string;
};

export type VerifyAuditChainInput = {
  workspaceId: string;
};

export type LedgerProofInput = {
  workspaceId: string;
};

export type ForensicSubstrateDeps = {
  prisma?: PrismaClient;
  ingestExhibit?: (args: IngestEvidenceInput) => Promise<any>;
  logAuditEvent?: typeof defaultLogAuditEvent;
  generateProofPacket?: typeof defaultGenerateProofPacket;
  verifyAuditChain?: typeof defaultVerifyAuditChain;
};

export function createForensicSubstrate(deps: ForensicSubstrateDeps = {}) {
  const db = deps.prisma ?? defaultPrisma;
  const logAudit = deps.logAuditEvent ?? defaultLogAuditEvent;
  const generatePacket = deps.generateProofPacket ?? defaultGenerateProofPacket;
  const verifyChain = deps.verifyAuditChain ?? defaultVerifyAuditChain;
  const ingest = deps.ingestExhibit;

  return {
    ingestEvidence: async (input: IngestEvidenceInput) => {
      if (!ingest) {
        throw new Error("ingestExhibit dependency missing");
      }
      return ingest(input);
    },
    resolveAnchors: async (input: ResolveAnchorsInput) => {
      const anchors = await db.anchor.findMany({
        where: {
          exhibitId: input.exhibitId,
          exhibit: { workspaceId: input.workspaceId }
        },
        orderBy: [{ pageNumber: "asc" }, { lineNumber: "asc" }]
      });
      return anchors;
    },
    releaseGateCheck: (input: ReleaseGateInput) => {
      const shouldReject = shouldRejectReleaseGate({
        totalCount: input.totalClaims,
        rejectedCount: input.rejectedClaims
      });
      return {
        approved: !shouldReject,
        reasons: shouldReject ? ["NO_ANCHOR_NO_OUTPUT"] : []
      };
    },
    emitAuditEvent: async (input: AuditEventInput) => {
      return logAudit(input.workspaceId, input.actorId, input.eventType, input.payload);
    },
    exportProofPacket: async (input: ExportProofPacketInput) => {
      return generatePacket(input.workspaceId, input.matterId);
    },
    verifyAuditChain: async (input: VerifyAuditChainInput) => {
      return verifyChain(input.workspaceId);
    },
    getLedgerProof: async (input: LedgerProofInput) => {
      return db.auditLedgerProof.findFirst({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" }
      });
    }
  };
}
