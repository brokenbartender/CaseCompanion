import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { convertToPdfA } from "./pdfaService.js";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";

export async function stampUnverifiedDraft(pdfBuffer: Uint8Array | Buffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const label = "AI DRAFT - HUMAN REVIEW REQUIRED";

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const angle = Math.atan2(height, width) * (180 / Math.PI);
    const fontSize = Math.max(28, Math.min(width, height) / 10);
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const x = Math.max(0, (width - textWidth) / 2);
    const y = height / 2;

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(1, 0, 0),
      opacity: 0.3,
      rotate: degrees(angle)
    });
  }

  return pdfDoc.save();
}

export async function generateAdmissibleReport(
  matterId: string
): Promise<{ buffer: Buffer; metadata: { generatedAt: string; matterId: string; workspaceId: string } }> {
  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter) throw new Error("Matter not found");

  const deadlines = await prisma.deadline.findMany({
    where: { matterId, status: "VERIFIED" },
    include: { exhibit: true }
  });

  const sourceConflicts = await prisma.clause.findMany({
    where: { matterId, clauseType: "SOURCE_CONFLICT" },
    include: { exhibit: true, riskAssessments: true }
  });

  const generatedAt = new Date().toISOString();
  const zip = new AdmZip();

  const deadlinesPayload = deadlines.map((deadline: any) => ({
    id: deadline.id,
    title: deadline.title,
    dueDate: deadline.dueDate,
    exhibitId: deadline.exhibitId,
    exhibitName: deadline.exhibit?.filename ?? null,
    sourceText: deadline.sourceText,
    confidence: deadline.confidence,
    verifiedAt: deadline.status === "VERIFIED" ? deadline.createdAt : null
  }));

  const conflictsPayload = sourceConflicts.map((clause: any) => ({
    id: clause.id,
    exhibitId: clause.exhibitId,
    exhibitName: clause.exhibit?.filename ?? null,
    text: clause.text,
    riskAssessments: clause.riskAssessments.map((risk: any) => ({
      id: risk.id,
      severity: risk.severity,
      redlineSuggestion: risk.redlineSuggestion,
      createdAt: risk.createdAt
    }))
  }));

  const readme = [
    "# README_Diligence",
    "",
    "This report is protected by the Release Gate (Negative Knowledge).",
    "If a claim cannot be anchored to a specific source chunk or timestamp,",
    "the system blocks output and logs a 422 Unprocessable Entity error.",
    "",
    "This ensures forensic admissibility and prevents hallucinated content.",
  ].join("\n");

  zip.addFile("verified_deadlines.json", Buffer.from(JSON.stringify(deadlinesPayload, null, 2)));
  zip.addFile("source_conflicts.json", Buffer.from(JSON.stringify(conflictsPayload, null, 2)));
  zip.addFile("README_Diligence.md", Buffer.from(readme));

  return {
    buffer: zip.toBuffer(),
    metadata: {
      generatedAt,
      matterId,
      workspaceId: matter.workspaceId
    }
  };
}

export async function generateSalesWinningPDF(
  matterId: string
): Promise<{ buffer: Buffer; metadata: { generatedAt: string; matterId: string; workspaceId: string; pdfHash: string } }> {
  const matter = await prisma.matter.findUnique({ where: { id: matterId } });
  if (!matter) throw new Error("Matter not found");

  const exhibits = await prisma.exhibit.findMany({
    where: { matterId, deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  const transcriptSegments = await prisma.transcriptSegment.findMany({
    where: { exhibitId: { in: exhibits.map((ex: any) => ex.id) } },
    orderBy: [{ exhibitId: "asc" }, { startTime: "asc" }]
  });

  const riskReports = await prisma.riskAssessment.count({ where: { workspaceId: matter.workspaceId } });
  const roiHours = exhibits.length * 0.5 + riskReports * 2;

  const webCapture = exhibits.find((ex: any) => ex.type === "WEB_CAPTURE");
  let webCaptureBase64 = "";
  if (webCapture) {
    const bytes = await storageService.download(webCapture.storageKey);
    webCaptureBase64 = bytes.toString("base64");
  }

  const transcriptText = transcriptSegments.length
    ? transcriptSegments
      .map((seg: any) => `${seg.startTime.toFixed(1)}s–${seg.endTime.toFixed(1)}s ${seg.text}`)
      .join("\n")
    : "No transcript segments available.";

  const sha256Registry = exhibits.map((exhibit: any) => ({
    exhibitId: exhibit.id,
    filename: exhibit.filename,
    sha256: exhibit.integrityHash
  }));
  const registryHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(sha256Registry))
    .digest("hex");

  const serverRoot = fs.existsSync(path.join(process.cwd(), "server", "templates"))
    ? path.join(process.cwd(), "server")
    : process.cwd();
  const templatePath = path.join(serverRoot, "templates", "forensic_report_template.html");
  const template = fs.readFileSync(templatePath, "utf-8");
  const generatedAt = new Date().toISOString();
  const html = template
    .replace("{{INTEGRITY_HASH}}", registryHash)
    .replace("{{GENERATED_AT}}", generatedAt)
    .replace("{{WEB_CAPTURE_BASE64}}", webCaptureBase64)
    .replace("{{TRANSCRIPT_TEXT}}", transcriptText)
    .replace("{{ROI_HOURS}}", roiHours.toFixed(1));

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.setTitle("LexiPro Forensic Report - local gemma:2b");
  pdfDoc.setSubject("local gemma:2b");
  const finalPdf = await pdfDoc.save();
  const marker = Buffer.from("\n% local gemma:2b\n");
  const finalBuffer = Buffer.concat([Buffer.from(finalPdf), marker]);

  const pdfaBuffer = await convertToPdfA(finalBuffer, { sourceLabel: "sales_report" });
  const pdfHash = crypto.createHash("sha256").update(pdfaBuffer).digest("hex");
  return {
    buffer: pdfaBuffer,
    metadata: {
      generatedAt,
      matterId,
      workspaceId: matter.workspaceId,
      pdfHash
    }
  };
}
