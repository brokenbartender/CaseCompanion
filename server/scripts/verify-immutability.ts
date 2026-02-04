import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

async function verifyImmutability() {
  console.log('TEST: Attempting to illegally modify Audit Log...');

  const membership = await prisma.workspaceMember.findFirst({
    select: { workspaceId: true, userId: true }
  });

  if (!membership) {
    console.error('No workspace member found. Create a user/workspace before running this test.');
    process.exit(1);
  }

  const prevHash = crypto.randomBytes(32).toString('hex');
  const hash = crypto.randomBytes(32).toString('hex');
  const event = await prisma.auditEvent.create({
    data: {
      workspaceId: membership.workspaceId,
      eventType: 'IMMUTABILITY_TEST',
      actorId: membership.userId,
      payloadJson: JSON.stringify({ test: true }),
      prevHash,
      hash
    }
  });

  try {
    await prisma.auditEvent.delete({
      where: { id: event.id }
    });

    console.error('CRITICAL FAIL: Database permitted deletion. WORM lock is broken.');
    process.exit(1);
  } catch (err: any) {
    const message = String(err?.message || '');
    if (message.includes('Security Violation (Code 17a-4)')) {
      console.log('SUCCESS: Database rejected the attack.');
      console.log(`Reason: ${err?.meta?.message || 'Audit logs are immutable.'}`);
    } else {
      console.error('UNEXPECTED ERROR:', message);
      process.exit(1);
    }
  }
}

verifyImmutability()
  .catch((err) => {
    console.error('Test failed:', err?.message || String(err));
    process.exit(1);
  });
