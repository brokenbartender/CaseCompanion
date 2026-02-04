import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Centralized Prisma client ensures consistent logging + shared connection handling.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env')
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['query', 'error', 'warn'],
  });

let vectorCleanupLock = false;
prisma.$use(async (params, next) => {
  if (vectorCleanupLock) {
    return next(params);
  }
  const isMatterDelete = params.model === 'Matter' && (params.action === 'delete' || params.action === 'deleteMany');
  if (!isMatterDelete) {
    return next(params);
  }
  const matterId = params.action === 'delete' ? params.args?.where?.id : null;
  const result = await next(params);
  if (matterId) {
    vectorCleanupLock = true;
    try {
      await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "matterId" = ${matterId}`;
      await prisma.$executeRaw`
        DELETE FROM "TranscriptSegment"
        WHERE "exhibitId" IN (SELECT "id" FROM "Exhibit" WHERE "matterId" = ${matterId})
      `;
    } finally {
      vectorCleanupLock = false;
    }
  }
  return result;
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
