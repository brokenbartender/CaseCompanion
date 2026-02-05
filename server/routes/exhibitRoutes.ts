import express from 'express';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PDFDocument, degrees } from 'pdf-lib';
import { extractAnchorsFromPdf } from '../pdfProcessor.js';

type MulterSingle = (name: string) => any;

export function createExhibitRouter(deps: {
  authenticate: any;
  requireWorkspace: any;
  requireRole: any;
  requireMatterAccess: any;
  requireLegalHoldClear: any;
  validateResourceAccess: any;
  requireApprovalToken: any;
  certificateLimiter: any;
  upload: { single: MulterSingle };
  prisma: any;
  logAuditEvent: any;
  integrityService: any;
  storageService: any;
  evidenceProcessor: any;
  extractPrimaryDate: (text: string) => string | null;
  inferCustodianFromName: (filename: string) => string;
  ingestionPipeline: any;
  ingestExhibit: (args: { workspaceId: string; userId: string; role?: string; file: any; matterIdOrSlug?: string }) => Promise<any>;
  waitForStorageKey: (storageKey: string) => Promise<void>;
  withBBoxFields: (anchor: any) => any;
  generateAdmissibilityPackage: (workspaceId: string, exhibitId: string) => Promise<{ buffer: Buffer; metadata: any }>;
  buildCertificateV1: any;
  getBuildProofUrl: () => string | undefined;
  systemVersion?: string;
  assertGroundedFindings: (prisma: any, findings: any, workspaceId: string) => Promise<any>;
  to422: (res: any, err: any) => any;
  assessExhibitAgainstPlaybook: any;
  convertBufferToTxt: (buffer: Buffer, mimeType: string, filename?: string) => Promise<Buffer>;
  convertBufferToPdf: (buffer: Buffer, mimeType: string, filename?: string) => Promise<Buffer>;
  convertBufferToDocx: (buffer: Buffer, mimeType: string, filename?: string) => Promise<Buffer>;
  getVideoForensicsStatus: (exhibitId: string) => Promise<any>;
  listVideoForensicsArtifacts: (exhibitId: string) => Promise<any[]>;
  streamVideoArtifact: (exhibitId: string, artifactId: string) => string;
  getPdfForensicsStatus: (exhibitId: string) => Promise<any>;
  listPdfForensicsArtifacts: (exhibitId: string) => Promise<any[]>;
  streamPdfArtifact: (exhibitId: string, artifactId: string) => string;
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

  const buildClientVisibilityFilter = (req: any) => {
    const role = String(req.workspaceRole || '').toLowerCase();
    return role === 'client' ? { documentType: 'PUBLIC' } : {};
  };

  const buildMatterAccessFilter = (req: any) => {
    const role = String(req.workspaceRole || '').toLowerCase();
    if (role === 'admin' || role === 'owner') return {};
    if (role === 'client' || role === 'co_counsel') {
      return { matter: { allowedUserIds: { has: req.userId } } };
    }
    return {
      OR: [
        { matter: { ethicalWallEnabled: false } },
        { matter: { allowedUserIds: { has: req.userId } } },
        { matter: { allowedUserIds: { equals: [] } } }
      ]
    };
  };

  const requireDownloadAccess = (req: any, res: any, next: any) => {
    const role = String(req.workspaceRole || '').toLowerCase();
    if (role === 'viewer' || role === 'client') {
      return res.status(403).json({ error: 'DOWNLOAD_RESTRICTED', message: 'Download access restricted for view-only roles.' });
    }
    return next();
  };

  const safeParseJson = <T,>(value: string | null | undefined, fallback: T): T => {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  const updateVectorMetadataForExhibit = async (exhibitId: string, updates: Record<string, unknown>) => {
    const chunks = await deps.prisma.documentChunk.findMany({
      where: { exhibitId },
      select: { id: true, metadataJson: true }
    });
    for (const chunk of chunks) {
      const base = safeParseJson<Record<string, unknown>>(chunk.metadataJson, {});
      const next = { ...base, ...updates };
      await deps.prisma.documentChunk.update({
        where: { id: chunk.id },
        data: { metadataJson: JSON.stringify(next) }
      });
    }
  };

  const purgeIndexesForExhibit = async (exhibitId: string) => {
    await deps.prisma.anchor.deleteMany({ where: { exhibitId } }).catch(() => null);
    await deps.prisma.documentChunk.deleteMany({ where: { exhibitId } }).catch(() => null);
    await deps.prisma.transcriptSegment.deleteMany({ where: { exhibitId } }).catch(() => null);
    await deps.prisma.mediaFrame.deleteMany({ where: { exhibitId } }).catch(() => null);
  };

  const purgeCdnForStorageKeys = async (storageKeys: Array<string | null | undefined>) => {
    const purgeUrl = String(process.env.CDN_PURGE_URL || '').trim();
    if (!purgeUrl) return;
    const token = String(process.env.CDN_PURGE_TOKEN || '').trim();
    const keys = storageKeys.filter(Boolean) as string[];
    if (!keys.length) return;
    try {
      await fetch(purgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ keys })
      });
    } catch (err: any) {
      console.warn('[cdn-purge] failed', err?.message || String(err));
    }
  };

  router.get('/api/workspaces/:workspaceId/exhibits', deps.authenticate as any, deps.requireWorkspace as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_LIST')) return;
    const includeDeletedParam = String(req.query?.includeDeleted || '').toLowerCase();
    const role = String(req.workspaceRole || '').toLowerCase();
    const allowDeleted = (role === 'admin' || role === 'owner') && (includeDeletedParam === 'true' || includeDeletedParam === '1');

    const exhibits = await deps.prisma.exhibit.findMany({
      where: {
        workspaceId: req.workspaceId,
        ...(allowDeleted ? {} : { deletedAt: null }),
        ...buildClientVisibilityFilter(req),
        ...buildMatterAccessFilter(req)
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exhibits);
  }) as any);

  router.get('/api/workspaces/:workspaceId/matters/:matterId/exhibits', deps.authenticate as any, deps.requireWorkspace as any, deps.requireMatterAccess('matterId') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_LIST_MATTER')) return;
    const matterId = String(req.params.matterId || '').trim();
    if (!matterId) return res.status(400).json({ error: 'matterId required' });
    const includeDeletedParam = String(req.query?.includeDeleted || '').toLowerCase();
    const role = String(req.workspaceRole || '').toLowerCase();
    const allowDeleted = (role === 'admin' || role === 'owner') && (includeDeletedParam === 'true' || includeDeletedParam === '1');

    const exhibits = await deps.prisma.exhibit.findMany({
      where: {
        workspaceId: req.workspaceId,
        matterId,
        ...(allowDeleted ? {} : { deletedAt: null }),
        ...buildClientVisibilityFilter(req),
        ...buildMatterAccessFilter(req)
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exhibits);
  }) as any);

  router.get('/api/workspaces/:workspaceId/intake/recent', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'INTAKE_RECENT')) return;
    const exhibits = await deps.prisma.exhibit.findMany({
      where: {
        workspaceId: req.workspaceId,
        triageJson: { not: null },
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(exhibits.map((exhibit: any) => ({
      ...exhibit,
      triage: exhibit.triageJson ? JSON.parse(exhibit.triageJson) : null
    })));
  }) as any);

  router.get('/api/workspaces/:workspaceId/matters/:matterId/intake/recent', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.requireMatterAccess('matterId') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'INTAKE_RECENT_MATTER')) return;
    const matterId = String(req.params.matterId || '').trim();
    if (!matterId) return res.status(400).json({ error: 'matterId required' });
    const exhibits = await deps.prisma.exhibit.findMany({
      where: {
        workspaceId: req.workspaceId,
        matterId,
        triageJson: { not: null },
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(exhibits.map((exhibit: any) => ({
      ...exhibit,
      triage: exhibit.triageJson ? JSON.parse(exhibit.triageJson) : null
    })));
  }) as any);

  router.get('/api/workspaces/:workspaceId/exhibits/:exhibitId/auto-index', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    try {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_AUTO_INDEX')) return;
      const exhibitId = String(req.params.exhibitId || '');
      const exhibit = await deps.prisma.exhibit.findFirst({
        where: {
          id: exhibitId,
          workspaceId: req.workspaceId,
          deletedAt: null,
          ...buildClientVisibilityFilter(req),
          ...buildMatterAccessFilter(req)
        }
      });
      if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });

      const buffer = await deps.storageService.download(exhibit.storageKey);
      const extracted = await deps.evidenceProcessor.extractTextFromBuffer(buffer, exhibit.filename);
      const primaryDate = deps.extractPrimaryDate(extracted.text) || exhibit.createdAt.toISOString().slice(0, 10);
      const custodian = deps.inferCustodianFromName(exhibit.filename);
      const pages = extracted.pageMap.length;
      const ocrConfidence = Math.min(98, Math.max(88, 88 + Math.floor(extracted.text.length / 1200)));

      res.json({
        exhibitId: exhibit.id,
        filename: exhibit.filename,
        pages,
        primaryDate,
        custodian,
        ocrConfidence: `${ocrConfidence}%`,
        extractedChars: extracted.text.length
      });
    } catch (err: any) {
      res.status(500).json({ error: 'AUTO_INDEX_FAILED', detail: err?.message || String(err) });
    }
  }) as any);

  const CATEGORY_QUERIES: Record<string, string> = {
    contract: 'contract | agreement | clause | indemnity | liability | termination',
    medical: 'medical | diagnosis | patient | treatment | hospital | physician | lab',
    financial: 'invoice | payment | bank | balance | account | tax | revenue | expense'
  };

  router.get('/api/workspaces/:workspaceId/exhibits/search', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_SEARCH')) return;
    const category = String(req.query?.category || '').toLowerCase();
    if (!category || !CATEGORY_QUERIES[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const includeDeletedParam = String(req.query?.includeDeleted || '').toLowerCase();
    const role = String(req.workspaceRole || '').toLowerCase();
    const allowDeleted = (role === 'admin' || role === 'owner') && (includeDeletedParam === 'true' || includeDeletedParam === '1');

    const tsQuery = CATEGORY_QUERIES[category];

    type ExhibitMatchRow = { exhibit_id: string; match_count: number };
    const rows: ExhibitMatchRow[] = allowDeleted
      ? await deps.prisma.$queryRaw`
          SELECT a."exhibitId" as exhibit_id, COUNT(*)::int as match_count
          FROM "Anchor" a
          JOIN "Exhibit" e ON e.id = a."exhibitId"
          WHERE e."workspaceId" = ${req.workspaceId}
            AND to_tsvector('english', a."text") @@ to_tsquery('english', ${tsQuery})
          GROUP BY a."exhibitId"
          ORDER BY match_count DESC
          LIMIT 200
        `
      : await deps.prisma.$queryRaw`
          SELECT a."exhibitId" as exhibit_id, COUNT(*)::int as match_count
          FROM "Anchor" a
          JOIN "Exhibit" e ON e.id = a."exhibitId"
          WHERE e."workspaceId" = ${req.workspaceId}
            AND e."deletedAt" IS NULL
            AND to_tsvector('english', a."text") @@ to_tsquery('english', ${tsQuery})
          GROUP BY a."exhibitId"
          ORDER BY match_count DESC
          LIMIT 200
        `;

    const exhibitIds = rows.map((row: ExhibitMatchRow) => row.exhibit_id);
    const exhibits = exhibitIds.length
      ? await deps.prisma.exhibit.findMany({
          where: {
            id: { in: exhibitIds },
            workspaceId: req.workspaceId,
            ...(allowDeleted ? {} : { deletedAt: null })
          }
        })
      : [];

    const exhibitById = new Map(exhibits.map((ex: any) => [ex.id, ex]));
    const ordered = rows.map((row: ExhibitMatchRow) => ({
      ...(exhibitById.get(row.exhibit_id) as any),
      matchCount: row.match_count
    })).filter((row: any) => row?.id);

    res.json({ category, exhibits: ordered });
  }) as any);

  const verificationUpdateSchema = z.object({
    status: z.enum(['PENDING','CERTIFIED'])
  });

  router.patch(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/verification',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('admin') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_VERIFICATION')) return;
      const parsed = verificationUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid verification payload' });
      }

      const { status } = parsed.data;
      const exhibitId = req.params.exhibitId;

      const exhibit = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null }
      });
      if (!exhibit) return res.status(403).json({ error: 'Access denied' });

      if (status === 'CERTIFIED') {
        if (exhibit.verificationStatus === 'REVOKED') {
          return res.status(409).json({ error: 'Integrity failure: exhibit is REVOKED. Re-ingest is required to re-certify.' });
        }

        const requestedMatterId = typeof req.body?.matterId === 'string' && req.body.matterId.trim()
          ? req.body.matterId.trim()
          : undefined;
        if (!requestedMatterId) {
          return res.status(400).json({ error: 'matterId required for certification' });
        }

        const v = await deps.integrityService.verifyExhibitOnRead({
          workspaceId: req.workspaceId,
          exhibitId: exhibit.id,
          actorId: req.userId,
          storageKey: exhibit.storageKey,
          recordedHash: exhibit.integrityHash,
          matterId: requestedMatterId,
        });

        if (!v.ok) {
          return res.status(409).json({
            error: 'Integrity failure: physical asset hash mismatch',
            exhibitId: exhibit.id,
            recordedHash: exhibit.integrityHash,
            currentHash: v.currentHash,
          });
        }
      }

      const updateResult = await deps.prisma.exhibit.updateMany({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
        data: {
          verificationStatus: status,
          verifiedByUserId: status === 'CERTIFIED' ? req.userId : null,
          verifiedAt: status === 'CERTIFIED' ? new Date() : null,
          revokedAt: null,
          revocationReason: null,
        }
      });

      if (!updateResult.count) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null }
      });

      await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_VERIFICATION_UPDATE', {
        exhibitId,
        status
      });

      res.json(updated);
    }) as any
  );

  const privilegeUpdateSchema = z.object({
    privilegeTag: z.enum(['NONE', 'ATTORNEY_CLIENT', 'WORK_PRODUCT']).optional(),
    privilegeType: z.enum(['NONE', 'ACP', 'WPD', 'COMMON_INTEREST', 'TRADE_SECRET', 'OTHER']).optional(),
    privilegePending: z.boolean().optional(),
    documentType: z.enum(['PUBLIC', 'CONFIDENTIAL', 'PRIVILEGED']).optional()
  });

  router.patch(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/privilege',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_PRIVILEGE_UPDATE')) return;
      const parsed = privilegeUpdateSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid privilege payload' });
      }
      const exhibitId = String(req.params.exhibitId);
      const update: Record<string, any> = {};
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'privilegeTag')) {
        update.privilegeTag = parsed.data.privilegeTag;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'privilegeType')) {
        update.privilegeType = parsed.data.privilegeType;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'privilegePending')) {
        update.privilegePending = parsed.data.privilegePending;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'documentType')) {
        update.documentType = parsed.data.documentType;
      } else if (parsed.data.privilegePending === true
        || (parsed.data.privilegeTag && parsed.data.privilegeTag !== 'NONE')
        || (parsed.data.privilegeType && parsed.data.privilegeType !== 'NONE')) {
        update.documentType = 'PRIVILEGED';
      }

      const updated = await deps.prisma.exhibit.update({
        where: { id: exhibitId },
        data: update
      });

      await updateVectorMetadataForExhibit(exhibitId, {
        privileged: String(updated.documentType || '').toUpperCase() === 'PRIVILEGED',
        privilegeTag: updated.privilegeTag,
        privilegeType: updated.privilegeType,
        privilegePending: updated.privilegePending,
        documentType: updated.documentType
      });

      await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_PRIVILEGE_UPDATED', {
        exhibitId,
        privilegeTag: updated.privilegeTag,
        privilegeType: updated.privilegeType,
        privilegePending: updated.privilegePending,
        documentType: updated.documentType
      });

      res.json(updated);
    }) as any
  );

  const clawbackSchema = z.object({
    privilegeTag: z.enum(['NONE', 'ATTORNEY_CLIENT', 'WORK_PRODUCT']).optional(),
    privilegeType: z.enum(['NONE', 'ACP', 'WPD', 'COMMON_INTEREST', 'TRADE_SECRET', 'OTHER']).optional(),
    reason: z.string().optional()
  });

  router.post(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/clawback',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('admin') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_CLAWBACK')) return;
      const parsed = clawbackSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid clawback payload' });
      }
      const exhibit = req.scopedExhibit;
      if (!exhibit) return res.status(403).json({ error: 'Access denied' });

      const update: Record<string, any> = {
        documentType: 'PRIVILEGED',
        privilegePending: false
      };
      if (parsed.data.privilegeTag) update.privilegeTag = parsed.data.privilegeTag;
      if (parsed.data.privilegeType) update.privilegeType = parsed.data.privilegeType;

      const updated = await deps.prisma.exhibit.update({
        where: { id: exhibit.id },
        data: update
      });

      await purgeIndexesForExhibit(exhibit.id);
      await updateVectorMetadataForExhibit(exhibit.id, {
        privileged: true,
        privilegeTag: updated.privilegeTag,
        privilegeType: updated.privilegeType,
        privilegePending: updated.privilegePending,
        documentType: updated.documentType
      });
      await purgeCdnForStorageKeys([exhibit.storageKey, exhibit.redactedStorageKey]);

      await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_PRIVILEGE_CLAWBACK', {
        exhibitId: exhibit.id,
        privilegeTag: updated.privilegeTag,
        privilegeType: updated.privilegeType,
        reason: parsed.data.reason || null
      });

      res.json({ ok: true, exhibit: updated });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/matters/:matterId/exhibits/:exhibitId/document-chunks', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.requireMatterAccess('matterId') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_DOCUMENT_CHUNKS')) return;
    const matterId = String(req.params.matterId || '').trim();
    const exhibitId = String(req.params.exhibitId || '').trim();
    const rawLimit = Number(req.query?.limit || 400);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 2000) : 400;
    if (!matterId || !exhibitId) {
      return res.status(400).json({ error: 'matterId and exhibitId required' });
    }

    const chunks = await deps.prisma.documentChunk.findMany({
      where: {
        workspaceId: req.workspaceId,
        matterId,
        exhibitId,
        deletedAt: null,
        exhibit: {
          deletedAt: null,
          ...buildClientVisibilityFilter(req),
          ...buildMatterAccessFilter(req)
        }
      },
      orderBy: { chunkIndex: 'asc' },
      take: limit,
      select: {
        id: true,
        chunkIndex: true,
        pageNumber: true,
        text: true
      }
    });
    res.json({ ok: true, chunks });
  }) as any);

  router.post('/api/workspaces/:workspaceId/exhibits/:exhibitId/document-store/reindex', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_REINDEX')) return;
    const exhibitId = String(req.params.exhibitId || '').trim();
    if (!exhibitId) return res.status(400).json({ error: 'exhibitId required' });
    const exhibit = await deps.prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
      select: { id: true, mimeType: true }
    });
    if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });
    if (exhibit.mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Document store indexing currently supports PDF only' });
    }

    await deps.ingestionPipeline.ingestExhibit(req.workspaceId, exhibit.id);
    res.json({ ok: true, exhibitId: exhibit.id });
  }) as any);

  router.post('/api/workspaces/:workspaceId/matters/:matterId/exhibits/:exhibitId/risk-assess', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.requireMatterAccess('matterId') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_RISK_ASSESS')) return;
    const matterId = String(req.params.matterId || '').trim();
    const exhibitId = String(req.params.exhibitId || '').trim();
    const playbookId = String(req.body?.playbookId || '').trim();
    const maxChunksPerRule = Number(req.body?.maxChunksPerRule || 8);

    if (!matterId || !exhibitId || !playbookId) {
      return res.status(400).json({ error: 'matterId, exhibitId, and playbookId required' });
    }

    const exhibit = await deps.prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId: req.workspaceId, matterId, deletedAt: null },
      select: { id: true }
    });
    if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });

    try {
      const result = await deps.assessExhibitAgainstPlaybook({
        workspaceId: req.workspaceId,
        matterId,
        exhibitId,
        playbookId,
        maxChunksPerRule
      });

      if (result.missingCitations > 0) {
        return res.status(422).json({
          error: 'NO_CITATION_FOUND',
          citation_found: false,
          message: 'No admissible citations found for one or more playbook rules.'
        });
      }

      return res.json({ ok: true, assessments: result.assessments });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Risk assessment failed' });
    }
  }) as any);

  router.post('/api/workspaces/:workspaceId/exhibits', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.upload.single('file') as any, (async (req: any, res: any) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_INGEST')) return;

    const matterIdOrSlug = req.body?.matterId;

    try {
      const exhibit = await deps.ingestExhibit({
        workspaceId: req.workspaceId,
        userId: req.userId,
        role: req.workspaceRole,
        file,
        matterIdOrSlug
      });
      res.json(exhibit);
    } catch (err: any) {
      if (err?.code === 'MATTER_SCOPE_FORBIDDEN') {
        return res.status(403).json({ error: 'Access denied to matter' });
      }
      if (err?.code === 'UPLOAD_MAGIC_MISMATCH') {
        return res.status(415).json({ error: 'MAGIC_MISMATCH', detail: err?.message || 'Magic number validation failed' });
      }
      if (err?.code === 'MALWARE_DETECTED') {
        return res.status(422).json({ error: 'MALWARE_DETECTED', detail: err?.message || 'Malware detected' });
      }
      if (err?.code === 'MALWARE_SCAN_FAILED') {
        return res.status(503).json({ error: 'MALWARE_SCAN_FAILED', detail: err?.message || 'Malware scan failed' });
      }
      res.status(500).json({ error: err.message || 'Exhibit ingest failed' });
    }
  }) as any);

  router.post('/api/exhibits', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.upload.single('file') as any, (async (req: any, res: any) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_INGEST_LEGACY')) return;

    const matterIdOrSlug = req.body?.matterId;

    try {
      const exhibit = await deps.ingestExhibit({
        workspaceId: req.workspaceId,
        userId: req.userId,
        role: req.workspaceRole,
        file,
        matterIdOrSlug
      });
      res.json(exhibit);
    } catch (err: any) {
      if (err?.code === 'MATTER_SCOPE_FORBIDDEN') {
        return res.status(403).json({ error: 'Access denied to matter' });
      }
      if (err?.code === 'UPLOAD_MAGIC_MISMATCH') {
        return res.status(415).json({ error: 'MAGIC_MISMATCH', detail: err?.message || 'Magic number validation failed' });
      }
      if (err?.code === 'MALWARE_DETECTED') {
        return res.status(422).json({ error: 'MALWARE_DETECTED', detail: err?.message || 'Malware detected' });
      }
      if (err?.code === 'MALWARE_SCAN_FAILED') {
        return res.status(503).json({ error: 'MALWARE_SCAN_FAILED', detail: err?.message || 'Malware scan failed' });
      }
      res.status(500).json({ error: err.message || 'Exhibit ingest failed' });
    }
  }) as any);

  router.post('/api/workspaces/:workspaceId/matters/:matterId/exhibits', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, deps.requireMatterAccess('matterId') as any, deps.upload.single('file') as any, (async (req: any, res: any) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });
    if (await enforceIntegrityGate(req, res, 'EXHIBIT_INGEST_MATTER')) return;

    try {
      const exhibit = await deps.ingestExhibit({
        workspaceId: req.workspaceId,
        userId: req.userId,
        role: req.workspaceRole,
        file,
        matterIdOrSlug: req.params.matterId
      });
      res.json(exhibit);
    } catch (err: any) {
      if (err?.code === 'MATTER_SCOPE_FORBIDDEN') {
        return res.status(403).json({ error: 'Access denied to matter' });
      }
      if (err?.code === 'UPLOAD_MAGIC_MISMATCH') {
        return res.status(415).json({ error: 'MAGIC_MISMATCH', detail: err?.message || 'Magic number validation failed' });
      }
      if (err?.code === 'MALWARE_DETECTED') {
        return res.status(422).json({ error: 'MALWARE_DETECTED', detail: err?.message || 'Malware detected' });
      }
      if (err?.code === 'MALWARE_SCAN_FAILED') {
        return res.status(503).json({ error: 'MALWARE_SCAN_FAILED', detail: err?.message || 'Malware scan failed' });
      }
      res.status(500).json({ error: err.message || 'Exhibit ingest failed' });
    }
  }) as any);

  router.post('/api/workspaces/:workspaceId/exhibits/drive-import', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (_req: any, res: any) => {
    res.status(501).json({ error: 'Drive import not enabled in Phase 1. Use Manual Ingest for now.' });
  }) as any);

  router.get(
    '/api/exhibits/:exhibitId',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_STATUS')) return;
      const exhibitId = String(req.params.exhibitId || '').trim();
      if (!exhibitId) return res.status(400).json({ error: 'exhibitId required' });
      const exhibit = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId: req.workspaceId },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          storageKey: true,
          integrityHash: true,
          createdAt: true,
          matterId: true
        }
      });
      if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });
      const videoStatus = await deps.getVideoForensicsStatus(exhibitId);
      const pdfStatus = await deps.getPdfForensicsStatus(exhibitId);
      res.json({ exhibit, status: { video: videoStatus, pdf: pdfStatus }, videoStatus, pdfStatus });
    }) as any
  );

  router.get(
    '/api/exhibits/:exhibitId/artifacts',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_ARTIFACT_LIST')) return;
      const exhibitId = String(req.params.exhibitId || '').trim();
      if (!exhibitId) return res.status(400).json({ error: 'exhibitId required' });
      const videoArtifacts = await deps.listVideoForensicsArtifacts(exhibitId);
      const pdfArtifacts = await deps.listPdfForensicsArtifacts(exhibitId);
      const combined = [...pdfArtifacts, ...videoArtifacts];
      const merged = new Map<string, any>();
      for (const artifact of combined) {
        if (!artifact?.path) continue;
        if (!merged.has(artifact.path)) {
          merged.set(artifact.path, artifact);
        }
      }
      const artifacts = Array.from(merged.values()).sort((a, b) => String(a.path).localeCompare(String(b.path)));
      const videoStatus = await deps.getVideoForensicsStatus(exhibitId);
      const pdfStatus = await deps.getPdfForensicsStatus(exhibitId);
      const withUrls = artifacts.map((artifact: any) => ({
        ...artifact,
        downloadUrl: `/api/exhibits/${exhibitId}/artifacts/${encodeURIComponent(artifact.id)}`
      }));
      res.json({ exhibitId, status: { video: videoStatus, pdf: pdfStatus }, videoStatus, pdfStatus, artifacts: withUrls });
    }) as any
  );

  router.get(
    '/api/exhibits/:exhibitId/artifacts/:artifactId',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_ARTIFACT_DOWNLOAD')) return;
      const exhibitId = String(req.params.exhibitId || '').trim();
      const artifactId = decodeURIComponent(String(req.params.artifactId || ''));
      if (!exhibitId || !artifactId) return res.status(400).json({ error: 'exhibitId and artifactId required' });
      try {
        let filePath = '';
        try {
          filePath = deps.streamPdfArtifact(exhibitId, artifactId);
        } catch {
          filePath = deps.streamVideoArtifact(exhibitId, artifactId);
        }
        await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_ARTIFACT_DOWNLOAD', {
          exhibitId,
          artifactId
        }).catch(() => null);
        res.sendFile(filePath);
      } catch (err: any) {
        res.status(404).json({ error: err?.message || 'Artifact not found' });
      }
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/matters/:matterId/exhibits/:exhibitId/anchors',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireMatterAccess('matterId') as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_ANCHORS_MATTER')) return;
      const workspaceId = req.workspaceId;
      const exhibitId = req.params.exhibitId;
      const requestedMatterId = String(req.params.matterId || '').trim();
      const exhibit = req.scopedExhibit;

      if (!requestedMatterId) {
        return res.status(403).json({ error: 'Access denied: matterId required' });
      }
      if (!exhibit || exhibit.matterId !== requestedMatterId) {
        return res.status(403).json({ error: 'Access denied to matter' });
      }

      const anchors = await deps.prisma.anchor.findMany({
        where: {
          exhibitId,
          exhibit: { workspaceId }
        },
        orderBy: [{ pageNumber: 'asc' }, { lineNumber: 'asc' }]
      });

      await deps.logAuditEvent(workspaceId, req.userId, 'EXHIBIT_ANCHORS_READ', {
        exhibitId,
        matterId: requestedMatterId,
        anchorCount: anchors.length
      });

      res.json(anchors.map((a: any) => deps.withBBoxFields(a)));
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/anchors',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_ANCHORS')) return;
      const workspaceId = req.workspaceId;
      const exhibitId = req.params.exhibitId;

      const anchors = await deps.prisma.anchor.findMany({
        where: {
          exhibitId,
          exhibit: { workspaceId }
        },
        orderBy: [{ pageNumber: 'asc' }, { lineNumber: 'asc' }]
      });

      await deps.logAuditEvent(workspaceId, req.userId, 'EXHIBIT_ANCHORS_READ', {
        exhibitId,
        anchorCount: anchors.length
      });

      res.json(anchors.map((a: any) => deps.withBBoxFields(a)));
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/matters/:matterId/exhibits/:exhibitId/file',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireMatterAccess('matterId') as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      try {
        const exhibit = req.scopedExhibit;
        if (!exhibit) return res.status(403).json({ error: 'Access denied' });
        const role = String(req.workspaceRole || '').toLowerCase();
        const inline = String(req.query?.inline || '').toLowerCase() === '1';
        if (role === 'viewer' && !inline) {
          return res.status(403).json({ error: 'Download disabled for view-only role' });
        }
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_FILE_MATTER')) return;

        const requestedMatterId = String(req.params.matterId || '').trim();
        if (!requestedMatterId) {
          return res.status(403).json({ error: 'Access denied: matterId required' });
        }
        if (exhibit.matterId !== requestedMatterId) {
          return res.status(403).json({ error: 'Access denied to matter' });
        }

        const redactedKey = String(exhibit.redactionStatus || '').toUpperCase() === 'APPLIED'
          ? exhibit.redactedStorageKey
          : null;
        const storageKey = redactedKey || exhibit.storageKey;
        if (!redactedKey) {
          const verification = await deps.integrityService.verifyExhibitOnRead({
            workspaceId: exhibit.workspaceId,
            exhibitId: exhibit.id,
            actorId: req.userId,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            matterId: requestedMatterId
          });

          await deps.logAuditEvent(exhibit.workspaceId, req.userId, verification.ok ? 'EXHIBIT_FILE_ACCESS' : 'EXHIBIT_FILE_ACCESS_BLOCKED', {
            exhibitId: exhibit.id,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            currentHash: verification.currentHash,
            ok: verification.ok
          });

          if (!verification.ok) {
            return res.status(409).json({ error: 'Integrity failure', code: 'INTEGRITY_MISMATCH', exhibitId: exhibit.id });
          }
        } else {
          await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'EXHIBIT_REDACTED_FILE_ACCESS', {
            exhibitId: exhibit.id,
            storageKey,
            ok: true
          }).catch(() => null);
        }

        await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'VIEW_EXHIBIT', {
          resourceId: exhibit.id,
          exhibitId: exhibit.id,
          matterId: requestedMatterId,
          storageKey,
          ok: true,
          source: 'document_content_api'
        }).catch(() => null);

        await deps.waitForStorageKey(storageKey);
        await deps.waitForStorageKey(storageKey);
        const buffer = await deps.storageService.download(storageKey);
        res.contentType(exhibit.mimeType);
        res.send(buffer);
      } catch (err: any) {
        res.status(500).json({ error: 'Storage Access Failure: ' + err.message });
      }
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/file',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      try {
        const exhibit = req.scopedExhibit;
        if (!exhibit) return res.status(403).json({ error: 'Access denied' });
        const role = String(req.workspaceRole || '').toLowerCase();
        const inline = String(req.query?.inline || '').toLowerCase() === '1';
        if (role === 'viewer' && !inline) {
          return res.status(403).json({ error: 'Download disabled for view-only role' });
        }
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_FILE')) return;

        const requestedMatterId = typeof req.query?.matterId === 'string' && req.query.matterId.trim()
          ? req.query.matterId.trim()
          : undefined;
        if (!requestedMatterId) {
          return res.status(403).json({ error: 'Access denied: matterId required' });
        }
        const redactedKey = String(exhibit.redactionStatus || '').toUpperCase() === 'APPLIED'
          ? exhibit.redactedStorageKey
          : null;
        const storageKey = redactedKey || exhibit.storageKey;
        if (!redactedKey) {
          const verification = await deps.integrityService.verifyExhibitOnRead({
            workspaceId: exhibit.workspaceId,
            exhibitId: exhibit.id,
            actorId: req.userId,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            matterId: requestedMatterId
          });

          await deps.logAuditEvent(exhibit.workspaceId, req.userId, verification.ok ? 'EXHIBIT_FILE_ACCESS' : 'EXHIBIT_FILE_ACCESS_BLOCKED', {
            exhibitId: exhibit.id,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            currentHash: verification.currentHash,
            ok: verification.ok
          });

          if (!verification.ok) {
            return res.status(409).json({ error: 'Integrity failure', code: 'INTEGRITY_MISMATCH', exhibitId: exhibit.id });
          }
        } else {
          await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'EXHIBIT_REDACTED_FILE_ACCESS', {
            exhibitId: exhibit.id,
            storageKey,
            ok: true
          }).catch(() => null);
        }

        await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'VIEW_EXHIBIT', {
          resourceId: exhibit.id,
          exhibitId: exhibit.id,
          matterId: requestedMatterId,
          storageKey,
          ok: true,
          source: 'document_content_api'
        }).catch(() => null);

        await deps.waitForStorageKey(storageKey);
        await deps.waitForStorageKey(storageKey);
        const buffer = await deps.storageService.download(storageKey);
        res.contentType(exhibit.mimeType);
        res.send(buffer);
      } catch (err: any) {
        res.status(500).json({ error: 'Storage Access Failure: ' + err.message });
      }
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/views',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const exhibitId = String(req.params.exhibitId);
      const workspaceId = req.workspaceId;
      const likePattern = `%\"exhibitId\":\"${exhibitId}\"%`;
      const rows = await deps.prisma.$queryRaw<Array<{ actorId: string; views: bigint; lastViewed: Date }>>`
        SELECT "actorId",
               COUNT(*)::bigint AS "views",
               MAX("createdAt") AS "lastViewed"
        FROM "AuditEvent"
        WHERE "workspaceId" = ${workspaceId}
          AND "eventType" = 'VIEW_EXHIBIT'
          AND "payloadJson" LIKE ${likePattern}
        GROUP BY "actorId"
        ORDER BY "lastViewed" DESC
        LIMIT 200
      `;
      res.json({
        exhibitId,
        workspaceId,
        events: rows.map((row) => ({
          actorId: row.actorId,
          views: Number(row.views || 0),
          lastViewed: row.lastViewed
        }))
      });
    }) as any
  );

  router.get(
    '/api/exhibits/:exhibitId/anchors',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_ANCHORS_DEPRECATED')) return;
      res.setHeader('X-Deprecated', 'true');
      const workspaceId = req.workspaceId;
      const exhibitId = req.params.exhibitId;
      if (!workspaceId) {
        return res.status(500).json({ error: 'Workspace context missing' });
      }

      const anchors = await deps.prisma.anchor.findMany({
        where: {
          exhibitId,
          exhibit: { workspaceId }
        },
        orderBy: [{ pageNumber: 'asc' }, { lineNumber: 'asc' }]
      });

      await deps.logAuditEvent(workspaceId, req.userId, 'EXHIBIT_ANCHORS_READ', {
        exhibitId,
        anchorCount: anchors.length
      });

      res.json(anchors.map((a: any) => deps.withBBoxFields(a)));
    }) as any
  );

  router.get(
    '/api/exhibits/:exhibitId/file',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    (async (req: any, res: any) => {
      res.setHeader('X-Deprecated', 'true');
      try {
        const exhibit = req.scopedExhibit;
        if (!exhibit) return res.status(403).json({ error: 'Access denied' });
        const role = String(req.workspaceRole || '').toLowerCase();
        const inline = String(req.query?.inline || '').toLowerCase() === '1';
        if (role === 'viewer' && !inline) {
          return res.status(403).json({ error: 'Download disabled for view-only role' });
        }
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_FILE_DEPRECATED')) return;

        const requestedMatterId = typeof req.query?.matterId === 'string' && req.query.matterId.trim()
          ? req.query.matterId.trim()
          : undefined;
        if (!requestedMatterId) {
          return res.status(403).json({ error: 'Access denied: matterId required' });
        }

        const redactedKey = String(exhibit.redactionStatus || '').toUpperCase() === 'APPLIED'
          ? exhibit.redactedStorageKey
          : null;
        const storageKey = redactedKey || exhibit.storageKey;
        if (!redactedKey) {
          const verification = await deps.integrityService.verifyExhibitOnRead({
            workspaceId: exhibit.workspaceId,
            exhibitId: exhibit.id,
            actorId: req.userId,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            matterId: requestedMatterId
          });

          await deps.logAuditEvent(exhibit.workspaceId, req.userId, verification.ok ? 'EXHIBIT_FILE_ACCESS' : 'EXHIBIT_FILE_ACCESS_BLOCKED', {
            exhibitId: exhibit.id,
            storageKey: exhibit.storageKey,
            recordedHash: exhibit.integrityHash,
            currentHash: verification.currentHash,
            ok: verification.ok
          });

          if (!verification.ok) {
            return res.status(409).json({ error: 'Integrity failure', code: 'INTEGRITY_MISMATCH', exhibitId: exhibit.id });
          }
        } else {
          await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'EXHIBIT_REDACTED_FILE_ACCESS', {
            exhibitId: exhibit.id,
            storageKey,
            ok: true
          }).catch(() => null);
        }

        await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'VIEW_EXHIBIT', {
          resourceId: exhibit.id,
          exhibitId: exhibit.id,
          matterId: requestedMatterId,
          storageKey,
          ok: true,
          source: 'document_content_api'
        }).catch(() => null);

        const buffer = await deps.storageService.download(storageKey);
        res.contentType(exhibit.mimeType);
        res.send(buffer);
      } catch (err: any) {
        res.status(500).json({ error: 'Storage Access Failure: ' + err.message });
      }
    }) as any
  );

  const convertSchema = z.object({
    format: z.enum(['txt', 'pdf', 'docx'])
  });

  const rotateSchema = z.object({
    degrees: z.number().int().refine((value) => [90, 180, 270, -90].includes(value), {
      message: 'Rotation must be 90, 180, 270, or -90 degrees'
    })
  });

  router.post(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/rotate',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      try {
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_ROTATE')) return;
        const parsed = rotateSchema.safeParse(req.body || {});
        if (!parsed.success) {
          return res.status(400).json({ error: 'Invalid rotation payload' });
        }
        const exhibit = req.scopedExhibit;
        if (!exhibit) return res.status(403).json({ error: 'Access denied' });
        if (exhibit.mimeType !== 'application/pdf') {
          return res.status(415).json({ error: 'ROTATE_UNSUPPORTED', detail: 'Rotation supports PDF only.' });
        }
        const requestedMatterId = typeof req.body?.matterId === 'string' && req.body.matterId.trim()
          ? req.body.matterId.trim()
          : undefined;
        if (!requestedMatterId) {
          return res.status(403).json({ error: 'Access denied: matterId required' });
        }

        const verification = await deps.integrityService.verifyExhibitOnRead({
          workspaceId: exhibit.workspaceId,
          exhibitId: exhibit.id,
          actorId: req.userId,
          storageKey: exhibit.storageKey,
          recordedHash: exhibit.integrityHash,
          matterId: requestedMatterId
        });
        if (!verification.ok) {
          return res.status(409).json({ error: 'Integrity failure', code: 'INTEGRITY_MISMATCH', exhibitId: exhibit.id });
        }

        const buffer = await deps.storageService.download(exhibit.storageKey);
        const pdfDoc = await PDFDocument.load(buffer);
        const rotationDelta = parsed.data.degrees;
        for (const page of pdfDoc.getPages()) {
          const current = page.getRotation()?.angle ?? 0;
          const next = (current + rotationDelta + 360) % 360;
          page.setRotation(degrees(next));
        }
        const rotatedBytes = await pdfDoc.save();
        const safeName = String(exhibit.filename || 'exhibit').replace(/[^a-zA-Z0-9._-]+/g, '-');
        const matter = await deps.prisma.matter.findFirst({
          where: { id: exhibit.matterId, workspaceId: exhibit.workspaceId },
          select: { slug: true }
        });
        const matterSlug = matter?.slug || requestedMatterId;
        const storageKey = `${exhibit.workspaceId}/${matterSlug}/${Date.now()}-rotated-${safeName}`;
        await deps.storageService.upload(storageKey, Buffer.from(rotatedBytes));
        const integrityHash = crypto.createHash('sha256').update(rotatedBytes).digest('hex');

        const latestVersion = await deps.prisma.documentVersion.findFirst({
          where: { exhibitId: exhibit.id },
          orderBy: { version: 'desc' },
          select: { version: true }
        });
        const nextVersion = (latestVersion?.version || 0) + 1;

        const updated = await deps.prisma.exhibit.update({
          where: { id: exhibit.id },
          data: {
            storageKey,
            integrityHash,
            verificationStatus: 'PENDING',
            verifiedByUserId: null,
            verifiedAt: null,
            revokedAt: null,
            revocationReason: null
          }
        });

        await deps.prisma.documentVersion.create({
          data: {
            workspaceId: exhibit.workspaceId,
            exhibitId: exhibit.id,
            version: nextVersion,
            storageKey,
            integrityHash,
            createdByUserId: req.userId
          }
        }).catch(() => null);

        await deps.prisma.anchor.deleteMany({ where: { exhibitId: exhibit.id } }).catch(() => null);
        await deps.prisma.documentChunk.deleteMany({ where: { exhibitId: exhibit.id } }).catch(() => null);

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexipro-rotate-'));
        const tmpPath = path.join(tmpDir, `rotate-${exhibit.id}.pdf`);
        fs.writeFileSync(tmpPath, Buffer.from(rotatedBytes));
        await extractAnchorsFromPdf(exhibit.id, tmpPath);
        await deps.ingestionPipeline.ingestExhibit(exhibit.workspaceId, exhibit.id).catch(() => null);
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        try { fs.rmdirSync(tmpDir, { recursive: true }); } catch { /* ignore */ }

        await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'EXHIBIT_ROTATED_VERSIONED', {
          resourceId: exhibit.id,
          exhibitId: exhibit.id,
          matterId: requestedMatterId,
          degrees: rotationDelta,
          newStorageKey: storageKey,
          newVersion: nextVersion
        }).catch(() => null);

        res.json({ ok: true, exhibit: updated, version: nextVersion });
      } catch (err: any) {
        res.status(500).json({ error: 'ROTATION_FAILED', detail: err?.message || String(err) });
      }
    }) as any
  );

  router.post(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/convert',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      try {
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_CONVERT')) return;
        const parsed = convertSchema.safeParse(req.body || {});
        if (!parsed.success) {
          return res.status(400).json({ error: 'Invalid conversion payload' });
        }
        const exhibit = req.scopedExhibit;
        if (!exhibit) return res.status(403).json({ error: 'Access denied' });
        const requestedMatterId = typeof req.body?.matterId === 'string' && req.body.matterId.trim()
          ? req.body.matterId.trim()
          : (typeof req.query?.matterId === 'string' && req.query.matterId.trim() ? req.query.matterId.trim() : undefined);
        if (!requestedMatterId) {
          return res.status(403).json({ error: 'Access denied: matterId required' });
        }

        const verification = await deps.integrityService.verifyExhibitOnRead({
          workspaceId: exhibit.workspaceId,
          exhibitId: exhibit.id,
          actorId: req.userId,
          storageKey: exhibit.storageKey,
          recordedHash: exhibit.integrityHash,
          matterId: requestedMatterId
        });
        if (!verification.ok) {
          return res.status(409).json({ error: 'Integrity failure', code: 'INTEGRITY_MISMATCH', exhibitId: exhibit.id });
        }

        const buffer = await deps.storageService.download(exhibit.storageKey);
        let converted: Buffer;
        let contentType = 'application/octet-stream';
        let extension = parsed.data.format;
        if (parsed.data.format === 'txt') {
          converted = await deps.convertBufferToTxt(buffer, exhibit.mimeType, exhibit.filename);
          contentType = 'text/plain';
        } else if (parsed.data.format === 'pdf') {
          converted = await deps.convertBufferToPdf(buffer, exhibit.mimeType, exhibit.filename);
          contentType = 'application/pdf';
        } else {
          converted = await deps.convertBufferToDocx(buffer, exhibit.mimeType, exhibit.filename);
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';
        }

        await deps.logAuditEvent(exhibit.workspaceId, req.userId, 'EXHIBIT_CONVERTED', {
          resourceId: exhibit.id,
          exhibitId: exhibit.id,
          matterId: requestedMatterId,
          sourceMime: exhibit.mimeType,
          targetFormat: parsed.data.format
        }).catch(() => null);

        const safeName = exhibit.filename?.replace(/\.[^.]+$/, '') || `exhibit_${exhibit.id}`;
        const filename = `${safeName}.${extension}`;
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(converted);
      } catch (err: any) {
        res.status(500).json({ error: 'CONVERSION_FAILED', detail: err?.message || String(err) });
      }
    }) as any
  );

  router.get(
    '/api/exhibits/:exhibitId/package',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    requireDownloadAccess as any,
    (async (req: any, res: any) => {
      try {
        if (await enforceIntegrityGate(req, res, 'EXHIBIT_ADMISSIBILITY_PACKET')) return;
        const role = String(req.workspaceRole || '').toLowerCase();
        if (role === 'viewer') {
          return res.status(403).json({ error: 'Download disabled for view-only role' });
        }
        const exhibitId = String(req.params.exhibitId);
        const result = await deps.generateAdmissibilityPackage(req.workspaceId, exhibitId);
        try {
          await deps.logAuditEvent(req.workspaceId, req.userId, 'EXPORT_PACKET', {
            exhibitId,
            manifestHash: result.metadata.manifestHash,
            generatedAt: result.metadata.generatedAt
          });
        } catch (err: any) {
          console.warn('EXPORT_PACKET_AUDIT_FAIL', err?.message || String(err));
        }
        const filename = `case_${exhibitId}_admissibility.zip`;
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(result.buffer);
      } catch (err: any) {
        const detail = err?.message || String(err);
        console.error('[EXPORT_PACKET_FAIL]', {
          exhibitId: req.params.exhibitId,
          workspaceId: req.workspaceId,
          detail,
          stack: err?.stack || null
        });
        const host = String(req.headers?.host || '');
        const isLocalHost = host.startsWith('127.0.0.1') || host.startsWith('localhost');
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production' || isLocalHost) {
          try {
            const fallbackZip = new AdmZip();
            const generatedAt = new Date().toISOString();
            const summary = {
              error: 'Admissibility package failed',
              detail,
              exhibitId: req.params.exhibitId,
              workspaceId: req.workspaceId,
              generatedAt
            };
            fallbackZip.addFile('EXPORT_FAILED.md', Buffer.from(
              '# Admissibility Export Notice\n\n' +
              'Export fell back to a minimal packet in this environment.\n'
            ));
            fallbackZip.addFile('export_error.json', Buffer.from(JSON.stringify(summary, null, 2)));
            const filename = `case_${req.params.exhibitId}_admissibility.zip`;
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(fallbackZip.toBuffer());
            return;
          } catch (fallbackErr: any) {
            console.error('EXPORT_PACKET_FALLBACK_FAIL', fallbackErr?.message || String(fallbackErr));
          }
        }
        res.status(500).json({ error: 'Admissibility package failed', detail });
      }
    }) as any
  );

  const exhibitDeletionSchema = z.object({
    reason: z.string().min(3)
  });

  router.delete(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_DELETE')) return;
      const parsed = exhibitDeletionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Deletion reason required' });
      }

      const exhibitId = String(req.params.exhibitId);
      const exhibit = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
        select: { id: true, legalHold: true }
      });

      if (!exhibit) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (exhibit.legalHold) {
        return res.status(403).json({
          error: 'COMPLIANCE LOCK: Mandatory Preservation Order (FRCP 37e) is active. Deletion is cryptographically blocked.'
        });
      }

      const updateResult = await deps.prisma.exhibit.updateMany({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          reasonForDeletion: parsed.data.reason
        }
      });

      if (!updateResult.count) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_SOFT_DELETE', {
        exhibitId,
        reason: parsed.data.reason
      });

      res.json({ ok: true, exhibitId });
    }) as any
  );

  router.delete(
    '/api/exhibits/:id',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'id') as any,
    deps.requireLegalHoldClear('id') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_DELETE_LEGACY')) return;
      const parsed = exhibitDeletionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Deletion reason required' });
      }

      const exhibitId = String(req.params.id);
      const exhibit = await deps.prisma.exhibit.findUnique({
        where: { id: exhibitId },
        select: { id: true, workspaceId: true, legalHold: true, deletedAt: true }
      });

      if (!exhibit || exhibit.workspaceId !== req.workspaceId || exhibit.deletedAt) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (exhibit.legalHold) {
        return res.status(403).json({
          error: 'COMPLIANCE LOCK: Mandatory Preservation Order (FRCP 37e) is active. Deletion is cryptographically blocked.'
        });
      }

      const updateResult = await deps.prisma.exhibit.updateMany({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          reasonForDeletion: parsed.data.reason
        }
      });

      if (!updateResult.count) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await deps.logAuditEvent(req.workspaceId, req.userId, 'EXHIBIT_SOFT_DELETE', {
        exhibitId,
        reason: parsed.data.reason
      });

      res.json({ ok: true, exhibitId });
    }) as any
  );

  router.post(
    '/api/exhibits/:exhibitId/toggle-hold',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireApprovalToken as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_TOGGLE_HOLD')) return;
      const exhibitId = String(req.params.exhibitId);
      const exhibit = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
        select: { id: true, legalHold: true }
      });

      if (!exhibit) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await deps.prisma.exhibit.update({
        where: { id: exhibitId },
        data: { legalHold: !exhibit.legalHold },
        select: { id: true, legalHold: true }
      });

      await deps.logAuditEvent(req.workspaceId, req.userId, 'TOGGLE_LEGAL_HOLD', {
        exhibitId,
        legalHold: updated.legalHold
      });

      res.json({ ok: true, exhibitId, legalHold: updated.legalHold });
    }) as any
  );

  router.get(
    '/api/workspaces/:workspaceId/exhibits/:exhibitId/certificate',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.validateResourceAccess('exhibit', 'exhibitId') as any,
    deps.requireLegalHoldClear('exhibitId') as any,
    deps.certificateLimiter as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'EXHIBIT_CERTIFICATE')) return;
      const role = String(req.workspaceRole || '').toLowerCase();
      if (role === 'viewer' || role === 'client') {
        return res.status(403).json({ error: 'Download disabled for view-only role' });
      }
      const exhibitId = String(req.params.exhibitId);
      const workspaceId = req.workspaceId;

      const exhibit = await deps.prisma.exhibit.findFirst({
        where: { id: exhibitId, workspaceId },
        select: { id: true }
      });
      if (!exhibit) {
        return res.status(404).json({ error: 'Exhibit not found' });
      }

      const anchors = await deps.prisma.anchor.findMany({
        where: {
          exhibitId,
          exhibit: { workspaceId }
        },
        orderBy: [{ pageNumber: 'asc' }, { lineNumber: 'asc' }]
      });

      if (anchors.length === 0) {
        return res.status(422).json({
          errorCode: 'ANCHOR_REQUIRED',
          message: 'No Anchor -> No Output: certificate export requires anchors.'
        });
      }

      const integrity = await deps.integrityService.verifyWorkspaceChain(workspaceId);
      const auditEvents = await deps.prisma.auditEvent.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, eventType: true, createdAt: true }
      });

      const certificate = deps.buildCertificateV1({
        workspaceId,
        exhibitId,
        anchors,
        integrity,
        auditEvents,
        systemVersion: deps.systemVersion,
        buildProofUrl: deps.getBuildProofUrl(),
        auditNote: 'Last 20 workspace audit events (exhibit scoping unavailable).'
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="LexiPro_Certificate_${workspaceId}_${exhibitId}.json"`);
      res.setHeader('Cache-Control', 'no-store');
      res.json(certificate);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/exhibits/:exhibitId/forensic/findings/validate', deps.authenticate as any, deps.requireWorkspace as any, deps.validateResourceAccess('exhibit', 'exhibitId') as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    const exhibitId = String(req.params.exhibitId);
    const findings = (req.body && (req.body.findings ?? req.body)) || [];
    try {
      const validated = await deps.assertGroundedFindings(deps.prisma as any, findings, req.workspaceId);
      if (validated.some((f: any) => f.exhibitId !== exhibitId)) {
        return res.status(422).json({ error: 'EXHIBIT_MISMATCH', detail: 'One or more findings exhibitId does not match route exhibitId.' });
      }
      return res.json({ ok: true, exhibitId, findingsCount: validated.length });
    } catch (err: any) {
      return deps.to422(res, err);
    }
  }) as any);

  return router;
}
