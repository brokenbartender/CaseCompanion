import { prisma } from '../lib/prisma.js';
import { verifySignature } from '../utils/signing.js';

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

async function main() {
  const workspaceId = process.argv[2] || process.env.WORKSPACE_ID;
  if (!workspaceId) {
    console.error('Usage: tsx server/scripts/verifyAuditChain.ts <workspaceId>');
    process.exit(1);
  }

  const logs = await prisma.systemAudit.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' }
  });

  let prevSignature: string | null = null;
  let ok = true;

  for (const log of logs) {
    const expectedPrev = prevSignature || GENESIS_SEED;
    if ((log.previousLogHash || null) !== expectedPrev) {
      console.error('CHAIN_MISMATCH: previous_log_hash does not match', {
        auditId: log.auditId,
        expected: expectedPrev,
        got: log.previousLogHash || null
      });
      ok = false;
    }

    const payload = {
      workspaceId: log.workspaceId,
      totalFilesScanned: log.totalFilesScanned,
      integrityFailuresCount: log.integrityFailuresCount,
      status: log.status,
      resourceIdsJson: log.resourceIdsJson,
      createdAt: log.createdAt.toISOString()
    };
    const canonical = toCanonicalJson({
      payload,
      previous_log_hash: log.previousLogHash || GENESIS_SEED
    });
    if (!verifySignature(canonical, log.auditSignature)) {
      console.error('SIGNATURE_MISMATCH', {
        auditId: log.auditId
      });
      ok = false;
    }

    prevSignature = log.auditSignature;
  }

  if (ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Audit chain verified for workspace ${workspaceId} (${logs.length} records)`);
    }
    process.exit(0);
  }

  process.exit(2);
}

main()
  .catch((err) => {
    console.error('VERIFY_CHAIN_FAILED', err?.message || err);
    process.exit(2);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
