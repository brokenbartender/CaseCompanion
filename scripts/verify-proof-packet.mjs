import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { packet: "", golden: "", record: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!opts.packet && !arg.startsWith("--")) {
      opts.packet = arg;
      continue;
    }
    if (arg === "--golden") {
      opts.golden = args[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--record") {
      opts.record = true;
    }
  }
  return opts;
}

function resolveGoldenPaths(goldenArg) {
  const base = goldenArg || path.resolve("proof", "golden", "proof_packet.pdf");
  const shaPath = base.endsWith(".sha256")
    ? base
    : `${base}.sha256`;
  const pdfPath = base.endsWith(".pdf")
    ? base
    : base.replace(/\.sha256$/, "");
  return { pdfPath, shaPath };
}

function extractZip(zipPath) {
  const admPath = path.resolve("server", "node_modules", "adm-zip");
  if (!fs.existsSync(admPath)) {
    throw new Error("adm-zip not found; run npm ci --prefix server");
  }
  const AdmZip = require(admPath);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexipro-proof-"));
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tmpDir, true);
  return tmpDir;
}

function findPdf(packetDir) {
  const files = walk(packetDir).filter((file) => file.toLowerCase().endsWith(".pdf"));
  if (!files.length) return null;
  const preferred = files.find((file) => /admissibility|proof/i.test(path.basename(file)));
  return preferred || files[0];
}

function runProofVerifier(packetDir) {
  const verifier = path.resolve("tools", "verify-proof-packet.js");
  const result = spawnSync(process.execPath, [verifier, packetDir], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("Proof packet signature/hash verification failed.");
  }
}

function runPdfRead(pdfPath) {
  const reader = path.resolve("read_pdf.py");
  const result = spawnSync("python", [reader, pdfPath], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("PDF parse failed (read_pdf.py).");
  }
}

function main() {
  const opts = parseArgs();
  if (!opts.packet) {
    console.warn("WARNING: No Proof Packet found to verify. Run a demo flow first to generate one.");
    console.warn("Usage: node scripts/verify-proof-packet.mjs <packet-zip-or-dir> [--golden <path>] [--record]");
    process.exit(1);
  }

  const inputPath = path.resolve(opts.packet);
  if (!fs.existsSync(inputPath)) {
    console.warn(`WARNING: No Proof Packet found to verify at ${inputPath}. Run a demo flow first to generate one.`);
    process.exit(1);
  }

  const extracted = !fs.statSync(inputPath).isDirectory();
  const packetDir = extracted ? extractZip(inputPath) : inputPath;

  try {
    runProofVerifier(packetDir);

    const pdfPath = findPdf(packetDir);
    if (!pdfPath) {
      console.error("FAIL: No PDF found inside proof packet.");
      process.exit(1);
    }

    runPdfRead(pdfPath);

    const { pdfPath: goldenPdf, shaPath } = resolveGoldenPaths(opts.golden);
    const pdfHash = sha256File(pdfPath);

    if (opts.record) {
      fs.mkdirSync(path.dirname(goldenPdf), { recursive: true });
      fs.copyFileSync(pdfPath, goldenPdf);
      fs.writeFileSync(shaPath, `${pdfHash}\n`);
      console.log(`Recorded golden master: ${goldenPdf}`);
      return;
    }

    if (!fs.existsSync(shaPath)) {
      console.warn(`WARNING: Golden hash missing: ${shaPath}`);
      console.warn("Run with --record to capture the golden master from a known-good export.");
      process.exit(1);
    }

    const expected = fs.readFileSync(shaPath, "utf-8").trim();
    if (expected !== pdfHash) {
      console.error("FAIL: PDF checksum mismatch.");
      console.error(`Expected: ${expected}`);
      console.error(`Actual:   ${pdfHash}`);
      process.exit(1);
    }

    console.log("PASS: Proof packet verified and PDF matches golden master.");
  } finally {
    if (extracted) {
      try {
        fs.rmSync(packetDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}

main();
