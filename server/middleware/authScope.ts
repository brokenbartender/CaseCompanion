import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

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

export const validateWorkspaceAccess = async (
  req: WorkspaceScopedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const exhibitId = String(req.params?.exhibitId || req.params?.exhibit_id || '').trim();
  if (!exhibitId) {
    return next();
  }

  const requestedWorkspaceId = String((req.params as any)?.workspaceId || "").trim();
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
