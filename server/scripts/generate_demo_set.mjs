import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "docs", "demo_set");

const PAGE_W = 612;
const PAGE_H = 792;
const margin = 54;
const contentW = PAGE_W - margin * 2;
const lineHeight = 14;

const wrapText = (text, font, size, maxWidth) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
};

const drawParagraphs = (page, font, size, paragraphs, startY) => {
  let y = startY;
  for (const para of paragraphs) {
    const lines = wrapText(para, font, size, contentW);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.14) });
      y -= lineHeight;
    }
    y -= lineHeight;
  }
  return y;
};

const addHeader = (page, fontBold, title, pageIndex, totalPages) => {
  page.drawText(title, { x: margin, y: PAGE_H - margin + 10, size: 12, font: fontBold, color: rgb(0.05, 0.08, 0.15) });
  page.drawText(`Page ${pageIndex}/${totalPages}`, { x: PAGE_W - margin - 80, y: PAGE_H - margin + 10, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.25) });
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildAgreement = async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = 12;
  const clause = "Section 4.2 (Representations) The Seller represents that no material adverse change has occurred and all disclosures are complete.";
  const section = "Section 7.1 (Conditions) Closing is conditioned on delivery of all schedules, certificates, and tax clearance letters.";
  const signature = "Executed by the parties on January 5, 2024, in Detroit, Michigan.";

  for (let i = 1; i <= totalPages; i += 1) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    addHeader(page, fontBold, "Asset Purchase Agreement (Excerpt)", i, totalPages);
    const paragraphs = [
      `Article ${i}. Definitions and Interpretations.`,
      clause,
      section,
      "Section 9.3 (Notice) All notices shall be in writing and delivered via certified mail or electronic service.",
      signature
    ];
    drawParagraphs(page, font, 10, paragraphs, PAGE_H - margin - 20);
  }

  return doc;
};

const buildEmailThread = async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = 3;
  const emails = [
    [
      "From: Evelyn Brooks <evelyn.brooks@lexipro.local>",
      "To: Marcus Venn <m.venn@lexipro.local>",
      "Date: 01/05/2024 08:12 AM",
      "Subject: Travel confirmation",
      "Message: Detroit itinerary attached. SSN: 123-45-6789. Attachment: Travel_Receipt.pdf"
    ],
    [
      "From: Marcus Venn <m.venn@lexipro.local>",
      "To: Legal Ops <legal.ops@lexipro.local>",
      "Date: 01/28/2024 02:18 PM",
      "Subject: Budget review notes",
      "Message: Budget review completed. See attached slides. Attachment: Budget_Review.pdf"
    ],
    [
      "From: Compliance Desk <compliance@lexipro.local>",
      "To: Tanya Ruiz <t.ruiz@lexipro.local>",
      "Date: 01/31/2024 08:22 AM",
      "Subject: Compliance reminder",
      "Message: Please acknowledge receipt of the compliance notice. Attachment: Compliance_Notice.pdf"
    ]
  ];

  for (let i = 1; i <= totalPages; i += 1) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    addHeader(page, fontBold, "Email Thread Export", i, totalPages);
    const body = emails[i - 1] || [];
    drawParagraphs(page, font, 10, body, PAGE_H - margin - 20);
  }

  return doc;
};

const buildFinancialStatement = async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  addHeader(page, fontBold, "Invoice Statement", 1, 1);
  const paragraphs = [
    "Invoice #: INV-2024-0057",
    "Date: 02/02/2024",
    "Amount Due: $247,500.00",
    "Vendor: Horizon Logistics LLC",
    "Payment Terms: Net 30",
    "Note: Total reflects purchase price adjustment."
  ];
  drawParagraphs(page, font, 11, paragraphs, PAGE_H - margin - 40);
  return doc;
};

const buildContradictoryMemo = async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = 2;
  const memo = [
    "Witness Statement - Evelyn Brooks",
    "I was not in Detroit on January 5, 2024. I was working remotely and did not travel.",
    "I did not receive any travel confirmation or itinerary that day.",
    "Signed: Evelyn Brooks"
  ];
  const counter = [
    "Supplemental Memo - Travel Confirmation",
    "Receipt data indicates Detroit travel on January 5, 2024 with electronic confirmation sent at 08:12 AM.",
    "Attachment: Travel_Receipt.pdf",
    "Prepared by: Legal Ops"
  ];

  for (let i = 1; i <= totalPages; i += 1) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    addHeader(page, fontBold, "Contradictory Evidence Memo", i, totalPages);
    const body = i === 1 ? memo : counter;
    drawParagraphs(page, font, 11, body, PAGE_H - margin - 20);
  }
  return doc;
};

const writePdf = async (doc, filename) => {
  const bytes = await doc.save();
  fs.writeFileSync(path.join(outputDir, filename), bytes);
};

const run = async () => {
  ensureDir(outputDir);
  await writePdf(await buildAgreement(), "Anchor_Agreement.pdf");
  await writePdf(await buildEmailThread(), "Email_Thread.pdf");
  await writePdf(await buildFinancialStatement(), "Financial_Statement.pdf");
  await writePdf(await buildContradictoryMemo(), "Contradictory_Memo.pdf");
  console.log("Demo set generated in", outputDir);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
