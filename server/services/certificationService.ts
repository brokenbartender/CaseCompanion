import { prisma } from '../lib/prisma.js';
import { getPublicKeyFingerprint, signPayload } from '../utils/signing.js';

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

export async function generateForensicCertificate(exhibitId: string, workspaceId: string) {
  const [exhibit, audits, unresolvedAlerts] = await prisma.$transaction([
    prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        filename: true,
        integrityHash: true,
        verificationStatus: true,
        createdAt: true
      }
    }),
    prisma.systemAudit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        auditId: true,
        status: true,
        totalFilesScanned: true,
        integrityFailuresCount: true,
        createdAt: true
      }
    }),
    prisma.integrityAlert.count({
      where: { workspaceId, exhibitId, resolved: false, deletedAt: null }
    })
  ]);

  if (!exhibit) {
    return null;
  }

  const manifest = {
    workspace_id: workspaceId,
    exhibit: {
      id: exhibit.id,
      filename: exhibit.filename,
      integrity_hash: exhibit.integrityHash,
      verification_status: exhibit.verificationStatus,
      created_at: exhibit.createdAt.toISOString()
    },
    audits: audits.map((audit: any) => ({
      audit_id: audit.auditId,
      status: audit.status,
      total_files_scanned: audit.totalFilesScanned,
      integrity_failures_count: audit.integrityFailuresCount,
      timestamp: audit.createdAt.toISOString()
    }))
  };

  const canonicalJson = toCanonicalJson(manifest);
  const signature = signPayload(canonicalJson);
  const publicKeyFingerprint = getPublicKeyFingerprint();
  const voided = unresolvedAlerts > 0;

  return {
    manifest,
    canonicalJson,
    signature,
    publicKeyFingerprint,
    verifyStatus: voided ? 'VOID' : 'VERIFIED',
    alertCount: unresolvedAlerts
  };
}
