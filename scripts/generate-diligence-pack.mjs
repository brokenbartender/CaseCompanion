import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admPath = path.resolve("server", "node_modules", "adm-zip");
const AdmZip = require(admPath);

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getRepoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
}

function findProofPacketPath(output) {
  const lines = String(output || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const match = lines.find((line) => line.includes("proof_packet") && fs.existsSync(line));
  return match || "";
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const skipProof = args.has("--skip-proof");
  const skipTests = args.has("--skip-tests");
  const withProofTests = args.has("--with-proof-tests");
  const skipShredder = args.has("--skip-shredder");
  const stagedTests = !skipTests;
  const dryRun = args.has("--dry-run");

  const repoRoot = getRepoRoot();
  const tag = nowTag();
  const outputDir = path.resolve("reports", "diligence_pack", `pack-${tag}`);
  fs.mkdirSync(outputDir, { recursive: true });

  let proofPacketDir = "";
  if (!skipProof && !dryRun) {
    const env = { ...process.env };
    if (skipTests || !withProofTests) {
      env.PROOF_PACKET_SKIP_TESTS = "1";
    }
    const cmd = "npm --prefix server run proof:packet";
    const output = execSync(cmd, { cwd: repoRoot, env, encoding: "utf-8" });
    proofPacketDir = findProofPacketPath(output);
    if (!proofPacketDir) {
      throw new Error("Failed to locate proof packet output path.");
    }
  }

  let shredderReportPath = "";
  if (!skipShredder && !dryRun) {
    const cmd = "npm --prefix server run shredder:report";
    const output = execSync(cmd, { cwd: repoRoot, encoding: "utf-8" });
    const lines = String(output || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    shredderReportPath = lines.find((line) => line.endsWith(".json") && line.includes("key_shredder_report")) || "";
  }

  const testResults = [];
  if (stagedTests && !dryRun) {
    const testEnv = {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: "1"
    };
    const stages = [
      {
        name: "api-endpoints",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/api-endpoints.test.ts"
      },
      {
        name: "security-and-prefs",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/workspacePrefs.test.ts test/csrf.test.ts test/health.test.ts test/webhook-security.test.ts"
      },
      {
        name: "bates-concurrency",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/bates-concurrency.test.ts"
      },
      {
        name: "release-cert",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/release-cert.test.ts"
      },
      {
        name: "proof-packet",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/proof-packet.test.ts"
      },
      {
        name: "teleport",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/teleport-utils.test.ts test/teleport-target.test.ts"
      },
      {
        name: "e2e-acquisition",
        cmd: "node --test --test-concurrency=1 --test-timeout=300000 --loader ts-node/esm --import ./test/setup.ts test/e2e-acquisition-flow.test.ts"
      }
    ];
    for (const stage of stages) {
      const startedAt = new Date().toISOString();
      const result = spawnSync(stage.cmd, {
        cwd: path.join(repoRoot, "server"),
        env: testEnv,
        encoding: "utf-8",
        shell: true,
        timeout: 300000
      });
      const ok = result.status === 0 && !result.error;
      testResults.push({
        stage: stage.name,
        ok,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: result.stdout || "",
        stderr: result.stderr || (result.error ? String(result.error.message || result.error) : "")
      });
      if (!ok) {
        fs.writeFileSync(
          path.join(outputDir, "TEST_RESULTS_STAGED.json"),
          JSON.stringify({ stages: testResults }, null, 2)
        );
        throw new Error(`Staged tests failed at ${stage.name}`);
      }
    }
    fs.writeFileSync(
      path.join(outputDir, "TEST_RESULTS_STAGED.json"),
      JSON.stringify({ stages: testResults }, null, 2)
    );
  }

  const packFiles = [
    "LexiPro_Integration_Substrate_Overview.pdf",
    "TECHNICAL_DILIGENCE_MANIFEST.md",
    "CODE_HANDOVER_MANIFEST.md",
    "DILIGENCE_REPORT.md"
  ];
  const optionalFiles = [
    path.join("docs", "diligence", "technical-diligence-manifest.md"),
    path.join("docs", "ARCHITECTURAL_PROVENANCE.md"),
    path.join("docs", "LexiPro_IP_and_Ownership.md"),
    path.join("docs", "LexiPro_Security_and_Trust_Overview.md"),
    path.join("docs", "integration", "INTEGRATION_QUICKSTART.md"),
    path.join("docs", "integration", "LEXIPRO_SUBSTRATE_API.md"),
    path.join("docs", "integration", "examples", "lexipro-enforcement-middleware.ts")
  ];

  const copiedFiles = [];
  if (shredderReportPath && fs.existsSync(shredderReportPath)) {
    const dest = path.join(outputDir, "KeyShredderReport.json");
    fs.copyFileSync(shredderReportPath, dest);
    copiedFiles.push("KeyShredderReport.json");
  }
  for (const rel of packFiles.concat(optionalFiles)) {
    const src = path.resolve(rel);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(outputDir, path.basename(rel));
    fs.copyFileSync(src, dest);
    copiedFiles.push(path.basename(rel));
  }

  if (proofPacketDir) {
    const targetDir = path.join(outputDir, "proof_packet");
    fs.mkdirSync(targetDir, { recursive: true });
    const files = walk(proofPacketDir);
    for (const file of files) {
      const rel = path.relative(proofPacketDir, file);
      const dest = path.join(targetDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
    }
  }

  const indexLines = [
    "# LexiPro Diligence Pack",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Commit: ${execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf-8" }).trim()}`,
    `Proof packet included: ${proofPacketDir ? "yes" : "no"}`,
    "",
    "## Contents",
    ...copiedFiles.map((name) => `- ${name}`),
    proofPacketDir ? "- proof_packet/ (deterministic proof run output)" : "- proof_packet/ skipped",
    ""
  ];
  fs.writeFileSync(path.join(outputDir, "PACKET_INDEX.md"), indexLines.join("\n"));

  if (dryRun) {
    console.log(outputDir);
    return;
  }

  const zip = new AdmZip();
  const files = walk(outputDir);
  for (const file of files) {
    const rel = path.relative(outputDir, file).replace(/\\/g, "/");
    zip.addFile(rel, fs.readFileSync(file));
  }

  const zipPath = path.join(outputDir, `LexiPro_Diligence_Pack_${tag}.zip`);
  zip.writeZip(zipPath);
  const manifest = {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    zipSha256: sha256File(zipPath)
  };
  fs.writeFileSync(path.join(outputDir, "PACKET_MANIFEST.json"), JSON.stringify(manifest, null, 2));
  console.log(outputDir);
}

main();
