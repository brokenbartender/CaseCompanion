import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export interface WorkspaceScopedRequest extends Request {
  userId?: string;
  workspaceId?: string;
  workspaceRole?: string;
  scopedExhibit?: {
    id: string;
    workspaceId: string;
    matterId?: string;
    storageKey: string;
    mimeType: string;
    integrityHash: string;
    verificationStatus: 'PENDING' | 'CERTIFIED' | 'REVOKED';
    documentType?: string;
    privilegeTag?: string;
    privilegeType?: string;
    privilegePending?: boolean;
    redactionStatus?: string;
    redactedStorageKey?: string | null;
    matter?: {
      ethicalWallEnabled: boolean;
      allowedUserIds: string[];
    } | null;
  };
}

type ResourceType = 'exhibit' | 'anchor' | 'auditEvent';

function deny(res: Response) {
  return res.status(404).json({ error: 'Not found' });
}

function getParam<T extends string>(req: Request, name: string): T {
  const raw = req.params?.[name];
  if (Array.isArray(raw)) return String(raw[0]).trim() as T;
  return String(raw || '').trim() as T;
}

function getQueryFlag(req: Request, name: string): string {
  const raw = (req.query as Record<string, unknown>)?.[name];
  if (Array.isArray(raw)) return String(raw[0] || '').toLowerCase();
  return String(raw || '').toLowerCase();
}

/**
 * Resolve a resource by ID and workspace scope.
 * @returns Scoped resource or null if not accessible.
 */
export async function verifyScopedResource(args: {
  resourceType: ResourceType;
  resourceId: string;
  workspaceId: string;
  allowDeleted: boolean;
}): Promise<WorkspaceScopedRequest['scopedExhibit'] | { id: string } | null> {
  const { resourceType, resourceId, workspaceId, allowDeleted } = args;

  if (resourceType === 'exhibit') {
    return prisma.exhibit.findFirst({
      where: {
        id: resourceId,
        workspaceId,
        ...(allowDeleted ? {} : { deletedAt: null })
      },
      select: {
        id: true,
        workspaceId: true,
        matterId: true,
        storageKey: true,
        mimeType: true,
        integrityHash: true,
        verificationStatus: true,
        documentType: true,
        privilegeTag: true,
        privilegeType: true,
        privilegePending: true,
        redactionStatus: true,
        redactedStorageKey: true,
        matter: {
          select: {
            ethicalWallEnabled: true,
            allowedUserIds: true
          }
        }
      }
    });
  }

  if (resourceType === 'anchor') {
    return prisma.anchor.findFirst({
      where: {
        id: resourceId,
        exhibit: {
          workspaceId,
          ...(allowDeleted ? {} : { deletedAt: null })
        }
      },
      select: { id: true }
    });
  }

  return prisma.auditEvent.findFirst({
    where: { id: resourceId, workspaceId },
    select: { id: true }
  });
}

export const validateResourceAccess = (resourceType: ResourceType, paramName = 'id') => {
  return async (req: WorkspaceScopedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    const resourceId = getParam(req, paramName);
    if (!resourceId) {
      return next();
    }

    const role = String(req.workspaceRole || '').toLowerCase();
    const includeDeletedParam = getQueryFlag(req, 'includeDeleted');
    const allowDeleted = (role === 'admin' || role === 'owner') && (includeDeletedParam === 'true' || includeDeletedParam === '1');

    const resource = await verifyScopedResource({
      resourceType,
      resourceId,
      workspaceId,
      allowDeleted
    });

    if (!resource) {
      return deny(res);
    }

    if (resourceType === 'exhibit') {
      const exhibit = resource as WorkspaceScopedRequest['scopedExhibit'];
      const allowed = Array.isArray(exhibit?.matter?.allowedUserIds) ? exhibit?.matter?.allowedUserIds : [];
      const canBypassWall = role === 'admin' || role === 'owner';
      const requiresExplicit = role === 'client' || role === 'co_counsel';
      const wallEnabled = Boolean(exhibit?.matter?.ethicalWallEnabled);
      if (!canBypassWall) {
        if (requiresExplicit && allowed.length === 0) {
          return deny(res);
        }
        if (wallEnabled && allowed.length > 0 && !allowed.includes(userId)) {
          return deny(res);
        }
      }
      if (role === 'client' && String(exhibit?.documentType || '').toUpperCase() !== 'PUBLIC') {
        return res.status(403).json({ error: 'Access denied to document type' });
      }
      req.scopedExhibit = exhibit;
    }

    return next();
  };
};
