import crypto from 'crypto';
import { prisma } from './lib/prisma.js';
import { logAuditEvent } from './audit.js';

export type NegativeKnowledgeInput = {
  workspaceId: string;
  actorId: string;
  requestId: string;
  attemptedClaimType: string;
  reasonCode: string;
  reasonDetail: string;
  requiredEvidenceType: string[] | string;
  anchorIdsConsidered: string[];
};

export type NegativeKnowledgeRecord = {
  id: string;
  workspaceId: string;
  requestId: string;
  attemptedClaimType: string;
  reasonCode: string;
  reasonDetail: string;
  requiredEvidenceType: string[] | string;
  anchorIdsConsidered: string[];
  createdAt: string;
};

export async function recordNegativeKnowledge(input: NegativeKnowledgeInput) {
  const createdAt = new Date().toISOString();
  const negativeId = crypto.randomUUID();
  const payload: NegativeKnowledgeRecord = {
    id: negativeId,
    workspaceId: input.workspaceId,
    requestId: input.requestId,
    attemptedClaimType: input.attemptedClaimType,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
    requiredEvidenceType: input.requiredEvidenceType,
    anchorIdsConsidered: input.anchorIdsConsidered,
    createdAt,
  };

  await logAuditEvent(input.workspaceId, input.actorId, 'NEGATIVE_KNOWLEDGE', payload);
}

export async function listNegativeKnowledge(workspaceId: string, limit = 25) {
  const events = await prisma.auditEvent.findMany({
    where: { workspaceId, eventType: 'NEGATIVE_KNOWLEDGE' },
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
      workspaceId: payload.workspaceId || event.workspaceId,
      requestId: payload.requestId || '',
      attemptedClaimType: payload.attemptedClaimType || '',
      reasonCode: payload.reasonCode || '',
      reasonDetail: payload.reasonDetail || '',
      requiredEvidenceType: payload.requiredEvidenceType || [],
      anchorIdsConsidered: payload.anchorIdsConsidered || [],
      createdAt: payload.createdAt || event.createdAt.toISOString(),
    } as NegativeKnowledgeRecord;
  });
}
