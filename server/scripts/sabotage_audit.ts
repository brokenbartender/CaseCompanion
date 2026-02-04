import { prisma } from '../lib/prisma.js';

async function main() {
  const latest = await prisma.auditEvent.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!latest) {
    console.log('[SABOTAGE] No audit events found.');
    return;
  }

  await prisma.auditEvent.delete({ where: { id: latest.id } });
  console.log(`[SABOTAGE] Audit Event ${latest.id} deleted. Chain is now broken.`);
}

main()
  .catch((err) => {
    console.error('[SABOTAGE] Failed', err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
