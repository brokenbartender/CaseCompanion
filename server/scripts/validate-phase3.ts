import crypto from "crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "../services/IngestionPipeline.js";

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ensureWorkspace() {
  const name = "Phase 3 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "phase3-validation";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Phase 3 Validation Matter",
      description: "Deadline extraction validation"
    }
  });
}

async function buildDeadlinePdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lines = [
    "SAMPLE CONTRACT.",
    "Response due within 30 days.",
    "All other terms remain in full force and effect."
  ];
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 72, y, size: fontSize, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function createExhibit(workspaceId: string, matterId: string, pdfBytes: Buffer) {
  const storageKey = `${workspaceId}/${matterId}/phase3-deadline-${Date.now()}.pdf`;
  await storageService.upload(storageKey, pdfBytes);
  return prisma.exhibit.create({
    data: {
      workspaceId,
      matterId,
      filename: "phase3-deadline.pdf",
      mimeType: "application/pdf",
      storageKey,
      integrityHash: sha256(pdfBytes)
    }
  });
}

async function main() {
  const expectedSource = "Response due within 30 days.";
  const pdfBytes = await buildDeadlinePdf();
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);
  const exhibit = await createExhibit(workspace.id, matter.id, pdfBytes);

  const ingestion = new IngestionPipeline();
  await ingestion.ingestExhibit(workspace.id, exhibit.id);

  const deadline = await prisma.deadline.findFirst({
    where: { exhibitId: exhibit.id },
    orderBy: { createdAt: "desc" }
  });

  if (!deadline) {
    throw new Error("No Deadline row created.");
  }

  if (deadline.status !== "DETECTED") {
    throw new Error(`Deadline status mismatch. Expected DETECTED, got ${deadline.status}.`);
  }

  if (deadline.sourceText !== expectedSource) {
    throw new Error(`Deadline sourceText mismatch. Expected \"${expectedSource}\", got \"${deadline.sourceText}\".`);
  }

  console.log("Phase 3 validation:", {
    deadlineId: deadline.id,
    status: deadline.status,
    sourceText: deadline.sourceText,
    confidence: deadline.confidence,
  });
}

main()
  .then(() => {
    console.log("Phase 3 validation complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Phase 3 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
