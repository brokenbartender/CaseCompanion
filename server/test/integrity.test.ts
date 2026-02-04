import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyExhibitOnRead } from '../integrity/assertIntegrity.js';

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

test('verifyExhibitOnRead: mismatch revokes and logs', async () => {
  const events: any[] = [];
  const updates: any[] = [];

  const deps = {
    download: async (_key: string) => Buffer.from('TAMPERED'),
    updateExhibit: async (args: { exhibitId: string; data: any }) => {
      updates.push(args);
    },
    logAuditEvent: async (args: { workspaceId: string; actorId: string; eventType: string; payload: any }) => {
      events.push(args);
    },
  };

  const recordedHash = sha256('ORIGINAL');

  const result = await verifyExhibitOnRead(deps, {
    workspaceId: 'w1',
    exhibitId: 'e1',
    actorId: 'u1',
    storageKey: 'k1',
    recordedHash,
    onMismatchReason: 'HASH_MISMATCH_ON_READ',
  });

  assert.equal(result.ok, false);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].exhibitId, 'e1');
  assert.equal(updates[0].data.verificationStatus, 'REVOKED');
  assert.equal(updates[0].data.revocationReason, 'HASH_MISMATCH_ON_READ');

  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'EXHIBIT_INTEGRITY_REVOKED');
  assert.equal(events[0].payload.exhibitId, 'e1');
  assert.equal(events[0].payload.recordedHash, recordedHash);
  assert.ok(typeof events[0].payload.currentHash === 'string');
});

test('verifyExhibitOnRead: match touches verifiedAt', async () => {
  const events: any[] = [];
  const updates: any[] = [];

  const deps = {
    download: async (_key: string) => Buffer.from('OK'),
    updateExhibit: async (args: { exhibitId: string; data: any }) => {
      updates.push(args);
    },
    logAuditEvent: async (args: { workspaceId: string; actorId: string; eventType: string; payload: any }) => {
      events.push(args);
    },
  };

  const recordedHash = sha256('OK');

  const result = await verifyExhibitOnRead(deps, {
    workspaceId: 'w1',
    exhibitId: 'e1',
    actorId: 'u1',
    storageKey: 'k1',
    recordedHash,
    onMismatchReason: 'HASH_MISMATCH_ON_READ',
  });

  assert.equal(result.ok, true);
  assert.equal(events.length, 0);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.verifiedAt instanceof Date, true);
});
