import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { storageService } from "../../storageService.js";
import { logAuditEvent } from "../../audit.js";

const prisma = new PrismaClient();

const demoModeEnabled = ["1", "true", "yes", "on"].includes(String(process.env.DEMO_MODE || "").toLowerCase());
if (!demoModeEnabled) {
  console.error("Demo seed blocked. Set DEMO_MODE=1 to run seed_golden_demo.");
  process.exit(1);
}

const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || "lexis-workspace-01";
const DEMO_MATTER_ID = process.env.DEMO_MATTER_ID || "lexis-matter-01";
const DEMO_WITHHELD_MATTER_ID = process.env.DEMO_WITHHELD_MATTER_ID || "lexis-matter-withheld";
const DEMO_WORKSPACE_NAME = "M&A Green Run";
const DEMO_MATTER_SLUG = "ma-green-run";
const DEMO_WITHHELD_MATTER_SLUG = "ma-green-run-withheld";
const DEMO_TIMESTAMP = process.env.DEMO_FIXED_TIMESTAMP || "2026-01-01T00:00:00.000Z";
const DEMO_ANCHOR_ID = "anchor-green-run-001";
const DEMO_ANCHOR_BBOX = [72, 74, 420, 24];

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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

async function ensureWorkspace() {
  const existing = await prisma.workspace.findUnique({ where: { id: DEMO_WORKSPACE_ID } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: DEMO_WORKSPACE_ID } }).catch(() => null);
  }
  return prisma.workspace.create({ data: { id: DEMO_WORKSPACE_ID, name: DEMO_WORKSPACE_NAME } });
}

async function ensureDemoUser(workspaceId: string) {
  const email = "demo@lexipro.local";
  const password = "LexiPro!234";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({ data: { email, passwordHash } });
  }
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId }
  });
  if (!existingMembership) {
    await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId, role: "owner" }
    });
  }
  return user;
}

async function ensureMatter(workspaceId: string) {
  const existing = await prisma.matter.findUnique({ where: { id: DEMO_MATTER_ID } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      id: DEMO_MATTER_ID,
      workspaceId,
      slug: DEMO_MATTER_SLUG,
      name: "M&A Green Run",
      description: "Deterministic demo matter for enterprise proof."
    }
  });
}

async function ensureWithheldMatter(workspaceId: string) {
  const existing = await prisma.matter.findUnique({ where: { id: DEMO_WITHHELD_MATTER_ID } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      id: DEMO_WITHHELD_MATTER_ID,
      workspaceId,
      slug: DEMO_WITHHELD_MATTER_SLUG,
      name: "M&A Green Run Withheld",
      description: "No-anchor matter used to trigger release gate."
    }
  });
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

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AnalysisResult" (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      finding_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      financial_impact TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM "AnalysisResult"`);

  const workspace = await ensureWorkspace();
  const demoUser = await ensureDemoUser(workspace.id);
  const matter = await ensureMatter(workspace.id);
  const withheldMatter = await ensureWithheldMatter(workspace.id);

  const tmpDir = path.resolve(process.cwd(), "server", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  const createdAt = new Date(DEMO_TIMESTAMP);
  const policePdf = await buildPdfBuffer("Police report: The light was green.");
  const policeFilename = "MA-Green-Run-Police-Report.pdf";
  const policePath = path.join(tmpDir, policeFilename);
  await fs.promises.writeFile(policePath, policePdf);
  const policeStorageKey = `${workspace.id}/${matter.slug}/${policeFilename}`;
  await storageService.upload(policeStorageKey, policePdf);

  const policeExhibit = await prisma.exhibit.create({
    data: {
      id: "exhibit-green-run-police",
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: policeFilename,
      mimeType: "application/pdf",
      storageKey: policeStorageKey,
      integrityHash: sha256(policePdf),
      type: "PDF",
      createdAt
    }
  });

  await logAuditEvent(workspace.id, demoUser.id, "DEMO_SEED_POLICE_REPORT", {
    exhibitId: policeExhibit.id,
    filename: policeExhibit.filename
  });

  const depositionFilename = "MA-Green-Run-CEO-Deposition.mp4";
  const depositionBuffer = await fs.promises.readFile(resolveFixturePath("fixture.mp4"));
  const depositionPath = path.join(tmpDir, depositionFilename);
  await fs.promises.writeFile(depositionPath, depositionBuffer);
  const depositionStorageKey = `${workspace.id}/${matter.slug}/${depositionFilename}`;
  await storageService.upload(depositionStorageKey, depositionBuffer);

  const depositionExhibit = await prisma.exhibit.create({
    data: {
      id: "exhibit-green-run-deposition",
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: depositionFilename,
      mimeType: "video/mp4",
      storageKey: depositionStorageKey,
      integrityHash: sha256(depositionBuffer),
      type: "VIDEO",
      mediaMetadataJson: JSON.stringify({ sha256: sha256(depositionBuffer), sizeBytes: depositionBuffer.length }),
      createdAt
    }
  });

  await logAuditEvent(workspace.id, demoUser.id, "DEMO_SEED_DEPOSITION", {
    exhibitId: depositionExhibit.id,
    filename: depositionExhibit.filename
  });

  const transcriptId = `transcript-${crypto.randomUUID()}`;
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "TranscriptSegment"
      ("id", "exhibitId", "startTime", "endTime", "text", "speaker", "embedding", "createdAt")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    transcriptId,
    depositionExhibit.id,
    0,
    12.5,
    "CEO: We proceeded despite internal warnings about the red light.",
    "CEO",
    "[0,0,0]",
    createdAt
  );

  const webCaptureFilename = "MA-Green-Run-CEO-LinkedIn.png";
  const webCaptureBuffer = await fs.promises.readFile(resolveFixturePath("fixture.png"));
  const webCapturePath = path.join(tmpDir, webCaptureFilename);
  await fs.promises.writeFile(webCapturePath, webCaptureBuffer);
  const webCaptureStorageKey = `${workspace.id}/${matter.slug}/${webCaptureFilename}`;
  await storageService.upload(webCaptureStorageKey, webCaptureBuffer);

  const webCaptureText = "LinkedIn post: I saw the light turn red but told my team to keep driving.";
  const webCaptureMetadata = {
    url: "https://example.com/ceo-post",
    capturedAt: DEMO_TIMESTAMP,
    imageSha256: sha256(webCaptureBuffer),
    textSha256: sha256(webCaptureText),
    textLength: webCaptureText.length,
    imageBytes: webCaptureBuffer.length
  };

  await prisma.$executeRawUnsafe(`ALTER TYPE "ExhibitType" ADD VALUE IF NOT EXISTS 'WEB_CAPTURE'`);

  const webCaptureExhibit = await prisma.exhibit.create({
    data: {
      id: "exhibit-green-run-linkedin",
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: webCaptureFilename,
      mimeType: "image/png",
      storageKey: webCaptureStorageKey,
      integrityHash: sha256(webCaptureBuffer),
      type: "WEB_CAPTURE",
      mediaMetadataJson: JSON.stringify(webCaptureMetadata),
      createdAt
    }
  });

  await logAuditEvent(workspace.id, demoUser.id, "DEMO_SEED_WEB_CAPTURE", {
    exhibitId: webCaptureExhibit.id,
    filename: webCaptureExhibit.filename
  });

  await prisma.anchor.deleteMany({ where: { exhibitId: policeExhibit.id } });
  await prisma.anchor.create({
    data: {
      id: DEMO_ANCHOR_ID,
      exhibitId: policeExhibit.id,
      pageNumber: 1,
      lineNumber: 1,
      text: "Liability cap raised to $50,000,000 for M&A Green Run.",
      bboxJson: JSON.stringify(DEMO_ANCHOR_BBOX)
    }
  });

  const wiretapFilename = "MA-Green-Run-Wiretap.wav";
  const wiretapBuffer = await fs.promises.readFile(resolveFixturePath("fixture.wav"));
  const wiretapPath = path.join(tmpDir, wiretapFilename);
  await fs.promises.writeFile(wiretapPath, wiretapBuffer);
  const wiretapStorageKey = `${workspace.id}/${matter.slug}/${wiretapFilename}`;
  await storageService.upload(wiretapStorageKey, wiretapBuffer);

  const wiretapExhibit = await prisma.exhibit.create({
    data: {
      id: "exhibit-green-run-wiretap",
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: wiretapFilename,
      mimeType: "audio/wav",
      storageKey: wiretapStorageKey,
      integrityHash: sha256(wiretapBuffer),
      type: "AUDIO",
      mediaMetadataJson: JSON.stringify({ sha256: sha256(wiretapBuffer), sizeBytes: wiretapBuffer.length }),
      createdAt
    }
  });

  await logAuditEvent(workspace.id, demoUser.id, "DEMO_SEED_WIRETAP", {
    exhibitId: wiretapExhibit.id,
    filename: wiretapExhibit.filename
  });

  const withheldFilename = "MA-Green-Run-Private-Image.png";
  const withheldBuffer = await fs.promises.readFile(resolveFixturePath("fixture.png"));
  const withheldPath = path.join(tmpDir, withheldFilename);
  await fs.promises.writeFile(withheldPath, withheldBuffer);
  const withheldStorageKey = `${workspace.id}/${withheldMatter.slug}/${withheldFilename}`;
  await storageService.upload(withheldStorageKey, withheldBuffer);

  await prisma.exhibit.create({
    data: {
      id: "exhibit-green-run-withheld",
      workspaceId: workspace.id,
      matterId: withheldMatter.id,
      filename: withheldFilename,
      mimeType: "image/png",
      storageKey: withheldStorageKey,
      integrityHash: sha256(withheldBuffer),
      type: "WEB_CAPTURE",
      mediaMetadataJson: JSON.stringify({
        url: "https://example.com/private-room",
        capturedAt: DEMO_TIMESTAMP,
        imageSha256: sha256(withheldBuffer),
        imageBytes: withheldBuffer.length
      }),
      createdAt
    }
  });

  const playbook = await prisma.playbook.create({
    data: {
      workspaceId: workspace.id,
      name: "Golden Demo Admissibility",
      rulesJson: JSON.stringify([{
        clause_type: "Police report",
        preferred_position: "Source Conflict detected: CEO LinkedIn vs Deposition.",
        risk_triggers: [],
        max_risk_score: 1
      }])
    }
  });

  const clause = await prisma.clause.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      exhibitId: policeExhibit.id,
      clauseType: "SOURCE_CONFLICT",
      text: "Police report contradicts public statement and testimony."
    }
  });

  await prisma.riskAssessment.create({
    data: {
      workspaceId: workspace.id,
      clauseId: clause.id,
      playbookId: playbook.id,
      severity: "CRITICAL",
      redlineSuggestion: `Source Conflict detected: CEO LinkedIn vs Deposition. Evidence includes ${policeFilename} [${policeFilename}, p.1], ${depositionFilename} [${depositionFilename} @ 00:12], and ${webCaptureFilename} [${webCaptureFilename} @ 00:00].`,
      triggerMatchesJson: JSON.stringify(["Source Conflict"])
    }
  });

  const title = "Liability Cap Discrepancy";
  const findingType = "financial_discrepancy";
  const severity = "CRITICAL";
  const financialImpact = "$49.5M Uninsured Exposure";
  const details =
    "Detected contradiction: 2024 Master Agreement lists a $500,000 liability cap, " +
    "while the 2025 Amendment modifies the cap to $50,000,000 in a buried clause.";

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "AnalysisResult"
      (title, finding_type, severity, financial_impact, details, created_at)
    VALUES
      ($1, $2, $3, $4, $5, $6::timestamp)
    `,
    title,
    findingType,
    severity,
    financialImpact,
    details,
    DEMO_TIMESTAMP
  );

  const conflictTitle = "Source Conflict detected: CEO LinkedIn vs Deposition.";
  const conflictType = "SOURCE_CONFLICT";
  const conflictSeverity = "HIGH";
  const conflictImpact = "Witness credibility risk";
  const conflictDetails = "Source Conflict detected: CEO LinkedIn vs Deposition.";

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "AnalysisResult"
      (title, finding_type, severity, financial_impact, details, created_at)
    VALUES
      ($1, $2, $3, $4, $5, $6::timestamp)
    `,
    conflictTitle,
    conflictType,
    conflictSeverity,
    conflictImpact,
    conflictDetails,
    DEMO_TIMESTAMP
  );

  console.log("Golden demo seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Golden demo seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
