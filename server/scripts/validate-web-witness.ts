import { prisma } from "../lib/prisma.js";
import { webCaptureService } from "../services/webCaptureService.js";
import { VectorStorageService } from "../services/VectorStorageService.js";

async function ensureWorkspace() {
  const name = "Web Witness Validation";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "web-witness";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Web Witness Validation",
      description: "Automated web capture validation"
    }
  });
}

async function main() {
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);

  const result = await webCaptureService.captureUrl("https://example.com", workspace.id, matter.id);

  const exhibit = await prisma.exhibit.findFirst({
    where: { id: result.exhibitId, workspaceId: workspace.id },
    select: { id: true, storageKey: true, type: true }
  });

  if (!exhibit) {
    throw new Error("Exhibit not found after capture.");
  }
  if (!String(exhibit.storageKey || "").toLowerCase().endsWith(".png")) {
    throw new Error("Expected PNG storage key for web capture.");
  }

  const vectorStore = new VectorStorageService();
  const hits = await vectorStore.queryOmniMemory("Domain", workspace.id, matter.id, 8);
  const hasDomain = hits.some((hit) => /domain/i.test(hit.text || ""));
  if (!hasDomain) {
    throw new Error("Vector search did not find captured text.");
  }

  console.log("Web witness validation PASS", {
    exhibitId: exhibit.id,
    type: exhibit.type,
    storageKey: exhibit.storageKey,
    hits: hits.length
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Web witness validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
