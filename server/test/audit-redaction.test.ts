import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSigningKeys } from './helpers/signingKeys.js';

test('audit redaction masks ip and userAgent', async () => {
  ensureSigningKeys();
  const { logAuditEvent, redactAuditPayload, sanitizeAuditEvent } = await import('../audit.js');
  const { prisma } = await import('../lib/prisma.js');

  const originalFindFirst = prisma.auditEvent.findFirst;
  const originalCreate = prisma.auditEvent.create;
  let captured: any = null;

  prisma.auditEvent.findFirst = (async () => null) as any;
  prisma.auditEvent.create = (async (args: any) => {
    captured = args;
    return args;
  }) as any;

  await logAuditEvent('w1', 'u1', 'TEST_EVENT', {
    ip: '127.0.0.1',
    userAgent: 'UnitTestAgent',
    email: 'pii@example.com',
    note: 'ok'
  });

  const payload = JSON.parse(captured?.data?.payloadJson || '{}');
  assert.equal(payload.ip, '[REDACTED]');
  assert.equal(payload.userAgent, '[REDACTED]');
  assert.equal(payload.email, '[REDACTED]');
  assert.equal(payload.note, 'ok');
  const responseRedaction = redactAuditPayload({ email: 'person@example.com', text: 'Sensitive' });
  assert.equal(responseRedaction.email, '[REDACTED]');
  assert.equal(responseRedaction.text, '[REDACTED]');

  const sanitized = sanitizeAuditEvent({
    payloadJson: JSON.stringify({ email: 'pii@example.com', text: 'Secret', note: 'ok' }),
    detailsJson: JSON.stringify({ ip: '127.0.0.1', userAgent: 'UnitTestAgent' })
  });
  const sanitizedPayload = JSON.parse(sanitized.payloadJson);
  const sanitizedDetails = JSON.parse(sanitized.detailsJson);
  assert.equal(sanitizedPayload.email, '[REDACTED]');
  assert.equal(sanitizedPayload.text, '[REDACTED]');
  assert.equal(sanitizedDetails.ip, '[REDACTED]');
  assert.equal(sanitizedDetails.userAgent, '[REDACTED]');

  prisma.auditEvent.findFirst = originalFindFirst;
  prisma.auditEvent.create = originalCreate;
});
