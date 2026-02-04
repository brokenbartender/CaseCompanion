import express from 'express';

const normalizeShortName = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

async function generateShortName(prisma: any, workspaceId: string, base: string) {
  const seed = normalizeShortName(base) || 'Entity';
  let candidate = seed;
  let suffix = 1;
  while (true) {
    const exists = await prisma.shortName.findFirst({
      where: { workspaceId, shortName: candidate }
    });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${seed}${suffix}`;
  }
}

export function createMappingRouter(deps: {
  authenticate: any;
  requireWorkspace: any;
  requireRole: any;
  prisma: any;
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

  router.get('/api/workspaces/:workspaceId/matters/:matterId/facts',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'FACT_LIST')) return;
      const facts = await deps.prisma.fact.findMany({
        where: { workspaceId: req.workspaceId, matterId: req.params.matterId },
        orderBy: { createdAt: 'desc' },
        take: 500
      });
      res.json(facts);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/matters/:matterId/facts',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'FACT_CREATE')) return;
      const statement = String(req.body?.statement || '').trim();
      if (!statement) return res.status(400).json({ error: 'statement required' });
      const fact = await deps.prisma.fact.create({
        data: {
          workspaceId: req.workspaceId,
          matterId: req.params.matterId,
          title: req.body?.title ? String(req.body.title) : null,
          statement,
          status: req.body?.status || 'DRAFT',
          evaluation: req.body?.evaluation || 'NEUTRAL',
          citationStatus: req.body?.citationStatus || 'MISSING',
          confidence: typeof req.body?.confidence === 'number' ? req.body.confidence : null,
          eventAt: req.body?.eventAt ? new Date(req.body.eventAt) : null,
          eventAtText: req.body?.eventAtText ? String(req.body.eventAtText) : null,
          datePrecision: req.body?.datePrecision ? String(req.body.datePrecision) : null,
          createdByUserId: req.userId
        }
      });
      await deps.logAuditEvent(req.workspaceId, req.userId, 'FACT_CREATED', {
        factId: fact.id
      }).catch(() => null);
      res.json(fact);
    }) as any
  );

  router.put('/api/workspaces/:workspaceId/facts/:factId',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'FACT_UPDATE')) return;
      const updated = await deps.prisma.fact.updateMany({
        where: { id: req.params.factId, workspaceId: req.workspaceId },
        data: {
          title: req.body?.title ? String(req.body.title) : undefined,
          statement: req.body?.statement ? String(req.body.statement) : undefined,
          status: req.body?.status || undefined,
          evaluation: req.body?.evaluation || undefined,
          citationStatus: req.body?.citationStatus || undefined,
          confidence: typeof req.body?.confidence === 'number' ? req.body.confidence : undefined,
          eventAt: req.body?.eventAt ? new Date(req.body.eventAt) : undefined,
          eventAtText: req.body?.eventAtText ? String(req.body.eventAtText) : undefined,
          datePrecision: req.body?.datePrecision ? String(req.body.datePrecision) : undefined
        }
      });
      res.json({ ok: true, updated: updated.count });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/matters/:matterId/issues',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'ISSUE_LIST')) return;
      const issues = await deps.prisma.issue.findMany({
        where: { workspaceId: req.workspaceId, matterId: req.params.matterId },
        orderBy: { createdAt: 'desc' },
        take: 300
      });
      res.json(issues);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/matters/:matterId/issues',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'ISSUE_CREATE')) return;
      const title = String(req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'title required' });
      const issue = await deps.prisma.issue.create({
        data: {
          workspaceId: req.workspaceId,
          matterId: req.params.matterId,
          title,
          description: req.body?.description ? String(req.body.description) : null,
          status: req.body?.status || 'OPEN',
          citationStatus: req.body?.citationStatus || 'MISSING',
          createdByUserId: req.userId
        }
      });
      await deps.logAuditEvent(req.workspaceId, req.userId, 'ISSUE_CREATED', {
        issueId: issue.id
      }).catch(() => null);
      res.json(issue);
    }) as any
  );

  router.put('/api/workspaces/:workspaceId/issues/:issueId',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'ISSUE_UPDATE')) return;
      const updated = await deps.prisma.issue.updateMany({
        where: { id: req.params.issueId, workspaceId: req.workspaceId },
        data: {
          title: req.body?.title ? String(req.body.title) : undefined,
          description: req.body?.description ? String(req.body.description) : undefined,
          status: req.body?.status || undefined,
          citationStatus: req.body?.citationStatus || undefined
        }
      });
      res.json({ ok: true, updated: updated.count });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/matters/:matterId/people',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'PERSON_LIST')) return;
      const people = await deps.prisma.person.findMany({
        where: { workspaceId: req.workspaceId, matterId: req.params.matterId },
        orderBy: { createdAt: 'desc' },
        take: 500
      });
      res.json(people);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/matters/:matterId/people',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'PERSON_CREATE')) return;
      const fullName = String(req.body?.fullName || '').trim();
      if (!fullName) return res.status(400).json({ error: 'fullName required' });
      const shortName = req.body?.shortName
        ? String(req.body.shortName)
        : await generateShortName(deps.prisma, req.workspaceId, fullName);
      const person = await deps.prisma.person.create({
        data: {
          workspaceId: req.workspaceId,
          matterId: req.params.matterId,
          fullName,
          shortName,
          type: req.body?.type || 'PERSON',
          role: req.body?.role ? String(req.body.role) : null,
          notes: req.body?.notes ? String(req.body.notes) : null
        }
      });
      await deps.prisma.shortName.create({
        data: {
          workspaceId: req.workspaceId,
          entityType: 'PERSON',
          entityId: person.id,
          shortName,
          source: req.body?.shortName ? 'MANUAL' : 'AUTO'
        }
      }).catch(() => null);
      await deps.logAuditEvent(req.workspaceId, req.userId, 'PERSON_CREATED', {
        personId: person.id
      }).catch(() => null);
      res.json(person);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/short-names',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'SHORTNAME_CREATE')) return;
      const entityType = String(req.body?.entityType || '').trim();
      const entityId = String(req.body?.entityId || '').trim();
      const shortName = String(req.body?.shortName || '').trim();
      if (!entityType || !entityId || !shortName) {
        return res.status(400).json({ error: 'entityType, entityId, shortName required' });
      }
      const row = await deps.prisma.shortName.create({
        data: {
          workspaceId: req.workspaceId,
          entityType,
          entityId,
          shortName,
          source: req.body?.source || 'MANUAL'
        }
      });
      res.json(row);
    }) as any
  );

  return router;
}
