import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from './lib/prisma.js';
import { computeAuditEventHash, AUDIT_GENESIS_HASH } from './services/auditHash.js';
import { storageService } from './storageService.js';
import { logGovernanceEvaluation } from './services/unifiedGovernanceClient.js';

const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM;
if (!PRIVATE_KEY_PEM && process.env.NODE_ENV === 'production' && !process.env.RENDER) {
  throw new Error('Missing required environment variable: PRIVATE_KEY_PEM');
}

const REDACT_KEYS = new Set([
  'filename',
  'storageKey',
  'storage_key',
  'filePath',
  'path',
  'ip',
  'userAgent',
  'email',
  'text',
  'snippet',
  'excerpt'
]);

export function redactAuditPayload(value: any): any {
  if (Array.isArray(value)) {
    return value.map((entry) => redactAuditPayload(entry));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (REDACT_KEYS.has(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactAuditPayload(val);
      }
    }
    return out;
  }
  return value;
}

export function sanitizeAuditEvent(event: any) {
  if (!event) return event;
  let payloadJson = event.payloadJson;
  if (payloadJson) {
    try {
      const parsed = JSON.parse(payloadJson);
      payloadJson = JSON.stringify(redactAuditPayload(parsed));
    } catch {
      // leave as-is
    }
  }
  let detailsJson = event.detailsJson;
  if (detailsJson) {
    try {
      const parsed = JSON.parse(detailsJson);
      detailsJson = JSON.stringify(redactAuditPayload(parsed));
    } catch {
      // leave as-is
    }
  }
  return {
    ...event,
    payloadJson,
    detailsJson
  };
}

export const logAuditEvent = async (workspaceId: string, actorId: string, eventType: string, payload: any) => {
  const MAX_RETRIES = 3;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // 1. Fetch last event for this workspace to get previous hash
      const lastEvent = await prisma.auditEvent.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' }
      });

      const prevHash = lastEvent?.hash || AUDIT_GENESIS_HASH;
      const payloadEnvelope = (payload && typeof payload === 'object' && !Array.isArray(payload))
        ? { ...payload }
        : { value: payload };
      const action = typeof payload?.action === 'string' ? payload.action : eventType;
      const resourceId = typeof payload?.resourceId === 'string' ? payload.resourceId : null;
      const details = payload?.details ?? null;
      const detailsJson = details !== null ? JSON.stringify(details) : null;
      const query = typeof payload?.query === 'string' ? payload.query : null;
      const response = typeof payload?.response === 'string' ? payload.response : null;
      const createdAt = new Date();

      // 2. Compute current hash: SHA-256(prevHash|timestamp|actorId|action|details)
      const hash = computeAuditEventHash({
        prevHash,
        timestamp: createdAt.toISOString(),
        actorId,
        action,
        details
      });
      payloadEnvelope.auditHashMode = 'sha256-v1';
      const payloadStr = JSON.stringify(redactAuditPayload(payloadEnvelope));

      // 3. Persist
      const event = await prisma.auditEvent.create({
        data: {
          workspaceId,
          actorId,
          eventType,
          action,
          resourceId,
          payloadJson: payloadStr,
          detailsJson,
          query,
          response,
          prevHash,
          hash,
          createdAt
        }
      });

      // 4. Fire-and-forget log shipping
      try {
        const createdAt = event.createdAt instanceof Date
          ? event.createdAt
          : new Date(event.createdAt as any);
        const year = createdAt.getUTCFullYear();
        const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
        const day = String(createdAt.getUTCDate()).padStart(2, '0');
        const actorRecord = await prisma.user.findUnique({
          where: { id: actorId },
          select: { email: true }
        }).catch(() => null);
        const actor = actorRecord?.email || actorId;
        const backupPayload = {
          id: event.id,
          workspaceId,
          hash,
          prevHash,
          signature: hash,
          timestamp: createdAt.toISOString(),
          action: eventType,
          actor
        };
        const key = `_audit_log_shipping/${workspaceId}/${year}/${month}/${day}/${event.id}.json`;
        void storageService.upload(key, Buffer.from(JSON.stringify(backupPayload)))
          .catch((err) => {
            console.error('AUDIT_SHIPPING_FAIL', err?.message || String(err));
          });
        void logGovernanceEvaluation({
          principal: actor,
          action: eventType,
          metadata: {
            workspaceId,
            auditEventId: event.id,
            auditHash: event.hash
          }
        });
      } catch (err: any) {
        console.error('AUDIT_SHIPPING_FAIL', err?.message || String(err));
      }

      return event;
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to log audit event after ${MAX_RETRIES} attempts due to chain contention.`);
};

export const logAdminAction = async (workspaceId: string, actorId: string, action: string, payload: any) => {
  const payloadEnvelope = (payload && typeof payload === 'object' && !Array.isArray(payload))
    ? { ...payload }
    : { value: payload };
  const payloadStr = JSON.stringify(redactAuditPayload(payloadEnvelope));
  const record = await prisma.auditLog.create({
    data: {
      workspaceId,
      actorId,
      action,
      payloadJson: payloadStr
    }
  });
  return record;
};
