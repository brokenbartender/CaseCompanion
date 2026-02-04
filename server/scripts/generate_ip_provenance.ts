import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const cwd = path.resolve(process.cwd());
const root = path.basename(cwd) === "server" ? path.resolve(cwd, "..") : cwd;
const targets = [
  path.join(root, "server", "forensics", "releaseGate.ts"),
  path.join(root, "server", "anchorAlgebra.ts"),
  path.join(root, "server", "services", "VectorStorageService.ts")
];

function sha256(filePath: string) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function main() {
  const missing = targets.filter((file) => !fs.existsSync(file));
  if (missing.length) {
    throw new Error(`Missing files: ${missing.join(", ")}`);
  }

  const digest: Record<string, string> = {};
  for (const file of targets) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    digest[rel] = sha256(file);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    files: digest
  };

  const outPath = path.join(root, "lexipro_ip_digest.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
