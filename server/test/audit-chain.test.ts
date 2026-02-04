import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_GENESIS_HASH, computeAuditEventHash } from '../services/auditHash.js';

test('verifyWorkspaceChain detects corrupted hash', async () => {
  const { integrityService } = await import('../integrityService.js');
  const { prisma } = await import('../lib/prisma.js');

  const originalFindMany = prisma.auditEvent.findMany;
  let calls = 0;
  prisma.auditEvent.findMany = (async () => {
    calls += 1;
    if (calls > 1) return [];
    const createdAt = new Date('2026-01-25T00:00:00.000Z');
    const expectedHash = computeAuditEventHash({
      prevHash: AUDIT_GENESIS_HASH,
      timestamp: createdAt.toISOString(),
      actorId: 'u1',
      action: 'TEST',
      details: { ok: true }
    });
    return [
      {
        id: 'evt-1',
        prevHash: AUDIT_GENESIS_HASH,
        actorId: 'u1',
        eventType: 'TEST',
        action: 'TEST',
        detailsJson: JSON.stringify({ ok: true }),
        createdAt,
        hash: `${expectedHash}-tampered`
      }
    ];
  }) as any;

  const result = await integrityService.verifyWorkspaceChain('w1');
  assert.equal(result.isValid, false);
  assert.ok(result.details.length > 0);

  prisma.auditEvent.findMany = originalFindMany;
});
