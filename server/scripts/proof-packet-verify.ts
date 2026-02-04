import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function normalizeLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function main() {
  const packetDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!packetDir) {
    console.error("Usage: tsx scripts/proof-packet-verify.ts <packet-dir>");
    process.exit(1);
  }

  const manifestPath = path.join(packetDir, "manifest.json");
  const hashesPath = path.join(packetDir, "hashes.txt");
  const signaturePath = path.join(packetDir, "signature.ed25519");
  const publicKeyPath = path.join(packetDir, "public_key.pem");

  if (!fs.existsSync(manifestPath) || !fs.existsSync(hashesPath) || !fs.existsSync(signaturePath) || !fs.existsSync(publicKeyPath)) {
    console.error("Missing required signature files in packet.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const filteredFiles = Array.isArray(manifest.files)
    ? manifest.files.filter((entry: any) => !["hashes.txt", "signature.ed25519", "public_key.pem"].includes(String(entry?.path || "")))
    : [];
  const manifestCore = JSON.stringify({ ...manifest, files: filteredFiles }, null, 2);

  const hashLines = normalizeLines(fs.readFileSync(hashesPath, "utf-8"));
  const filteredHashLines = hashLines.filter((line) => {
    const parts = line.split(/\s+/);
    const rel = parts.slice(1).join(" ");
    return !["manifest.json", "signature.ed25519", "public_key.pem"].includes(rel);
  });
  const hashesCore = `${filteredHashLines.join("\n")}\n`;

  const signingInput = Buffer.from(`${manifestCore}\n---\n${hashesCore}`, "utf-8");
  const signature = Buffer.from(fs.readFileSync(signaturePath, "utf-8").trim(), "base64");
  const publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath, "utf-8"));

  const ok = crypto.verify(null, signingInput, publicKey, signature);
  if (!ok) {
    console.error("Signature verification failed.");
    process.exit(1);
  }
  console.log(`Proof packet signature OK: ${packetDir}`);
}

main();
