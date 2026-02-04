import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

type MagicCheckResult = { ok: true } | { ok: false; reason: string };

const MAGIC_SIGNATURES: Array<{
  mime: string;
  label: string;
  match: (buf: Buffer) => boolean;
}> = [
  {
    mime: "application/pdf",
    label: "PDF",
    match: (buf) => buf.slice(0, 5).toString("utf-8") === "%PDF-"
  },
  {
    mime: "image/png",
    label: "PNG",
    match: (buf) => buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mime: "image/jpeg",
    label: "JPEG",
    match: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  },
  {
    mime: "image/gif",
    label: "GIF",
    match: (buf) => {
      const header = buf.slice(0, 6).toString("ascii");
      return header === "GIF87a" || header === "GIF89a";
    }
  },
  {
    mime: "video/mp4",
    label: "MP4",
    match: (buf) => buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp"
  },
  {
    mime: "video/quicktime",
    label: "QuickTime",
    match: (buf) => buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp"
  },
  {
    mime: "audio/wav",
    label: "WAV",
    match: (buf) => buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WAVE"
  },
  {
    mime: "audio/x-wav",
    label: "WAV",
    match: (buf) => buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WAVE"
  },
  {
    mime: "audio/mpeg",
    label: "MP3",
    match: (buf) => buf.slice(0, 3).toString("ascii") === "ID3" || (buf.length > 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "DOCX",
    match: (buf) => buf.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  }
];

const TEXT_MIME_PREFIX = "text/";

export function validateFileMagic(buffer: Buffer, mimeType: string, filename?: string): MagicCheckResult {
  const mime = String(mimeType || "").toLowerCase();
  if (!buffer || !buffer.length) {
    return { ok: false, reason: "Empty file buffer" };
  }

  if (mime.startsWith(TEXT_MIME_PREFIX)) {
    const slice = buffer.slice(0, 512);
    const hasNull = slice.some((byte) => byte === 0x00);
    return hasNull ? { ok: false, reason: "Text mime contains binary nulls" } : { ok: true };
  }

  const signature = MAGIC_SIGNATURES.find((entry) => entry.mime === mime);
  if (!signature) {
    return { ok: true };
  }

  if (!signature.match(buffer)) {
    return {
      ok: false,
      reason: `Magic mismatch for ${signature.label} (${mime})${filename ? ` in ${filename}` : ""}`
    };
  }
  return { ok: true };
}

export async function scanBufferForMalware(buffer: Buffer, opts?: { filename?: string }) {
  const command = String(process.env.CLAMAV_CMD || "clamscan").trim();
  const enabled = command.length > 0;
  if (!enabled) {
    return { ok: false, status: "SCANNER_DISABLED", engine: null };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexipro-scan-"));
  const safeName = opts?.filename ? opts.filename.replace(/[^a-zA-Z0-9._-]+/g, "_") : "upload.bin";
  const tmpPath = path.join(tmpDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  fs.writeFileSync(tmpPath, buffer);

  const runScan = () => new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, ["--no-summary", tmpPath], { timeout: 60000 }, (err, stdout, stderr) => {
      if (err && (err as any).code === "ENOENT") {
        return reject(err);
      }
      const code = typeof (err as any)?.code === "number" ? (err as any).code : 0;
      resolve({ code, stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });

  try {
    const result = await runScan();
    const clean = result.code === 0;
    const infected = result.code === 1;
    if (infected) {
      return { ok: false, status: "INFECTED", engine: command, detail: result.stdout || result.stderr };
    }
    if (!clean) {
      return { ok: false, status: "SCAN_ERROR", engine: command, detail: result.stdout || result.stderr };
    }
    return { ok: true, status: "CLEAN", engine: command };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  }
}
