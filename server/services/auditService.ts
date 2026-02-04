import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { signPayload, verifySignature } from '../utils/signing.js';
import fs from 'fs';
import path from 'path';
import { AUDIT_GENESIS_HASH, computeAuditEventHash } from './auditHash.js';

const GENESIS_SEED = process.env.GENESIS_SEED;
if (!GENESIS_SEED) {
  throw new Error('Missing required environment variable: GENESIS_SEED');
}

function sortKeysDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortKeysDeep(val)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function toCanonicalJson(value: any): string {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * Compute the asymmetric signature for a SystemAudit payload.
 * @param payload - Structured audit payload.
 * @param previousLogHash - Previous audit signature hash (or genesis seed).
 * @returns Base64-encoded signature.
 */
function computeAuditSignature(payload: any, previousLogHash?: string | null) {
  const canonical = toCanonicalJson({
    payload,
    previous_log_hash: previousLogHash || GENESIS_SEED
  });
  return signPayload(canonical);
}

async function witnessChainHead(workspaceId: string, signature: string) {
  const witnessPath = path.join(process.cwd(), 'witness_log', workspaceId);
  await fs.promises.mkdir(witnessPath, { recursive: true });

  const witnessEntry = {
    timestamp: new Date().toISOString(),
    signature,
    witness_proof: 'local_fs_v1'
  };

  await fs.promises.appendFile(
    path.join(witnessPath, 'ledger.lock'),
    `${JSON.stringify(witnessEntry)}\n`
  );
}

async function ensureIntegrityAlert(workspaceId: string) {
  const existing = await prisma.integrityAlert.findFirst({
    where: {
      workspaceId,
      type: 'SYSTEM_INTEGRITY_FAILURE',
      resolved: false,
      deletedAt: null
    }
  });
  if (existing) return existing;
  return prisma.integrityAlert.create({
    data: {
      workspaceId,
      type: 'SYSTEM_INTEGRITY_FAILURE',
      severity: 'CRITICAL'
    }
  });
}

/**
 * Persist a SystemAudit entry and advance the HMAC chain.
 * @returns Newly created SystemAudit record.
 */
export async function recordSystemAudit(args: {
  workspaceId: string;
  totalFilesScanned: number;
  integrityFailuresCount: number;
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
  resourceIds: string[];
}) {
  const latest = await prisma.systemAudit.findFirst({
    where: { workspaceId: args.workspaceId },
    orderBy: { createdAt: 'desc' }
  });

  if (latest) {
    const prior = latest.previousLogHash || GENESIS_SEED;
    const payload = {
      workspaceId: latest.workspaceId,
      totalFilesScanned: latest.totalFilesScanned,
      integrityFailuresCount: latest.integrityFailuresCount,
      status: latest.status,
      resourceIdsJson: latest.resourceIdsJson,
      createdAt: latest.createdAt.toISOString()
    };
    const canonical = toCanonicalJson({
      payload,
      previous_log_hash: prior
    });
    if (!verifySignature(canonical, latest.auditSignature)) {
      await ensureIntegrityAlert(args.workspaceId);
    }
  }

  const createdAt = new Date();
  const payload = {
    workspaceId: args.workspaceId,
    totalFilesScanned: args.totalFilesScanned,
    integrityFailuresCount: args.integrityFailuresCount,
    status: args.status,
    resourceIdsJson: JSON.stringify(args.resourceIds || []),
    createdAt: createdAt.toISOString()
  };

  const previousHash = latest?.auditSignature || GENESIS_SEED;
  const auditSignature = computeAuditSignature(payload, previousHash);

  const record = await prisma.systemAudit.create({
    data: {
      workspaceId: args.workspaceId,
      totalFilesScanned: args.totalFilesScanned,
      integrityFailuresCount: args.integrityFailuresCount,
      status: args.status,
      resourceIdsJson: JSON.stringify(args.resourceIds || []),
      previousLogHash: previousHash === GENESIS_SEED ? GENESIS_SEED : previousHash,
      auditSignature,
      createdAt
    }
  });
  witnessChainHead(args.workspaceId, record.auditSignature).catch((err) => {
    console.error('[auditWitness] failed', err?.message || String(err));
  });
  return record;
}

export async function recordLedgerProof(workspaceId: string) {
  const countRows = await prisma.$queryRaw<
    Array<{ count: number }>
  >`SELECT COUNT(*)::int as count FROM "AuditEvent" WHERE "workspaceId" = ${workspaceId}`;
  const maxRows = await prisma.$queryRaw<
    Array<{ id: string; hash: string | null }>
  >`SELECT id, hash FROM "AuditEvent" WHERE "workspaceId" = ${workspaceId} ORDER BY "createdAt" DESC, "id" DESC LIMIT 1`;

  const eventCount = countRows?.[0]?.count ?? 0;
  const maxEventId = maxRows?.[0]?.id || 'NONE';
  const headHash = maxRows?.[0]?.hash || 'NONE';
  const proofHash = crypto
    .createHash('sha256')
    .update(`${workspaceId}:${eventCount}:${maxEventId}:${headHash}`)
    .digest('hex');

  await prisma.$executeRaw`
    INSERT INTO "AuditLedgerProof" ("id", "workspaceId", "eventCount", "maxEventId", "proofHash", "tamperFlag", "createdAt")
    VALUES (md5(random()::text || clock_timestamp()::text), ${workspaceId}, ${eventCount}, ${maxEventId}, ${proofHash}, false, CURRENT_TIMESTAMP)
  `;
  return { workspaceId, eventCount, maxEventId, headHash, proofHash };
}

function parseDetailsJson(detailsJson: string | null) {
  if (!detailsJson) return null;
  try {
    return JSON.parse(detailsJson);
  } catch {
    return detailsJson;
  }
}

export async function verifyAuditChain(workspaceId: string): Promise<{ valid: boolean; brokenAtId?: string; eventCount: number; headHash: string | null; lastEventId: string | null; genesisHash: string }> {
  const events = await prisma.auditEvent.findMany({
    where: { workspaceId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      actorId: true,
      action: true,
      eventType: true,
      detailsJson: true,
      prevHash: true,
      hash: true
    }
  });

  let prevHash = AUDIT_GENESIS_HASH;
  let headHash: string | null = null;
  let lastEventId: string | null = null;

  for (const event of events) {
    const createdAt = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt as any);
    const action = event.action || event.eventType;
    const details = parseDetailsJson(event.detailsJson);
    const expectedHash = computeAuditEventHash({
      prevHash,
      timestamp: createdAt.toISOString(),
      actorId: event.actorId,
      action,
      details
    });

    if (event.prevHash !== prevHash || event.hash !== expectedHash) {
      return {
        valid: false,
        brokenAtId: event.id,
        eventCount: events.length,
        headHash: headHash,
        lastEventId: lastEventId,
        genesisHash: AUDIT_GENESIS_HASH
      };
    }

    prevHash = event.hash;
    headHash = event.hash;
    lastEventId = event.id;
  }

  return {
    valid: true,
    eventCount: events.length,
    headHash,
    lastEventId,
    genesisHash: AUDIT_GENESIS_HASH
  };
}
