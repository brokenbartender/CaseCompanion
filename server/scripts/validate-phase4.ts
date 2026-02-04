import { prisma } from "../lib/prisma.js";
import { integrationService } from "../services/integrationService.js";

async function ensureWorkspace() {
  const name = "Phase 4 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function main() {
  const workspace = await ensureWorkspace();
  const integration = await prisma.integration.create({
    data: {
      workspaceId: workspace.id,
      type: "CLIO",
      credentials: JSON.stringify({ apiKey: "mock" }),
      status: "ACTIVE"
    }
  });

  const result = await integrationService.syncWorkspace(integration.id);

  const externalCount = await prisma.externalResource.count({
    where: { workspaceId: workspace.id, integrationId: integration.id }
  });

  const exhibitCount = await prisma.exhibit.count({
    where: { workspaceId: workspace.id }
  });

  if (!externalCount) {
    throw new Error("No ExternalResource rows created.");
  }

  if (exhibitCount < externalCount) {
    throw new Error("Exhibits were not created for external resources.");
  }

  console.log("Phase 4 validation PASS", {
    imported: result.imported,
    total: result.total,
    externalCount,
    exhibitCount
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 4 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
