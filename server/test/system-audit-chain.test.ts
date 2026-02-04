import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSigningKeys } from './helpers/signingKeys.js';

test('recordSystemAudit signs payload with asymmetric signature', async () => {
  ensureSigningKeys();
  process.env.GENESIS_SEED = 'test-genesis';
  const { recordSystemAudit } = await import('../services/auditService.js');
  const { prisma } = await import('../lib/prisma.js');

  const originalFindFirst = prisma.systemAudit.findFirst;
  const originalCreate = prisma.systemAudit.create;
  let captured: any = null;

  prisma.systemAudit.findFirst = (async () => null) as any;
  prisma.systemAudit.create = (async (args: any) => {
    captured = args;
    return args;
  }) as any;

  await recordSystemAudit({
    workspaceId: 'w1',
    totalFilesScanned: 1,
    integrityFailuresCount: 0,
    status: 'SUCCESS',
    resourceIds: []
  });

  assert.ok(captured?.data?.auditSignature);
  assert.equal(captured?.data?.previousLogHash, 'test-genesis');

  prisma.systemAudit.findFirst = originalFindFirst;
  prisma.systemAudit.create = originalCreate;
});
