import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export type DemoContext = {
  userId: string;
  workspaceId: string;
  matterId: string;
  exhibitPdfId: string;
};

function buildJwtOptions() {
  const options = {} as jwt.SignOptions;
  const issuer = String(process.env.JWT_ISSUER || "").trim();
  const audience = String(process.env.JWT_AUDIENCE || "").trim();
  if (issuer) options.issuer = issuer;
  if (audience) options.audience = audience;
  options.expiresIn = "1h";
  return options;
}

export async function getDemoContext(): Promise<DemoContext> {
  const workspaceNames = ["State v. Nexus", "M&A Green Run"];
  const workspace = await prisma.workspace.findFirst({
    where: { name: { in: workspaceNames } }
  });
  if (!workspace) throw new Error("Demo workspace not found. Run npm run demo:reset.");

  const matter = await prisma.matter.findFirst({
    where: { workspaceId: workspace.id }
  });
  if (!matter) throw new Error("Demo matter not found. Run npm run demo:reset.");

  const user = await prisma.user.findUnique({
    where: { email: "demo@lexipro.local" }
  });
  if (!user) throw new Error("Demo user not found. Run npm run demo:reset.");

  const pdfExhibit = await prisma.exhibit.findFirst({
    where: { workspaceId: workspace.id, mimeType: "application/pdf" }
  });
  if (!pdfExhibit) throw new Error("Demo PDF exhibit not found.");

  return {
    userId: user.id,
    workspaceId: workspace.id,
    matterId: matter.id,
    exhibitPdfId: pdfExhibit.id
  };
}

export function buildAuthHeader(userId: string) {
  const secret = String(process.env.JWT_SECRET || "");
  if (!secret) throw new Error("JWT_SECRET missing.");
  const token = jwt.sign({ userId }, secret, buildJwtOptions());
  return `Bearer ${token}`;
}
