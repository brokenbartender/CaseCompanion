import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";

export async function saveAiSummaryWorkProduct(args: {
  workspaceId: string;
  matterId: string;
  userId: string;
  summary: string;
  title?: string | null;
  auditEventId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const summary = String(args.summary || "").trim();
  if (!summary) return null;

  const pdfBytes = await renderSummaryPdf(summary, args.title || "AI Summary");
  const sha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const safeMatter = String(args.matterId || "matter").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const requestId = args.requestId ? String(args.requestId).slice(0, 32) : "";
  const storageKey = `work-products/${args.workspaceId}/${safeMatter}/ai-summary-${Date.now()}${requestId ? `-${requestId}` : ""}.pdf`;

  await storageService.upload(storageKey, Buffer.from(pdfBytes));

  const workProduct = await prisma.workProduct.create({
    data: {
      workspaceId: args.workspaceId,
      matterId: args.matterId,
      auditEventId: args.auditEventId || null,
      title: args.title || "AI Summary",
      type: "AI_SUMMARY",
      format: "PDF",
      storageKey,
      sha256,
      metadataJson: JSON.stringify({
        requestId: args.requestId || null,
        ...(args.metadata || {})
      })
    }
  });

  return workProduct;
}

async function renderSummaryPdf(summary: string, title: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [612, 792];
  const margin = 54;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawLine = (text: string, size = 11) => {
    if (y < margin + size) {
      page = pdf.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    page.drawText(text, { x: margin, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  page.drawText(title, { x: margin, y, size: 18, font: titleFont, color: rgb(0, 0, 0) });
  y -= 24;
  drawLine(`Generated: ${new Date().toISOString()}`, 10);
  y -= 8;

  const wrapped = wrapText(summary, 504, font, 11);
  for (const line of wrapped) {
    drawLine(line, 11);
  }

  return pdf.save();
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number) {
  const words = String(text || "").split(/\s+/g);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
