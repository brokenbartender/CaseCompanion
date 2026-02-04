import test from 'node:test';
import assert from 'node:assert/strict';

test('getWorkspaceIntegrityGate blocks when strict mode audit is stale', async () => {
  const { integrityService } = await import('../integrityService.js');
  const { prisma } = await import('../lib/prisma.js');

  const originalPref = prisma.workspacePreference.findUnique;
  const originalAlert = prisma.integrityAlert.findFirst;
  const originalAudit = prisma.systemAudit.findFirst;
  const originalLedger = prisma.auditLedgerProof.findFirst;

  process.env.INTEGRITY_STRICT_MODE = '1';
  process.env.INTEGRITY_MAX_AGE_MIN = '5';

  prisma.workspacePreference.findUnique = (async () => null) as any;
  prisma.integrityAlert.findFirst = (async () => null) as any;
  prisma.systemAudit.findFirst = (async () => ({
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  })) as any;
  prisma.auditLedgerProof.findFirst = (async () => ({
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  })) as any;

  const gate = await integrityService.getWorkspaceIntegrityGate('w1');
  assert.equal(gate.blocked, true);
  assert.equal(gate.reason, 'INTEGRITY_STALE');

  prisma.workspacePreference.findUnique = originalPref;
  prisma.integrityAlert.findFirst = originalAlert;
  prisma.systemAudit.findFirst = originalAudit;
  prisma.auditLedgerProof.findFirst = originalLedger;
});

test('getWorkspaceIntegrityGate honors strict mode preference override', async () => {
  const { integrityService } = await import('../integrityService.js');
  const { prisma } = await import('../lib/prisma.js');

  const originalPref = prisma.workspacePreference.findUnique;
  const originalAlert = prisma.integrityAlert.findFirst;
  const originalAudit = prisma.systemAudit.findFirst;
  const originalLedger = prisma.auditLedgerProof.findFirst;

  process.env.INTEGRITY_STRICT_MODE = '0';
  process.env.INTEGRITY_MAX_AGE_MIN = '60';

  prisma.workspacePreference.findUnique = (async (args: any) => {
    const key = args?.where?.workspaceId_key?.key;
    if (key === 'integrity.strictMode') return { value: 'true' };
    if (key === 'integrity.maxAgeMin') return { value: '3' };
    return null;
  }) as any;
  prisma.integrityAlert.findFirst = (async () => null) as any;
  prisma.systemAudit.findFirst = (async () => ({
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  })) as any;
  prisma.auditLedgerProof.findFirst = (async () => ({
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  })) as any;

  const gate = await integrityService.getWorkspaceIntegrityGate('w2');
  assert.equal(gate.blocked, true);
  assert.equal(gate.reason, 'INTEGRITY_STALE');

  prisma.workspacePreference.findUnique = originalPref;
  prisma.integrityAlert.findFirst = originalAlert;
  prisma.systemAudit.findFirst = originalAudit;
  prisma.auditLedgerProof.findFirst = originalLedger;
});
