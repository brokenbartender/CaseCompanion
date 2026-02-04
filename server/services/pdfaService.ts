import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

function resolveGhostscriptBin() {
  const explicit = String(process.env.PDF_A_BIN || process.env.GS_BIN || "").trim();
  return explicit || "gs";
}

export async function convertToPdfA(buffer: Buffer, opts?: { sourceLabel?: string }) {
  const bin = resolveGhostscriptBin();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexipro-pdfa-"));
  const inputPath = path.join(tmpDir, "input.pdf");
  const outputPath = path.join(tmpDir, "output.pdf");
  fs.writeFileSync(inputPath, buffer);

  const args = [
    "-dPDFA=1",
    "-dBATCH",
    "-dNOPAUSE",
    "-dNOOUTERSAVE",
    "-sProcessColorModel=DeviceRGB",
    "-sDEVICE=pdfwrite",
    "-dPDFACompatibilityPolicy=1",
    "-sOutputFile=" + outputPath,
    inputPath
  ];

  const exec = () => new Promise<void>((resolve, reject) => {
    execFile(bin, args, { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) {
        const message = (stderr || "").toString() || err.message;
        const detail = opts?.sourceLabel ? `${opts.sourceLabel}: ${message}` : message;
        return reject(new Error(`PDF/A conversion failed: ${detail}`));
      }
      resolve();
    });
  });

  try {
    await exec();
    const out = fs.readFileSync(outputPath);
    return out;
  } finally {
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  }
}
