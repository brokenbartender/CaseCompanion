import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

function getParam(req: Request, name: string): string {
  const raw: any = (req as any).params?.[name];
  if (raw == null) return "";
  return String(Array.isArray(raw) ? raw[0] : raw).trim();
}

function isAdminRole(role: string) {
  return role === "admin" || role === "owner";
}

function requiresExplicitScope(role: string) {
  return role === "client" || role === "co_counsel";
}

async function findMatter(workspaceId: string, matterIdOrSlug: string) {
  const byId = await prisma.matter.findFirst({
    where: { id: matterIdOrSlug, workspaceId, deletedAt: null }
  }).catch(() => null);
  if (byId) return byId;
  const bySlug = await prisma.matter.findUnique({
    where: { workspaceId_slug: { workspaceId, slug: matterIdOrSlug } }
  }).catch(() => null);
  if (bySlug?.deletedAt) return null;
  return bySlug;
}

export function requireMatterAccess(paramName: string = "matterId") {
  return async (req: any, res: Response, next: NextFunction) => {
    const workspaceId = req.workspaceId;
    const userId = req.userId;
    if (!workspaceId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const matterIdOrSlug = getParam(req, paramName);
    if (!matterIdOrSlug) return next();

    const matter = await findMatter(workspaceId, matterIdOrSlug);
    if (!matter) return res.status(404).json({ error: "Matter not found" });

    const role = String(req.workspaceRole || "").toLowerCase();
    const allowedUserIds = Array.isArray((matter as any).allowedUserIds) ? (matter as any).allowedUserIds : [];
    const ethicalWallEnabled = Boolean((matter as any).ethicalWallEnabled);
    if (!isAdminRole(role)) {
      if (requiresExplicitScope(role) && allowedUserIds.length === 0) {
        return res.status(403).json({ error: "Access denied to matter" });
      }
      if (ethicalWallEnabled && allowedUserIds.length > 0 && !allowedUserIds.includes(userId)) {
        return res.status(403).json({ error: "Access denied to matter" });
      }
    }

    (req as any).matter = matter;
    return next();
  };
}
