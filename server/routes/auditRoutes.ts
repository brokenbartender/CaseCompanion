import express from 'express';

export function createAuditRouter(deps: {
  authenticate: any;
  requireWorkspace: any;
  requireRole: any;
  prisma: any;
  sanitizeAuditEvent: (event: any) => any;
  storageMode: string;
  getPublicKeyFingerprint: () => string;
  getSigningAlgorithm: () => string;
  signPayload: (payload: string | Buffer) => string;
  integrityService: any;
  logAuditEvent: any;
}) {
  const router = express.Router();
  const enforceIntegrityGate = async (req: any, res: any, context: string) => {
    const gate = await deps.integrityService.getWorkspaceIntegrityGate(req.workspaceId);
    if (!gate.blocked) return false;
    await deps.logAuditEvent(req.workspaceId, req.userId, 'INTEGRITY_QUARANTINE_BLOCKED', {
      context,
      reason: gate.reason,
      source: gate.source,
      setAt: gate.setAt || null,
      details: gate.details || null
    }).catch(() => null);
    res.setHeader('X-Integrity-Quarantined', 'true');
    res.setHeader('X-Integrity-Reason', gate.reason || 'INTEGRITY_QUARANTINED');
    res.status(423).json({
      error: 'INTEGRITY_QUARANTINED',
      message: 'Workspace quarantined due to integrity breach. Access locked.',
      integrity: gate
    });
    return true;
  };

  router.get('/api/workspaces/:workspaceId/audit/by-resource/:resourceId', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_BY_RESOURCE')) return;
    const take = Math.min(200, Math.max(1, Number(req.query?.take || 50)));
    const events = await deps.prisma.auditEvent.findMany({
      where: {
        workspaceId: req.workspaceId,
        resourceId: String(req.params.resourceId || '')
      },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(events.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit/views/:exhibitId', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_VIEWS_BY_EXHIBIT')) return;
    const exhibitId = String(req.params.exhibitId || '').trim();
    if (!exhibitId) return res.status(400).json({ error: 'exhibitId required' });
    const exhibit = await deps.prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId: req.workspaceId },
      select: { id: true }
    });
    if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });
    const rawTake = Number(req.query?.take || 50);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 250) : 50;

    const events = await deps.prisma.auditEvent.findMany({
      where: {
        workspaceId: req.workspaceId,
        eventType: { in: ['VIEW_EXHIBIT', 'EXHIBIT_FILE_ACCESS'] }
      },
      include: {
        actor: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const filtered = events.filter((evt: any) => {
      if (evt.resourceId === exhibitId) return true;
      if (!evt.payloadJson) return false;
      try {
        const payload = JSON.parse(evt.payloadJson);
        return payload?.exhibitId === exhibitId;
      } catch {
        return false;
      }
    }).slice(0, take);

    const viewReport = filtered.map((evt: any) => {
      let payload: any = {};
      try {
        payload = JSON.parse(evt.payloadJson || '{}');
      } catch {
        payload = {};
      }
      return {
        id: evt.id,
        eventType: evt.eventType,
        createdAt: evt.createdAt,
        actorId: evt.actorId,
        actorEmail: evt.actor?.email || null,
        ok: payload?.ok ?? null,
        source: payload?.source || null
      };
    });

    res.json({ exhibitId, views: viewReport });
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit/recent', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_RECENT')) return;
    const rawTake = Number(req.query?.take || 5);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 25) : 5;
    const logs = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(logs.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/security/audit', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_SECURITY')) return;
    const rawTake = Number(req.query?.take || 150);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 50), 500) : 150;
    const events = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: 'desc' },
      take
    });

    const stageMap: Record<string, string[]> = {
      ingest: ['INGEST_STARTED', 'EXHIBIT_UPLOAD', 'INTAKE_RECEIVED'],
      hash: ['HASH_SEALED', 'ROOT_HASH_SEALED'],
      anchor: ['DOCUMENT_STORE_INDEXED', 'DOCUMENT_STORE_INDEX_FAILED'],
      access: ['EXHIBIT_FILE_ACCESS', 'EXHIBIT_FILE_ACCESS_BLOCKED', 'EXHIBIT_ANCHORS_READ', 'VIEW_EXHIBIT'],
      export: [
        'EXPORT_PACKET',
        'FINAL_EXPORT',
        'INTEGRITY_REPORT_EXPORT',
        'VERIFICATION_REPORT_EXPORT',
        'AFFIDAVIT_GENERATED',
        'REPORT_RECEIPT',
        'AI_RELEASE_CERT',
        'EVIDENCE_BUNDLE_ROOT',
        'EVIDENCE_BUNDLE_ROOT_EXPORT',
        'EVIDENCE_BUNDLE_ROOT_MANIFEST_READ',
        'EVIDENCE_BUNDLE_ROOT_MANIFEST_VERIFY',
        'EVIDENCE_BUNDLE_PROOF',
        'EVIDENCE_BUNDLE_EXPORT',
        'EVIDENCE_BUNDLE_EXPORT_BATCH',
        'EVIDENCE_BUNDLE_EXPORT_MANIFEST_READ',
        'EVIDENCE_BUNDLE_EXPORT_MANIFEST_VERIFY',
        'EVIDENCE_BUNDLE_REVOKED',
        'EVIDENCE_BUNDLE_ROOT_NOTARIZED',
        'AUDIT_INDEX_EXPORT',
        'AUDIT_INDEX_MANIFEST_READ',
        'FORENSIC_PACK_EXPORT',
        'FORENSIC_PACK_VERIFY',
        'FORENSIC_PACK_DOWNLOAD',
        'REPORT_RECEIPTS_EXPORT',
        'ANCHOR_SNAPSHOT_EXPORT',
        'ANCHOR_SNAPSHOT_READ',
        'SIGNING_KEY_REGISTERED',
        'STRICT_VERIFY'
      ]
    };

    const lifecycle = Object.entries(stageMap).map(([stage, types]) => {
      const stageEvents = events.filter((evt: any) => types.includes(evt.eventType));
      return {
        stage,
        count: stageEvents.length,
        lastSeen: stageEvents[0]?.createdAt || null,
        eventTypes: types
      };
    });

    const timeline = events.slice(0, 50).map((evt: any) => ({
      id: evt.id,
      eventType: evt.eventType,
      createdAt: evt.createdAt,
      actorId: evt.actorId,
      resourceId: evt.resourceId,
      hash: evt.hash,
      prevHash: evt.prevHash
    }));

    let signingStatus: 'signed' | 'unsigned' = 'unsigned';
    let signerKeyId: string | null = null;
    let signingAlgorithm: string | null = null;
    try {
      signerKeyId = deps.getPublicKeyFingerprint();
      signingAlgorithm = deps.getSigningAlgorithm();
      deps.signPayload('audit_probe');
      signingStatus = 'signed';
    } catch {
      signingStatus = 'unsigned';
    }

    const modelTrainingEvidence = {
      modelTrainingDisabled: true,
      flags: {
        ENABLE_OCR: String(process.env.ENABLE_OCR || '0'),
        ENABLE_TRANSCRIPTION: String(process.env.ENABLE_TRANSCRIPTION || '0')
      },
      evidenceLocations: [
        'docs/LexiPro_IP_and_Ownership.md',
        'docs/LEXIPRO_CORE_SPECS.md',
        'server/routes/aiRoutes.ts'
      ]
    };

    const logShipping = deps.storageMode === 'S3'
      ? { status: 'configured', mode: deps.storageMode, destination: 's3' }
      : { status: 'not_configured', mode: deps.storageMode, destination: 'local_fs' };

    res.json({
      workspaceId: req.workspaceId,
      integrityMode: signingStatus === 'signed' ? 'signed' : 'hash-only',
      signing: {
        status: signingStatus,
        signerKeyId,
        algorithm: signingAlgorithm
      },
      lifecycle,
      chainOfCustody: timeline,
      modelTrainingEvidence,
      logShipping
    });
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit/logs', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_LOGS')) return;
    const logs = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/reports/receipts', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'REPORT_RECEIPTS')) return;
    const rawTake = Number(req.query?.take || 50);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const receipts = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId, eventType: 'REPORT_RECEIPT' },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(receipts.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/release-certs', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'RELEASE_CERT_LOG')) return;
    const rawTake = Number(req.query?.take || 50);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const events = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId, eventType: 'AI_RELEASE_CERT' },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(events.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/evidence/bundle-roots', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EVIDENCE_BUNDLE_ROOT_LOG')) return;
    const rawTake = Number(req.query?.take || 50);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const events = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId, eventType: 'EVIDENCE_BUNDLE_ROOT' },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(events.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/evidence/bundles/revocations', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EVIDENCE_BUNDLE_REVOKE_LOG')) return;
    const rawTake = Number(req.query?.take || 50);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 200) : 50;
    const events = await deps.prisma.auditEvent.findMany({
      where: { workspaceId: req.workspaceId, eventType: 'EVIDENCE_BUNDLE_REVOKED' },
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(events.map(deps.sanitizeAuditEvent));
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit-logs', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_LOGS_LEGACY')) return;
    const userId = String(req.query?.userId || '').trim();
    const action = String(req.query?.action || '').trim();
    const rawTake = Number(req.query?.take || 100);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 500) : 100;
    const where: any = { workspaceId: req.workspaceId };
    if (userId) where.actorId = userId;
    if (action) where.action = action;
    const logs = await deps.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(logs);
  }) as any);

  router.get('/api/audit/events/:id', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AUDIT_EVENT')) return;
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'audit event id required' });
    const event = await deps.prisma.auditEvent.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'audit event not found' });
    if (event.workspaceId !== req.workspaceId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    res.json(event);
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit/verify', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    try {
      if (await enforceIntegrityGate(req, res, 'AUDIT_VERIFY')) return;
      const result = await deps.integrityService.verifyWorkspaceChain(req.workspaceId);
      await deps.logAuditEvent(req.workspaceId, req.userId, 'INTEGRITY_VERIFY_LEDGER', {
        ok: result?.isValid ?? true,
        detail: result
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Ledger Verification Failure', detail: err.message });
    }
  }) as any);

  router.get('/api/audit/chain', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    try {
      if (await enforceIntegrityGate(req, res, 'AUDIT_CHAIN')) return;
      const result = await deps.integrityService.verifyWorkspaceChain(req.workspaceId);
      await deps.logAuditEvent(req.workspaceId, req.userId, 'INTEGRITY_VERIFY_LEDGER', {
        ok: result?.isValid ?? true,
        detail: result
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Ledger Verification Failure', detail: err.message });
    }
  }) as any);

  router.get('/api/workspaces/:workspaceId/audit/deep-test', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    try {
      if (await enforceIntegrityGate(req, res, 'AUDIT_DEEP_TEST')) return;
      const result = await deps.integrityService.performPhysicalDeepAudit(req.workspaceId);
      await deps.logAuditEvent(req.workspaceId, req.userId, 'INTEGRITY_PHYSICAL_AUDIT', {
        ok: result?.isValid ?? true,
        detail: result
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Physical Asset Audit Failure', detail: err.message });
    }
  }) as any);

  return router;
}
