import type { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

function getParam(req: any, name: string): string {
  const raw: any = req?.params?.[name];
  if (raw == null) return "";
  return String(Array.isArray(raw) ? raw[0] : raw).trim();
}

export function requireLegalHoldClear(paramName: string = "exhibitId") {
  return async (req: any, res: Response, next: NextFunction) => {
    const exhibitId = getParam(req, paramName);
    if (!exhibitId) return next();
    const exhibit = await prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId: req.workspaceId, deletedAt: null },
      select: { id: true, legalHold: true }
    });
    if (!exhibit) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (exhibit.legalHold) {
      return res.status(403).json({
        error: "COMPLIANCE_LOCK",
        message: "Mandatory Preservation Order (FRCP 37e) is active. Mutation blocked."
      });
    }
    return next();
  };
}
