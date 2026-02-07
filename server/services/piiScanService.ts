import { prisma } from "../lib/prisma.js";
import { PDFDocument, StandardFonts } from "pdf-lib";

export type PiiFinding = {
  exhibitId: string;
  chunkId: string;
  pageNumber?: number | null;
  pattern: string;
  match: string;
};

const PII_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "DOB", regex: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g },
  { label: "DriverLicense", regex: /\b[A-Z]{1}\d{12}\b/g },
  { label: "Passport", regex: /\b[A-Z]{1}\d{8}\b/g },
  { label: "BankAccount", regex: /\b\d{8,12}\b/g }
];

export function scanTextForPii(text: string) {
  const findings: Array<{ pattern: string; match: string }> = [];
  for (const pattern of PII_PATTERNS) {
    const matches = text.matchAll(pattern.regex);
    for (const match of matches) {
      findings.push({ pattern: pattern.label, match: match[0] });
      if (findings.length >= 50) return findings;
    }
  }
  return findings;
}

export async function scanMatterForPii(workspaceId: string, matterId: string) {
  const chunks = await prisma.documentChunk.findMany({
    where: { workspaceId, matterId },
    select: { id: true, exhibitId: true, pageNumber: true, text: true }
  });
  const findings: PiiFinding[] = [];
  for (const chunk of chunks) {
    if (!chunk.text) continue;
    const matches = scanTextForPii(chunk.text);
    matches.forEach((match) => {
      findings.push({
        exhibitId: chunk.exhibitId,
        chunkId: chunk.id,
        pageNumber: chunk.pageNumber,
        pattern: match.pattern,
        match: match.match
      });
    });
  }
  return findings;
}

export async function generateProtectedPiiList(findings: PiiFinding[]) {
  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    totalFindings: findings.length,
    findings: findings.map((finding) => ({
      exhibitId: finding.exhibitId,
      pageNumber: finding.pageNumber ?? null,
      pattern: finding.pattern,
      match: finding.match
    }))
  };

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let cursorY = 750;
  const lines = [
    "MC 97 - Protected Personal Identifying Information (Generated)",
    `Generated: ${generatedAt}`,
    `Total findings: ${findings.length}`,
    ""
  ];
  lines.forEach((line) => {
    page.drawText(line, { x: 50, y: cursorY, size: 12, font });
    cursorY -= 16;
  });
  findings.slice(0, 20).forEach((finding, index) => {
    const line = `${index + 1}. Exhibit ${finding.exhibitId} p.${finding.pageNumber ?? "?"}: ${finding.pattern} ${finding.match}`;
    page.drawText(line, { x: 50, y: cursorY, size: 10, font });
    cursorY -= 14;
  });
  const pdfBytes = await pdfDoc.save();
  return { json: payload, pdfBytes: Buffer.from(pdfBytes) };
}
