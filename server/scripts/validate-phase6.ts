import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { mediaIngestionService } from "../services/mediaIngestionService.js";
import { getUnifiedTimeline } from "../services/chronologyService.js";

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
  const name = "Phase 6 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "phase6-media";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Phase 6 Media Matter",
      description: "Audio forensics + unified timeline validation"
    }
  });
}

async function main() {
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);

  const tmpDir = path.resolve(process.cwd(), "server", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const fixturePath = resolveFixturePath("fixture.wav");
  const filePath = path.join(tmpDir, `phase6-audio-${Date.now()}.wav`);
  const fixtureAudio = await fs.promises.readFile(fixturePath);
  await fs.promises.writeFile(filePath, fixtureAudio);

  const storageKey = `${workspace.id}/${matter.slug}/phase6-audio-${Date.now()}.wav`;
  await storageService.upload(storageKey, fixtureAudio);

  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: "phase6-audio.wav",
      mimeType: "audio/wav",
      storageKey,
      integrityHash: sha256(fixtureAudio),
      type: "AUDIO"
    }
  });

  await mediaIngestionService.ingestMedia(filePath, exhibit.id, "audio/wav");

  const segments = await prisma.transcriptSegment.findMany({ where: { exhibitId: exhibit.id } });
  if (!segments.length) {
    throw new Error("No TranscriptSegment rows created for audio.");
  }

  const deadline = await prisma.deadline.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      exhibitId: exhibit.id,
      title: "Audio response due",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      sourceText: "Response due within 7 days.",
      status: "DETECTED",
      confidence: 0.92
    }
  });

  const timeline = await getUnifiedTimeline(matter.id);
  const exhibitEventIndex = timeline.findIndex((ev) => ev.id === `exhibit:${exhibit.id}`);
  const deadlineEventIndex = timeline.findIndex((ev) => ev.id === `deadline:${deadline.id}`);

  if (exhibitEventIndex === -1 || deadlineEventIndex === -1) {
    throw new Error("Unified timeline missing exhibit or deadline event.");
  }
  if (exhibitEventIndex > deadlineEventIndex) {
    throw new Error("Unified timeline is not sorted by date.");
  }

  console.log("Phase 6 validation PASS", {
    transcriptCount: segments.length,
    timelineEvents: timeline.length
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 6 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
