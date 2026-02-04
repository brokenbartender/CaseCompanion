import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import { logAuditEvent } from '../audit.js';

let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

async function createUserWorkspace(suffix: string) {
  const user = await prisma.user.create({
    data: { email: `audit-chain-${suffix}@lexipro.local`, passwordHash: 'hash' }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Audit Chain ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'admin' }
  });
  return { user, workspace };
}

test('verifyAuditChain returns true for valid chain', { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.GENESIS_SEED = 'test-genesis';
  const { verifyAuditChain } = await import('../services/auditService.js');

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { user, workspace } = await createUserWorkspace(`${suffix}-valid`);

  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 1 } });
  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 2 } });
  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 3 } });

  const result = await verifyAuditChain(workspace.id);
  assert.equal(result.valid, true);
});

test('verifyAuditChain detects tampering', { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.GENESIS_SEED = 'test-genesis';
  const { verifyAuditChain } = await import('../services/auditService.js');

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { user, workspace } = await createUserWorkspace(`${suffix}-tamper`);

  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 1 } });
  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 2 } });
  await logAuditEvent(workspace.id, user.id, 'TEST_EVENT', { details: { seq: 3 } });

  const events = await prisma.auditEvent.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });
  assert.equal(events.length, 3);

  const middle = events[1];
  await prisma.auditEvent.update({
    where: { id: middle.id },
    data: { action: 'TAMPERED_ACTION' }
  });

  const result = await verifyAuditChain(workspace.id);
  assert.equal(result.valid, false);
  assert.equal(result.brokenAtId, middle.id);
});
