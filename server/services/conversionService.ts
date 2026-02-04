import AdmZip from "adm-zip";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { evidenceProcessor } from "./evidenceProcessor.js";

type ConversionTarget = "txt" | "pdf" | "docx";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lexipro-convert-"));
}

function cleanup(paths: string[]) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p) && fs.lstatSync(p).isDirectory()) {
        fs.rmdirSync(p, { recursive: true });
      } else if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch {
      // ignore
    }
  }
}

function resolveConverter() {
  const mode = String(process.env.DOC_CONVERT_MODE || "").trim().toLowerCase();
  const bin = String(process.env.DOC_CONVERT_BIN || "").trim();
  if (bin) return { mode: mode || "pandoc", bin };
  return { mode: "pandoc", bin: "pandoc" };
}

async function runPandoc(inputPath: string, outputPath: string) {
  const { bin } = resolveConverter();
  await new Promise<void>((resolve, reject) => {
    execFile(bin, [inputPath, "-o", outputPath], { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || "").toString()));
      resolve();
    });
  });
}

async function runSoffice(inputPath: string, outputDir: string, target: ConversionTarget) {
  const { bin } = resolveConverter();
  const convertTo = target === "pdf" ? "pdf" : "docx";
  await new Promise<void>((resolve, reject) => {
    execFile(bin, ["--headless", "--convert-to", convertTo, "--outdir", outputDir, inputPath], { timeout: 180000 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message || "").toString()));
      resolve();
    });
  });
}

function getExtensionFromMime(mimeType: string, filename?: string) {
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".txt")) return ".txt";
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (mimeType.startsWith("text/")) return ".txt";
  return ".bin";
}

function docxToText(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) {
    throw new Error("DOCX missing word/document.xml");
  }
  const xml = entry.getData().toString("utf-8");
  const stripped = xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:tab[^>]*>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return stripped || "";
}

export async function convertBufferToTxt(buffer: Buffer, mimeType: string, filename?: string) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("text/")) return buffer;
  if (mime === "application/pdf") {
    const extracted = await evidenceProcessor.extractTextFromBuffer(buffer, filename || "document.pdf");
    return Buffer.from(extracted.text || "", "utf-8");
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const text = docxToText(buffer);
    return Buffer.from(text, "utf-8");
  }
  throw new Error(`TXT conversion not supported for ${mime}`);
}

export async function convertBufferToPdf(buffer: Buffer, mimeType: string, filename?: string) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "application/pdf") return buffer;
  const tmp = tempDir();
  const inputPath = path.join(tmp, `input${getExtensionFromMime(mime, filename)}`);
  const outputPath = path.join(tmp, "output.pdf");
  fs.writeFileSync(inputPath, buffer);
  const { mode } = resolveConverter();
  try {
    if (mode === "soffice") {
      await runSoffice(inputPath, tmp, "pdf");
      const produced = fs.readdirSync(tmp).find((f) => f.endsWith(".pdf"));
      if (!produced) throw new Error("PDF conversion failed");
      return fs.readFileSync(path.join(tmp, produced));
    }
    await runPandoc(inputPath, outputPath);
    return fs.readFileSync(outputPath);
  } finally {
    cleanup([tmp]);
  }
}

export async function convertBufferToDocx(buffer: Buffer, mimeType: string, filename?: string) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buffer;
  }
  const tmp = tempDir();
  const inputPath = path.join(tmp, `input${getExtensionFromMime(mime, filename)}`);
  const outputPath = path.join(tmp, "output.docx");
  fs.writeFileSync(inputPath, buffer);
  const { mode } = resolveConverter();
  try {
    if (mode === "soffice") {
      await runSoffice(inputPath, tmp, "docx");
      const produced = fs.readdirSync(tmp).find((f) => f.endsWith(".docx"));
      if (!produced) throw new Error("DOCX conversion failed");
      return fs.readFileSync(path.join(tmp, produced));
    }
    await runPandoc(inputPath, outputPath);
    return fs.readFileSync(outputPath);
  } finally {
    cleanup([tmp]);
  }
}
