import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { mediaIngestionService } from "../services/mediaIngestionService.js";
import { VectorStorageService } from "../services/VectorStorageService.js";

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function resolveFixturePath(name: string) {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "fixtures", "media", name),
    path.resolve(cwd, "server", "fixtures", "media", name)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Fixture not found: ${name}`);
}

async function ensureWorkspace() {
  const name = "Phase 5 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "phase5-video";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Phase 5 Video Matter",
      description: "Video forensics validation"
    }
  });
}

async function main() {
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);

  const tmpDir = path.resolve(process.cwd(), "server", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const fixturePath = resolveFixturePath("fixture.mp4");
  const filePath = path.join(tmpDir, `phase5-video-${Date.now()}.mp4`);
  const fixtureVideo = await fs.promises.readFile(fixturePath);
  await fs.promises.writeFile(filePath, fixtureVideo);

  const storageKey = `${workspace.id}/${matter.slug}/phase5-video-${Date.now()}.mp4`;
  await storageService.upload(storageKey, fixtureVideo);

  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: "phase5-video.mp4",
      mimeType: "video/mp4",
      storageKey,
      integrityHash: sha256(fixtureVideo),
      type: "VIDEO"
    }
  });

  await mediaIngestionService.ingestMedia(filePath, exhibit.id, "video/mp4");

  const segments = await prisma.transcriptSegment.findMany({ where: { exhibitId: exhibit.id } });
  if (!segments.length) {
    throw new Error("No TranscriptSegment rows created.");
  }

  const vectorStore = new VectorStorageService();
  const hits = await vectorStore.queryTranscriptSegments("speeding", exhibit.id, 3);
  if (!hits.length) {
    throw new Error("No transcript search results.");
  }

  const match = hits.find((hit) => Math.abs(hit.startTime - 10.0) < 0.01);
  if (!match) {
    throw new Error(`Expected startTime 10.0 not found. Got ${hits.map((h) => h.startTime).join(", ")}`);
  }

  console.log("Phase 5 validation PASS", {
    transcriptCount: segments.length,
    topHit: { startTime: hits[0].startTime, text: hits[0].text }
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 5 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
