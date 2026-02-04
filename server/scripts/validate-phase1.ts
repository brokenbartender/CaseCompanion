import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "../services/IngestionPipeline.js";
import { assessExhibitAgainstPlaybook } from "../services/riskAssessmentService.js";

const FIXTURE_PATH = path.resolve(process.cwd(), "e2e", "fixtures", "sample.pdf");

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ensureWorkspace() {
  const name = "Phase 1 Validation Workspace";
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function ensureMatter(workspaceId: string) {
  const slug = "phase1-validation";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Phase 1 Validation Matter",
      description: "End-to-end safety validation"
    }
  });
}

async function buildFallbackPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lines = [
    "SAMPLE CONTRACT",
    "Liability is capped at 1x fees paid in the prior 12 months.",
    "Confidentiality obligations survive for 2 years."
  ];
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 72, y, size: fontSize, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

async function loadFixturePdf(): Promise<Buffer> {
  if (fs.existsSync(FIXTURE_PATH)) {
    return fs.readFileSync(FIXTURE_PATH);
  }
  return buildFallbackPdf();
}

async function createExhibit(workspaceId: string, matterId: string, pdfBytes: Buffer) {
  const storageKey = `${workspaceId}/${matterId}/phase1-sample-${Date.now()}.pdf`;
  await storageService.upload(storageKey, pdfBytes);
  return prisma.exhibit.create({
    data: {
      workspaceId,
      matterId,
      filename: "phase1-sample.pdf",
      mimeType: "application/pdf",
      storageKey,
      integrityHash: sha256(pdfBytes)
    }
  });
}

async function main() {
  const pdfBytes = await loadFixturePdf();
  const workspace = await ensureWorkspace();
  const matter = await ensureMatter(workspace.id);
  const exhibit = await createExhibit(workspace.id, matter.id, pdfBytes);

  const specifiedPlaybook = await prisma.playbook.create({
    data: {
      workspaceId: workspace.id,
      name: "Phase 1 Specified Playbook",
      rulesJson: JSON.stringify([
        {
          clause_type: "Liability Cap",
          preferred_position: "Liability capped at 1x fees",
          risk_triggers: ["unlimited", "indemnify"],
          max_risk_score: 90
        }
      ])
    }
  });

  const ingestion = new IngestionPipeline();
  await ingestion.ingestExhibit(workspace.id, exhibit.id);

  const firstChunk = await prisma.documentChunk.findFirst({
    where: { exhibitId: exhibit.id },
    orderBy: { chunkIndex: "asc" }
  });
  if (!firstChunk) {
    throw new Error("No DocumentChunk rows found for positive case.");
  }
  const keywordMatch = String(firstChunk.text || "").match(/[A-Za-z]{6,}/);
  const keyword = keywordMatch ? keywordMatch[0] : "forensic";

  const positivePlaybook = await prisma.playbook.create({
    data: {
      workspaceId: workspace.id,
      name: "Phase 1 Positive Playbook",
      rulesJson: JSON.stringify([
        {
          clause_type: "Content Match",
          preferred_position: `Must include ${keyword}`,
          risk_triggers: [keyword],
          max_risk_score: 10
        }
      ])
    }
  });

  const positive = await assessExhibitAgainstPlaybook({
    workspaceId: workspace.id,
    matterId: matter.id,
    exhibitId: exhibit.id,
    playbookId: positivePlaybook.id,
    maxChunksPerRule: 6
  });

  if (!positive.assessments.length) {
    throw new Error("Positive case failed: no assessments returned.");
  }

  const first = positive.assessments[0];
  if (!first.citation_found || !first.citations?.[0]?.chunkId) {
    throw new Error("Positive case failed: citation missing.");
  }

  const chunk = await prisma.documentChunk.findFirst({ where: { id: first.citations[0].chunkId } });
  if (!chunk) {
    throw new Error("Positive case failed: chunkId not found in DocumentChunk.");
  }

  console.log("Positive case:", {
    citation_found: first.citation_found,
    chunk_id: first.citations[0].chunkId,
    sample_text: chunk.text.slice(0, 120)
  });

  const rules = JSON.parse(specifiedPlaybook.rulesJson || "[]");
  rules.push({
    clause_type: "Martian Mining Rights",
    preferred_position: "No extraterrestrial rights",
    risk_triggers: ["martian", "mining"],
    max_risk_score: 90
  });
  await prisma.playbook.update({
    where: { id: specifiedPlaybook.id },
    data: { rulesJson: JSON.stringify(rules) }
  });

  const negative = await assessExhibitAgainstPlaybook({
    workspaceId: workspace.id,
    matterId: matter.id,
    exhibitId: exhibit.id,
    playbookId: specifiedPlaybook.id,
    maxChunksPerRule: 6
  });

  const fakeAssessments = negative.assessments.filter((a) => a.clauseType === "Martian Mining Rights");
  if (negative.missingCitations === 0 || fakeAssessments.length > 0) {
    throw new Error("Negative case failed: unexpected citations for fake clause.");
  }

  console.log("Negative case:", {
    missingCitations: negative.missingCitations,
    fakeAssessments: fakeAssessments.length
  });
}

main()
  .then(() => {
    console.log("Phase 1 validation complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Phase 1 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
