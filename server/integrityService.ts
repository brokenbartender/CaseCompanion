import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { convertToPdfA } from './services/pdfaService.js';
import { storageService } from './storageService.js';
import { integrityAlertService } from './services/integrityAlertService.js';

import { prisma } from './lib/prisma.js';
import { logAuditEvent } from './audit.js';
import { sha256OfBuffer } from './utils/hashUtils.js';
import { getPublicKeyFingerprint, signPayload } from './utils/signing.js';
import { AUDIT_GENESIS_HASH, computeAuditEventHash } from './services/auditHash.js';
import { stampUnverifiedDraft } from './services/exportService.js';

export interface VerificationResult {
  isValid: boolean;
  eventCount: number;
  integrityHash: string | null;
  details: any[];
  physicalAssetsVerified?: number;
  physicalAssetFailures?: string[];
}

type AuditEventRow = {
  id: string;
  prevHash: string;
  actorId: string;
  eventType: string;
  action: string | null;
  detailsJson: string | null;
  hash: string;
  createdAt: Date | string;
};

const INTEGRITY_QUARANTINE_KEY = 'integrity.quarantine';
const INTEGRITY_STRICT_MODE_KEY = 'integrity.strictMode';
const INTEGRITY_MAX_AGE_KEY = 'integrity.maxAgeMin';
const INTEGRITY_QUARANTINE_TYPES = ['CHAIN_BREAK', 'HASH_MISMATCH', 'SYSTEM_INTEGRITY_FAILURE'] as const;
const INTEGRITY_GATE_CACHE_MS = Math.max(0, Number(process.env.INTEGRITY_GATE_CACHE_MS || 5000));
const integrityGateCache = new Map<string, { at: number; value: any }>();

async function sha256ForStorageKey(storageKey: string): Promise<string> {
  const data = await storageService.download(storageKey);
  return sha256OfBuffer(data);
}

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

/**
 * Compute the asymmetric signature for an integrity report payload.
 * @param payload - Structured report payload for signing.
 * @returns Base64-encoded signature.
 */
function computeReportSignature(payload: any) {
  const canonical = toCanonicalJson(payload);
  return signPayload(canonical);
}

function parseBoolean(value: string | null | undefined) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

async function readWorkspacePreference(workspaceId: string, key: string) {
  return prisma.workspacePreference.findUnique({
    where: {
      workspaceId_key: {
        workspaceId,
        key
      }
    }
  });
}

async function upsertWorkspacePreference(workspaceId: string, key: string, value: string) {
  return prisma.workspacePreference.upsert({
    where: {
      workspaceId_key: {
        workspaceId,
        key
      }
    },
    update: {
      value
    },
    create: {
      workspaceId,
      key,
      value
    }
  });
}

export const integrityService = {
  async setWorkspaceQuarantine(workspaceId: string, args: { reason: string; source?: string; details?: any; actorId?: string }) {
    const payload = {
      reason: args.reason,
      source: args.source || 'system',
      details: args.details || null,
      setAt: new Date().toISOString()
    };
    integrityGateCache.delete(workspaceId);
    await upsertWorkspacePreference(workspaceId, INTEGRITY_QUARANTINE_KEY, JSON.stringify(payload));
    await logAuditEvent(workspaceId, args.actorId || 'system', 'INTEGRITY_QUARANTINE_SET', payload).catch(() => null);
    integrityAlertService.broadcast({
      type: 'INTEGRITY_QUARANTINE_SET',
      workspaceId,
      payload
    });
    return payload;
  },
  async clearWorkspaceQuarantine(workspaceId: string, args: { actorId?: string; reason?: string } = {}) {
    integrityGateCache.delete(workspaceId);
    await prisma.workspacePreference.delete({
      where: {
        workspaceId_key: {
          workspaceId,
          key: INTEGRITY_QUARANTINE_KEY
        }
      }
    }).catch(() => null);
    await logAuditEvent(workspaceId, args.actorId || 'system', 'INTEGRITY_QUARANTINE_CLEARED', {
      reason: args.reason || 'CLEARED'
    }).catch(() => null);
    integrityAlertService.broadcast({
      type: 'INTEGRITY_QUARANTINE_CLEARED',
      workspaceId,
      payload: { reason: args.reason || 'CLEARED' }
    });
  },
  async getWorkspaceIntegrityGate(workspaceId: string) {
    if (INTEGRITY_GATE_CACHE_MS > 0) {
      const cached = integrityGateCache.get(workspaceId);
      if (cached && Date.now() - cached.at < INTEGRITY_GATE_CACHE_MS) {
        return cached.value;
      }
    }
    const pref = await readWorkspacePreference(workspaceId, INTEGRITY_QUARANTINE_KEY);
    if (pref?.value) {
      try {
        const parsed = JSON.parse(pref.value);
      const result = {
        blocked: true,
        reason: parsed?.reason || 'INTEGRITY_QUARANTINED',
        source: parsed?.source || 'preference',
        setAt: parsed?.setAt || pref.updatedAt?.toISOString?.() || null,
        details: parsed?.details || null
      };
      integrityGateCache.set(workspaceId, { at: Date.now(), value: result });
      return result;
    } catch {
        const result = {
          blocked: true,
          reason: pref.value,
          source: 'preference',
          setAt: pref.updatedAt?.toISOString?.() || null,
          details: null
        };
        integrityGateCache.set(workspaceId, { at: Date.now(), value: result });
        return result;
      }
    }

    const alert = await prisma.integrityAlert.findFirst({
      where: {
        workspaceId,
        resolved: false,
        deletedAt: null,
        severity: 'CRITICAL',
        type: { in: INTEGRITY_QUARANTINE_TYPES as any }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (alert) {
      const payload = await this.setWorkspaceQuarantine(workspaceId, {
        reason: `ALERT_${alert.type}`,
        source: 'integrity-alert',
        details: { alertId: alert.id }
      });
      const result = {
        blocked: true,
        reason: payload.reason,
        source: payload.source,
        setAt: payload.setAt,
        details: payload.details
      };
      integrityGateCache.set(workspaceId, { at: Date.now(), value: result });
      return result;
    }

    const [strictPref, maxAgePref] = await Promise.all([
      readWorkspacePreference(workspaceId, INTEGRITY_STRICT_MODE_KEY),
      readWorkspacePreference(workspaceId, INTEGRITY_MAX_AGE_KEY)
    ]);
    const strictOverride = parseBoolean(strictPref?.value);
    const strictMode = strictOverride ?? ['1', 'true', 'yes'].includes(String(process.env.INTEGRITY_STRICT_MODE || '').toLowerCase());
    if (strictMode) {
      const maxAgeRaw = maxAgePref?.value ? Number(maxAgePref.value) : Number(process.env.INTEGRITY_MAX_AGE_MIN || 60);
      const maxAgeMin = Math.max(1, Number.isFinite(maxAgeRaw) ? maxAgeRaw : 60);
      const now = Date.now();
      const [latestAudit, latestLedger] = await Promise.all([
        prisma.systemAudit.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLedgerProof.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const auditAgeMin = latestAudit?.createdAt
        ? (now - new Date(latestAudit.createdAt).getTime()) / 60000
        : null;
      const ledgerAgeMin = latestLedger?.createdAt
        ? (now - new Date(latestLedger.createdAt).getTime()) / 60000
        : null;

      if (!latestAudit || !latestLedger || latestAudit.status !== 'SUCCESS' || (auditAgeMin != null && auditAgeMin > maxAgeMin) || (ledgerAgeMin != null && ledgerAgeMin > maxAgeMin)) {
        const result = {
          blocked: true,
          reason: 'INTEGRITY_STALE',
          source: 'strict-mode',
          setAt: latestAudit?.createdAt?.toISOString?.() || null,
          details: {
            maxAgeMin,
            auditAgeMin,
            ledgerAgeMin,
            auditStatus: latestAudit?.status || null,
            strictOverride: strictOverride ?? null
          }
        };
        integrityGateCache.set(workspaceId, { at: Date.now(), value: result });
        return result;
      }
    }

    const result = { blocked: false };
    integrityGateCache.set(workspaceId, { at: Date.now(), value: result });
    return result;
  },
  /**
   * VERIFY HASH CHAIN
   * Merkle-style traversal of the audit ledger
   */
  async verifyWorkspaceChain(workspaceId: string): Promise<VerificationResult> {
    let isValid = true;
    const details: Array<{ eventId: string; status: 'TAMPERED'; reason: 'Hash Mismatch' | 'Chain Break' }> = [];
    const batchSize = 1000;
    let lastId: string | null = null;
    let prevHash = AUDIT_GENESIS_HASH;
    let eventCount = 0;
    let integrityHash: string | null = null;

    while (true) {
      const events: AuditEventRow[] = await prisma.auditEvent.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: batchSize,
        ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
        select: {
          id: true,
          prevHash: true,
          actorId: true,
          eventType: true,
          action: true,
          detailsJson: true,
          hash: true,
          createdAt: true
        }
      });

      if (events.length === 0) {
        break;
      }

      for (const event of events) {
        const createdAt = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt);
        const action = event.action || event.eventType;
        let detailsPayload: any = null;
        if (event.detailsJson) {
          try {
            detailsPayload = JSON.parse(event.detailsJson);
          } catch {
            detailsPayload = event.detailsJson;
          }
        }
        const expectedHash = computeAuditEventHash({
          prevHash,
          timestamp: createdAt.toISOString(),
          actorId: event.actorId,
          action,
          details: detailsPayload
        });
        const isCurrentValid = event.hash === expectedHash;
        const isLinkValid = event.prevHash === prevHash;

        if (!isCurrentValid || !isLinkValid) {
          isValid = false;
          details.push({ 
            eventId: event.id, 
            status: 'TAMPERED', 
            reason: !isCurrentValid ? 'Hash Mismatch' : 'Chain Break' 
          });
        }

        prevHash = event.hash;
        integrityHash = event.hash;
        eventCount += 1;
        lastId = event.id;
      }
    }

    return {
      isValid,
      eventCount,
      integrityHash,
      details
    };
  },

  /**
   * PHYSICAL ASSET AUDIT
   * Performs a bit-by-bit check of physical files on disk against the ledger.
   */
  async performPhysicalDeepAudit(workspaceId: string): Promise<VerificationResult> {
    const baseResult = await this.verifyWorkspaceChain(workspaceId);
    const exhibits = await prisma.exhibit.findMany({ where: { workspaceId } });
    
    let verifiedCount = 0;
    const failures: string[] = [];

    for (const ex of exhibits) {
      try {
        const currentPhysicalHash = await sha256ForStorageKey(ex.storageKey);
        if (currentPhysicalHash !== ex.integrityHash) {
          failures.push(`${ex.filename}: Bit-mismatch. Recorded: ${ex.integrityHash.slice(0, 8)}, Physical: ${currentPhysicalHash.slice(0, 8)}`);
        } else {
          verifiedCount++;
        }
      } catch (err) {
        failures.push(`${ex.filename}: Storage access error.`);
      }
    }

    return {
      ...baseResult,
      isValid: baseResult.isValid && failures.length === 0,
      physicalAssetsVerified: verifiedCount,
      physicalAssetFailures: failures
    };
  },

  /**
   * GENERATE SIGNED INTEGRITY REPORT
   * SOC 2 Type II Diligence Evidence
   */
  async generateSignedReport(workspaceId: string, result: VerificationResult): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const timestamp = new Date().toISOString();

    page.drawText('LEXIPRO FORENSIC OS: INTEGRITY CERTIFICATE', {
      x: 50,
      y: height - 50,
      size: 18,
      font: timesRomanFont,
      color: rgb(0, 0, 0.5),
    });

    page.drawText(`Workspace ID: ${workspaceId}`, { x: 50, y: height - 80, size: 10, font: timesRomanFont });
    page.drawText(`Generated: ${timestamp}`, { x: 50, y: height - 95, size: 10, font: timesRomanFont });

    page.drawText('AUDIT STATUS:', { x: 50, y: height - 130, size: 12, font: timesRomanFont });
    const statusColor = result.isValid ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
    page.drawText(result.isValid ? 'VERIFIED - CHAIN INTEGRITY MAINTAINED' : 'FAILED - INTEGRITY BREACH DETECTED', {
      x: 150,
      y: height - 130,
      size: 12,
      font: timesRomanFont,
      color: statusColor,
    });

    page.drawText(`Total Ledger Events: ${result.eventCount}`, { x: 50, y: height - 160, size: 10, font: timesRomanFont });
    page.drawText(`Physical Assets Verified: ${result.physicalAssetsVerified || 0}`, { x: 50, y: height - 175, size: 10, font: timesRomanFont });
    
    page.drawText(`Final Forensic Hash (Head):`, { x: 50, y: height - 200, size: 10, font: timesRomanFont });
    page.drawText(result.integrityHash || 'N/A', { x: 50, y: height - 215, size: 8, font: courierFont, color: rgb(0.3, 0.3, 0.3) });

    if (result.physicalAssetFailures && result.physicalAssetFailures.length > 0) {
      page.drawText('CRITICAL FAILURES DETECTED:', { x: 50, y: height - 240, size: 10, font: timesRomanFont, color: rgb(0.8, 0, 0) });
      result.physicalAssetFailures.slice(0, 10).forEach((fail, idx) => {
        page.drawText(`- ${fail}`, { x: 60, y: height - 255 - (idx * 12), size: 7, font: courierFont });
      });
    }

    page.drawText('DISCLAIMER: This document serves as mathematical proof of data immutability.', { 
      x: 50, 
      y: 50, 
      size: 8, 
      font: timesRomanItalicFont 
    });

    const publicKeyFingerprint = getPublicKeyFingerprint();
    const reportSignature = computeReportSignature({
      timestamp,
      workspaceId,
      integrityHash: result.integrityHash,
      eventCount: result.eventCount,
      physicalAssetsVerified: result.physicalAssetsVerified || 0,
      failureCount: result.physicalAssetFailures?.length || 0,
      publicKeyFingerprint
    });
    page.drawRectangle({
      x: 50,
      y: 60,
      width: 500,
      height: 60,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    page.drawText('SYSTEM DIGITAL SIGNATURE (BASE64)', { x: 60, y: 110, size: 8, font: timesRomanFont });
    page.drawText(`Public Key Fingerprint (SHA-256): ${publicKeyFingerprint}`, { x: 60, y: 95, size: 7, font: courierFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(reportSignature, { x: 60, y: 75, size: 7, font: courierFont, color: rgb(0.4, 0.4, 0.4) });

    const pdfBytes = await convertToPdfA(
      Buffer.from(await stampUnverifiedDraft(await pdfDoc.save())),
      { sourceLabel: 'integrity_certificate' }
    );
    const filename = `reports/integrity-report-${workspaceId}-${Date.now()}.pdf`;
    await storageService.upload(filename, Buffer.from(pdfBytes));

    return filename;
  },


  /**
   * VERIFY EXHIBIT ON READ
   * Rehashes asset from storage and auto-revokes on mismatch.
   */
  async verifyExhibitOnRead(opts: {
    workspaceId: string;
    exhibitId: string;
    actorId: string;
    storageKey: string;
    recordedHash: string;
    matterId?: string;
  }): Promise<{ ok: true; currentHash: string } | { ok: false; currentHash: string }> {
    const { workspaceId, exhibitId, actorId, storageKey, recordedHash, matterId } = opts;
    if (!matterId) {
      await logAuditEvent(workspaceId, actorId || 'system', 'SECURITY_ANOMALY_CONTEXT_MISSING', {
        targetExhibit: exhibitId,
        reason: 'Request rejected: No Matter ID provided in session context.'
      });
      throw new Error('Access Denied: Compliance Policy requires an active Matter Context.');
    }

    const scoped = await prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId, matterId },
      select: { id: true }
    });
    if (!scoped) {
      throw new Error('Asset access denied or not found.');
    }
    const currentHash = await sha256ForStorageKey(storageKey);

    if (currentHash !== recordedHash) {
      await prisma.exhibit.update({
        where: { id: exhibitId },
        data: {
          verificationStatus: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: 'HASH_MISMATCH_ON_READ',
        },
      });

      await logAuditEvent(workspaceId, actorId, 'EXHIBIT_INTEGRITY_REVOKED', {
        exhibitId,
        storageKey,
        recordedHash,
        currentHash,
        reason: 'HASH_MISMATCH_ON_READ',
      });

      const existingAlert = await prisma.integrityAlert.findFirst({
        where: {
          workspaceId,
          exhibitId,
          type: 'HASH_MISMATCH',
          resolved: false,
          deletedAt: null
        }
      });
      if (!existingAlert) {
        await prisma.integrityAlert.create({
          data: {
            workspaceId,
            exhibitId,
            type: 'HASH_MISMATCH',
            severity: 'CRITICAL'
          }
        }).catch(() => null);
      }
      await this.setWorkspaceQuarantine(workspaceId, {
        reason: 'HASH_MISMATCH_ON_READ',
        source: 'verifyExhibitOnRead',
        details: { exhibitId }
      }).catch(() => null);

      return { ok: false, currentHash };
    }

    // Touch verifiedAt on successful verification for certified exhibits.
    await prisma.exhibit.update({
      where: { id: exhibitId },
      data: { verifiedAt: new Date() },
    }).catch(() => null);

    return { ok: true, currentHash };
  },

  /**
   * PHYSICAL DEEP AUDIT (MUTATING)
   * Rehashes every exhibit and auto-revokes on mismatch.
   */
  async performContinuousAudit(workspaceId: string, actorId: string): Promise<VerificationResult & { revokedCount: number }> {
    const baseResult = await this.verifyWorkspaceChain(workspaceId);
    const exhibits = await prisma.exhibit.findMany({ where: { workspaceId } });

    let verifiedCount = 0;
    let revokedCount = 0;
    const failures: string[] = [];
    const tombstoneStore = (prisma as any).tombstone;
    const findTombstone = tombstoneStore
      ? (exhibitId: string) => tombstoneStore.findFirst({ where: { exhibitId } })
      : async () => null;

    for (const ex of exhibits) {
      try {
        const currentHash = await sha256ForStorageKey(ex.storageKey);
        if (currentHash !== ex.integrityHash) {
          const tombstone = await findTombstone(ex.id);
          if (tombstone) {
            await logAuditEvent(workspaceId, actorId, 'EXHIBIT_LEGALLY_DELETED', {
              exhibitId: ex.id,
              storageKey: ex.storageKey,
              recordedHash: ex.integrityHash,
              currentHash,
              status: 'LEGALLY_DELETED'
            });
            continue;
          }
          revokedCount++;
          failures.push(`${ex.filename}: Bit-mismatch. Recorded: ${ex.integrityHash.slice(0,8)}, Physical: ${currentHash.slice(0,8)}`);
          await prisma.exhibit.update({
            where: { id: ex.id },
            data: {
              verificationStatus: 'REVOKED',
              revokedAt: new Date(),
              revocationReason: 'HASH_MISMATCH_AUDIT',
            },
          });
          await logAuditEvent(workspaceId, actorId, 'EXHIBIT_INTEGRITY_REVOKED', {
            exhibitId: ex.id,
            storageKey: ex.storageKey,
            recordedHash: ex.integrityHash,
            currentHash,
            reason: 'HASH_MISMATCH_AUDIT',
            });
        } else {
          verifiedCount++;
          await prisma.exhibit.update({
            where: { id: ex.id },
            data: {
              // keep current status unless already revoked; touch verifiedAt for certified exhibits
              verifiedAt: ex.verificationStatus === 'CERTIFIED' ? new Date() : ex.verifiedAt,
            },
          }).catch(() => null);
        }
      } catch (err) {
        const tombstone = await findTombstone(ex.id);
        if (tombstone) {
          await logAuditEvent(workspaceId, actorId, 'EXHIBIT_LEGALLY_DELETED', {
            exhibitId: ex.id,
            storageKey: ex.storageKey,
            status: 'LEGALLY_DELETED'
          });
          continue;
        }
        failures.push(`${ex.filename}: Storage access error.`);
      }
    }

    return {
      ...baseResult,
      isValid: baseResult.isValid && failures.length == 0,
      physicalAssetsVerified: verifiedCount,
      physicalAssetFailures: failures,
      revokedCount,
    };
  },
};
