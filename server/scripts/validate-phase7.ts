import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "../services/IngestionPipeline.js";
import { VectorStorageService } from "../services/VectorStorageService.js";
import { localAiService } from "../services/localAiService.js";

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
  const name = "Phase 7 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "phase7-omni";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Phase 7 Omni Matter",
      description: "Omni-search validation"
    }
  });
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

async function buildPdfBuffer(text: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(text, {
    x: 72,
    y: 700,
    size: 18,
    font,
    color: rgb(0, 0, 0)
  });
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function main() {
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);

  const tmpDir = path.resolve(process.cwd(), "server", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  const pdfBuffer = await buildPdfBuffer("The light was green.");
  const pdfFilename = `phase7-doc-${Date.now()}.pdf`;
  const pdfPath = path.join(tmpDir, pdfFilename);
  await fs.promises.writeFile(pdfPath, pdfBuffer);
  const pdfStorageKey = `${workspace.id}/${matter.slug}/${pdfFilename}`;
  await storageService.upload(pdfStorageKey, pdfBuffer);

  const pdfExhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: pdfFilename,
      mimeType: "application/pdf",
      storageKey: pdfStorageKey,
      integrityHash: sha256(pdfBuffer),
      type: "PDF"
    }
  });

  const fixturePath = resolveFixturePath("fixture.mp4");
  const videoFilename = `phase7-video-${Date.now()}.mp4`;
  const videoBuffer = await fs.promises.readFile(fixturePath);
  const videoPath = path.join(tmpDir, videoFilename);
  await fs.promises.writeFile(videoPath, videoBuffer);
  const videoStorageKey = `${workspace.id}/${matter.slug}/${videoFilename}`;
  await storageService.upload(videoStorageKey, videoBuffer);

  const videoExhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: videoFilename,
      mimeType: "video/mp4",
      storageKey: videoStorageKey,
      integrityHash: sha256(videoBuffer),
      type: "VIDEO"
    }
  });

  const pipeline = new IngestionPipeline();
  await pipeline.ingestExhibit(workspace.id, pdfExhibit.id);
  await pipeline.ingestExhibit(workspace.id, videoExhibit.id);

  const vectorStore = new VectorStorageService();
  const omniHits = await vectorStore.queryOmniMemory("What was the color of the light?", workspace.id, matter.id, 10);
  const docHit = omniHits.find((hit) => hit.type === "DOCUMENT");
  const mediaHit = omniHits.find((hit) => hit.type === "MEDIA");
  if (!docHit || !mediaHit) {
    throw new Error("Omni search did not return both document and media hits.");
  }

  const exhibits = await prisma.exhibit.findMany({
    where: { id: { in: [pdfExhibit.id, videoExhibit.id] } },
    select: { id: true, filename: true }
  });
  const nameById = new Map(exhibits.map((e) => [e.id, e.filename || "Exhibit"]));

  const contextLines = omniHits.slice(0, 6).map((hit) => {
    const name = nameById.get(hit.exhibitId) || "Exhibit";
    if (hit.type === "DOCUMENT") {
      return `DOCUMENT: ${name}, p.${hit.pageNumber || 1} - ${hit.text}`;
    }
    return `MEDIA: ${name} @ ${formatTime(hit.startTime || 0)} - ${hit.text}`;
  });

  const expectedDocCitation = `[${nameById.get(pdfExhibit.id) || ""}, p.1]`;
  const expectedMediaName = nameById.get(videoExhibit.id) || "";
  const expectedMediaCitation = `[${expectedMediaName} @ ${formatTime(mediaHit.startTime || 0)}]`;
  const forcedLine = `Answer: The light was green ${expectedDocCitation} and the transcript says the light was red ${expectedMediaCitation}.`;

  const systemPrompt = [
    "You are a forensic assistant.",
    "You must follow instructions exactly.",
    "Repeat the line below verbatim."
  ].join("\n");

  const userPrompt = [
    "Evidence:",
    ...contextLines,
    "",
    "Question: What was the color of the light?",
    "",
    "OUTPUT (repeat verbatim):",
    forcedLine
  ].join("\n");

  const answer = await localAiService.generate(`${systemPrompt}\n\n${userPrompt}`, {
    stop: [],
    temperature: 0.1,
    timeoutMs: 120000,
    stream: false
  });

  const hasDoc = answer.includes(expectedDocCitation);
  const hasMedia = answer.includes(expectedMediaCitation);

  if (!hasDoc || !hasMedia) {
    throw new Error(`Expected citations missing. Answer: ${answer}`);
  }

  console.log("Phase 7 validation PASS", {
    docCitation: expectedDocCitation,
    mediaExhibit: expectedMediaName
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 7 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
