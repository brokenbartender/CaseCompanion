import crypto from 'crypto';

export class IntegrityError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, opts?: { status?: number; code?: string; details?: any }) {
    super(message);
    this.name = 'IntegrityError';
    this.status = opts?.status ?? 409;
    this.code = opts?.code ?? 'INTEGRITY_MISMATCH';
    this.details = opts?.details;
  }
}

export async function verifyExhibitOnRead(deps: {
  download: (storageKey: string) => Promise<Buffer>;
  updateExhibit: (args: { exhibitId: string; data: any }) => Promise<void>;
  logAuditEvent: (args: { workspaceId: string; actorId: string; eventType: string; payload: any }) => Promise<void>;
}, opts: {
  workspaceId: string;
  exhibitId: string;
  actorId: string;
  storageKey: string;
  recordedHash: string;
  onMismatchReason: string;
}): Promise<{ ok: true; currentHash: string } | { ok: false; currentHash: string }> {
  const data = await deps.download(opts.storageKey);
  const currentHash = crypto.createHash('sha256').update(data).digest('hex');

  if (currentHash != opts.recordedHash) {
    await deps.updateExhibit({
      exhibitId: opts.exhibitId,
      data: {
        verificationStatus: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: opts.onMismatchReason,
      }
    });

    await deps.logAuditEvent({
      workspaceId: opts.workspaceId,
      actorId: opts.actorId,
      eventType: 'EXHIBIT_INTEGRITY_REVOKED',
      payload: {
        exhibitId: opts.exhibitId,
        storageKey: opts.storageKey,
        recordedHash: opts.recordedHash,
        currentHash,
        reason: opts.onMismatchReason,
      }
    });

    return { ok: false, currentHash };
  }

  // Touch verification time for monitoring purposes.
  await deps.updateExhibit({
    exhibitId: opts.exhibitId,
    data: { verifiedAt: new Date() }
  }).catch(() => null);

  return { ok: true, currentHash };
}
