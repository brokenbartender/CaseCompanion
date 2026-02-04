import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type ManifestEntry = {
  path: string;
  sha256: string;
  size: number;
  createdAt: string;
};

type Manifest = {
  files: ManifestEntry[];
};

const REQUIRED_FILES = [
  "manifest.json",
  "hashes.txt",
  "run_report.json",
  "audit_excerpt.json",
  "audit_withheld_excerpt.json",
  "claim_proofs.json",
  "CODE_HANDOVER_MANIFEST.md",
  "EXECUTIVE_SUMMARY.md",
  "environment_snapshot.json",
  "self_check.json",
  "test_results.json",
  "verification.md",
  path.join("artifacts", "outputs", "ai_response.json"),
  path.join("artifacts", "outputs", "withheld_response.json"),
  path.join("artifacts", "outputs", "integrity_verify.json")
];

function sha256File(filePath: string) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function normalizeLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function main() {
  const packetDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!packetDir) {
    console.error("Usage: tsx scripts/proof-packet-check.ts <packet-dir>");
    process.exit(1);
  }
  if (!fs.existsSync(packetDir)) {
    console.error(`Packet directory not found: ${packetDir}`);
    process.exit(1);
  }

  const missing = REQUIRED_FILES.filter((rel) => !fs.existsSync(path.join(packetDir, rel)));
  if (missing.length) {
    console.error(`Missing required files: ${missing.join(", ")}`);
    process.exit(1);
  }

  const manifestPath = path.join(packetDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Manifest;
  if (!Array.isArray(manifest.files)) {
    console.error("manifest.json missing files array.");
    process.exit(1);
  }

  const hashLines = normalizeLines(fs.readFileSync(path.join(packetDir, "hashes.txt"), "utf-8"));
  const hashMap = new Map<string, string>();
  for (const line of hashLines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const hash = parts[0];
    const relPath = parts.slice(1).join(" ");
    hashMap.set(relPath, hash);
  }

  const manifestHash = sha256File(path.join(packetDir, "manifest.json"));
  const manifestHashLine = hashMap.get("manifest.json");
  if (!manifestHashLine || manifestHashLine !== manifestHash) {
    console.error("manifest.json hash missing or mismatched in hashes.txt");
    process.exit(1);
  }

  for (const entry of manifest.files) {
    const filePath = path.join(packetDir, entry.path);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file from manifest: ${entry.path}`);
      process.exit(1);
    }
    const stat = fs.statSync(filePath);
    const sha = sha256File(filePath);
    if (sha !== entry.sha256) {
      console.error(`SHA mismatch for ${entry.path}`);
      process.exit(1);
    }
    if (stat.size !== entry.size) {
      console.error(`Size mismatch for ${entry.path}`);
      process.exit(1);
    }
    const hashLine = hashMap.get(entry.path);
    if (!hashLine || hashLine !== entry.sha256) {
      console.error(`hashes.txt mismatch for ${entry.path}`);
      process.exit(1);
    }
  }

  console.log(`Proof packet self-check OK: ${packetDir}`);
}

main();
