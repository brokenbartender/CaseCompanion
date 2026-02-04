import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const prisma = new PrismaClient();

async function extractText(filePath: string) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const chunks: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => String(item.str || "").trim())
      .filter(Boolean)
      .join(" ");
    if (pageText) chunks.push(pageText);
  }

  return chunks.join("\n");
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function ensureAnalysisResultTable() {
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
  await prisma.$executeRawUnsafe(`ALTER TABLE "AnalysisResult" ADD COLUMN IF NOT EXISTS summary TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AnalysisResult" ADD COLUMN IF NOT EXISTS content TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AnalysisResult" ADD COLUMN IF NOT EXISTS category TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AnalysisResult" ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "AnalysisResult" ADD COLUMN IF NOT EXISTS details_json JSONB`);
}

async function main() {
  console.log("INITIATING DEEP DIVE: INTENT VS. EXECUTION...");

  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to run live analysis.");
  }
  const modelName = process.env.GEMINI_MODEL || "models/gemini-2.5-flash";

  const docPath = path.join(process.cwd(), "docs", "demo_set");
  const emailFile = path.join(docPath, "Email_Thread.pdf");
  const contractFile = path.join(docPath, "Anchor_Agreement.pdf");

  if (!fs.existsSync(emailFile) || !fs.existsSync(contractFile)) {
    throw new Error("Missing evidence files. Run generate_demo_set.mjs first.");
  }

  console.log("Reading physical evidence files...");
  const emailText = await extractText(emailFile);
  const contractText = await extractText(contractFile);
  console.log(`Read ${emailText.length} chars of email and ${contractText.length} chars of contract.`);

  console.log("Analyzing for Scrivener's Errors (this may take 10-20 seconds)...");
  const client = new GoogleGenAI({ apiKey });
  const prompt = `
You are a Senior Legal Forensic Auditor.

TASK:
Compare the NEGOTIATION (Email Thread) against the EXECUTED CONTRACT (Anchor Agreement).
Identify any specific terms agreed to in the email that were OMITTED or ALTERED in the final contract.

SOURCE A (Negotiation Emails):
${emailText}

SOURCE B (Final Contract):
${contractText}

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Short headline of the discrepancy",
  "summary": "One sentence explaining what was agreed vs what was signed",
  "email_agreement": "Exact quote or summary of the term agreed in email (include date if possible)",
  "contract_clause": "The specific clause in the contract that fails to reflect this (or 'Missing')",
  "impact": "Why this matters legally (e.g. 'Unintended financial exposure')"
}
  `.trim();

  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const analysis = extractJson(String(response.text || ""));
  console.log("DETECTED DISCREPANCY:", analysis.title || "Untitled");

  await ensureAnalysisResultTable();
  const summary = String(analysis.summary || "");
  const content = `AGREED IN EMAIL: ${analysis.email_agreement || ""}\n\nEXECUTED IN CONTRACT: ${analysis.contract_clause || "Missing"}`;
  const details = String(analysis.impact || summary || analysis.title || "Intent mismatch");

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "AnalysisResult"
      (title, summary, content, finding_type, severity, financial_impact, details, category, confidence, details_json)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    `,
    String(analysis.title || "Intent Mismatch"),
    summary,
    content,
    "intent_mismatch",
    "HIGH",
    "",
    details,
    "contract_integrity",
    0.95,
    JSON.stringify({
      source_a: "Email_Thread.pdf",
      source_b: "Anchor_Agreement.pdf",
      impact: analysis.impact || ""
    })
  );

  console.log("FINDING SAVED. Ready for PDF generation.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
