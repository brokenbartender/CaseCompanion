import type { Request, Response, NextFunction } from 'express';

/**
 * accessInvariants.ts
 *
 * Forensic zero-trust route contracts.
 *
 * Invariants:
 * 1) Any route that accepts :workspaceId must enforce membership for req.userId.
 * 2) Any route that accepts :exhibitId must resolve exhibit -> workspaceId and enforce membership.
 * 3) If both params exist, :workspaceId MUST match the exhibit.workspaceId.
 */

export interface AccessDeps {
  prisma: {
    workspaceMember: {
      findUnique: (args: any) => Promise<any>;
    };
    exhibit: {
      findFirst: (args: any) => Promise<any>;
    };
  };
}

export interface ScopedRequest extends Request {
  userId?: string;
  workspaceId?: string;
  workspaceRole?: string;
  scopedExhibit?: {
    id: string;
    workspaceId: string;
    storageKey: string;
    mimeType: string;
    integrityHash: string;
    verificationStatus: 'PENDING' | 'CERTIFIED' | 'REVOKED';
  };
}

function getParam(req: Request, name: string): string {
  const raw: any = (req as any).params?.[name];
  if (raw == null) return '';
  return String(Array.isArray(raw) ? raw[0] : raw).trim();
}

export function requireWorkspaceAccessFromParam(deps: AccessDeps, paramName: string = 'workspaceId') {
  return async (req: ScopedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = getParam(req, paramName);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const membership = await deps.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (!membership) return res.status(403).json({ error: 'Access denied to workspace' });

    req.workspaceId = workspaceId;
    req.workspaceRole = membership.role;
    next();
  };
}

export function requireExhibitAccessFromParam(deps: AccessDeps, paramName: string = 'exhibitId') {
  return async (req: ScopedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const exhibitId = getParam(req, paramName);
    if (!exhibitId) return res.status(400).json({ error: 'Exhibit ID required' });

    const requestedWorkspaceId = getParam(req, 'workspaceId');
    const exhibit = await deps.prisma.exhibit.findFirst({
      where: {
        id: exhibitId,
        deletedAt: null,
        ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
        workspace: { members: { some: { userId } } }
      },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!exhibit) return res.status(404).json({ error: 'Exhibit not found' });

    req.workspaceId = exhibit.workspaceId;
    const memberRecord = exhibit.workspace?.members?.[0];
    if (!memberRecord) return res.status(403).json({ error: 'Membership integrity failure' });
    req.workspaceRole = memberRecord.role;
    const { workspace, ...cleanExhibit } = exhibit as any;
    req.scopedExhibit = cleanExhibit as any;
    next();
  };
}
