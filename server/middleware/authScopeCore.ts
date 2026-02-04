import type { Request, Response, NextFunction } from 'express';

export interface WorkspaceScopedRequest extends Request {
  userId?: string;
  workspaceId?: string;
  scopedExhibit?: {
    id: string;
    workspaceId: string;
    storageKey: string;
    mimeType: string;
    integrityHash: string;
    verificationStatus: 'PENDING' | 'CERTIFIED' | 'REVOKED';
  };
}

type PrismaLike = {
  exhibit: {
    findFirst: (args: any) => Promise<any>;
  };
};

function getParam(req: Request, name: string): string {
  const raw: any = (req as any).params?.[name];
  if (raw == null) return '';
  return String(Array.isArray(raw) ? raw[0] : raw).trim();
}

/**
 * Factory to enable deterministic unit tests (inject prisma-like deps).
 */
export function validateWorkspaceAccessFactory(prisma: PrismaLike) {
  return async (req: WorkspaceScopedRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exhibitId = getParam(req, 'exhibitId') || getParam(req, 'exhibit_id');
    if (!exhibitId) {
      return next();
    }

    const requestedWorkspaceId = getParam(req, 'workspaceId');
    const exhibit = await prisma.exhibit.findFirst({
      where: {
        id: exhibitId,
        deletedAt: null,
        ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
        workspace: { members: { some: { userId } } }
      },
      select: {
        id: true,
        workspaceId: true,
        storageKey: true,
        mimeType: true,
        integrityHash: true,
        verificationStatus: true
      }
    });

    if (!exhibit) {
      return res.status(404).json({ error: 'Exhibit not found' });
    }

    req.workspaceId = exhibit.workspaceId;
    req.scopedExhibit = exhibit;
    next();
  };
}
