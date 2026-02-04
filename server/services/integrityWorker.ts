import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { integrityService } from '../integrityService.js';
import { storageService } from '../storageService.js';
import { recordLedgerProof, recordSystemAudit } from './auditService.js';
import { sha256OfBuffer } from '../utils/hashUtils.js';

async function sha256ForStorageKey(storageKey: string): Promise<string> {
  const data = await storageService.download(storageKey);
  return sha256OfBuffer(data);
}

async function createAlertOnce(args: {
  workspaceId: string;
  exhibitId?: string | null;
  type: 'HASH_MISMATCH' | 'FILE_MISSING' | 'CHAIN_BREAK' | 'SYSTEM_INTEGRITY_FAILURE';
  severity?: 'CRITICAL' | 'WARNING';
}) {
  const existing = await prisma.integrityAlert.findFirst({
    where: {
      workspaceId: args.workspaceId,
      exhibitId: args.exhibitId || null,
      type: args.type,
      resolved: false,
      deletedAt: null
    }
  });
  if (existing) return existing;
  return prisma.integrityAlert.create({
    data: {
      workspaceId: args.workspaceId,
      exhibitId: args.exhibitId || null,
      type: args.type,
      severity: args.severity || 'CRITICAL'
    }
  });
}

export async function runIntegrityAudit(workspaceId: string) {
  const ledger = await integrityService.verifyWorkspaceChain(workspaceId);
  const chainBreaks = (ledger.details || []).filter((detail: any) => detail?.reason === 'Chain Break');
  if (chainBreaks.length) {
    await createAlertOnce({ workspaceId, type: 'CHAIN_BREAK' });
  }

  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId },
    select: { id: true, storageKey: true, integrityHash: true }
  });

  const failedExhibitIds: string[] = [];

  for (const ex of exhibits) {
    try {
      const currentHash = await sha256ForStorageKey(ex.storageKey);
      if (currentHash !== ex.integrityHash) {
        failedExhibitIds.push(ex.id);
        await createAlertOnce({ workspaceId, exhibitId: ex.id, type: 'HASH_MISMATCH' });
      }
    } catch {
      failedExhibitIds.push(ex.id);
      await createAlertOnce({ workspaceId, exhibitId: ex.id, type: 'FILE_MISSING' });
    }
  }

  const failureCount = failedExhibitIds.length + chainBreaks.length;
  const status = failureCount > 0 || !ledger.isValid ? 'CRITICAL' : 'SUCCESS';

  await recordSystemAudit({
    workspaceId,
    totalFilesScanned: exhibits.length,
    integrityFailuresCount: failureCount,
    status,
    resourceIds: failedExhibitIds
  });

  if (status === 'CRITICAL') {
    await integrityService.setWorkspaceQuarantine(workspaceId, {
      reason: chainBreaks.length ? 'CHAIN_BREAK' : 'INTEGRITY_FAILURE',
      source: 'integrity-worker',
      details: {
        chainBreaks: chainBreaks.map((detail: any) => detail?.eventId).filter(Boolean),
        failedExhibitIds
      }
    }).catch(() => null);
  }

  const autoClear = ['1', 'true', 'yes'].includes(String(process.env.INTEGRITY_AUTO_CLEAR || '').toLowerCase());
  if (autoClear && status === 'SUCCESS') {
    await integrityService.clearWorkspaceQuarantine(workspaceId, { reason: 'AUTO_CLEAR' }).catch(() => null);
  }
}

export async function runIntegrityAuditForAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  for (const workspace of workspaces) {
    await runIntegrityAudit(workspace.id);
  }
}

export async function runLedgerProofForAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  for (const workspace of workspaces) {
    await recordLedgerProof(workspace.id);
  }
}

export function startIntegrityWorker() {
  const enabled = String(process.env.INTEGRITY_WORKER_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  const cronSpec = process.env.INTEGRITY_WORKER_CRON || '0 * * * *';
  const ledgerCron = process.env.AUDIT_LEDGER_PROOF_CRON || '*/1 * * * *';
  let running = false;
  let ledgerRunning = false;

  cron.schedule(cronSpec, async () => {
    if (running) return;
    running = true;
    try {
      await runIntegrityAuditForAllWorkspaces();
    } catch (err: any) {
      console.error('[INTEGRITY_WORKER] Failed run', err?.message || err);
    } finally {
      running = false;
    }
  });

  cron.schedule(ledgerCron, async () => {
    if (ledgerRunning) return;
    ledgerRunning = true;
    try {
      await runLedgerProofForAllWorkspaces();
    } catch (err: any) {
      console.error('[LEDGER_PROOF] Failed run', err?.message || err);
    } finally {
      ledgerRunning = false;
    }
  });
}
