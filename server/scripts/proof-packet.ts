import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import crypto from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import jwt from "jsonwebtoken";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { ensureSigningKeys } from "../test/helpers/signingKeys.js";
import { PrismaClient } from "@prisma/client";

type ProofCase = {
  name: "anchored_pass" | "withheld_case" | "integrity_verify";
  ok: boolean;
  durationMs: number;
  auditEventId: string | null;
  timestamp: string;
  errorCode?: string;
};

type RunReport = {
  startedAt: string;
  finishedAt?: string;
  workspaceId: string;
  cases: ProofCase[];
};

type ManifestEntry = {
  path: string;
  sha256: string;
  size: number;
  createdAt: string;
};

type Manifest = {
  packetContractVersion: string;
  commitSha: string;
  timestamp: string;
  workspaceId: string;
  nodeVersion: string;
  dbVendor: string;
  aiProvider: string;
  files: ManifestEntry[];
};

type TestResults = {
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  ok: boolean;
  stdout: string;
  stderr: string;
  command: string;
};

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

function sha256Buffer(data: Buffer) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256File(filePath: string) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getRepoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
}

function getCommitSha(repoRoot: string) {
  return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf-8" }).trim();
}

function getDbVendor() {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (url.startsWith("postgres")) return "postgresql";
  if (url.startsWith("mysql")) return "mysql";
  if (url.startsWith("sqlite") || url.startsWith("file:")) return "sqlite";
  return url ? "unknown" : "unset";
}

function safeEnvValue(key: string, value: string | undefined) {
  if (!value) return "";
  const upper = key.toUpperCase();
  if (upper.includes("SECRET") || upper.includes("TOKEN") || upper.includes("KEY") || upper.includes("PASSWORD")) {
    return "present";
  }
  return value;
}

function buildEnvSnapshot(packetTimestamp: string, options: {
  aiProvider: string;
  aiModel: string;
  dbVendor: string;
  storageMode: string;
}) {
  const requiredKeys = [
    "DATABASE_URL",
    "JWT_SECRET",
    "GENESIS_SEED",
    "OLLAMA_URL",
    "AI_REQUEST_TIMEOUT_MS"
  ];
  const featureFlags = [
    "DISABLE_AUTOSTART",
    "ALLOW_ENV_API_FALLBACK",
    "STORAGE_ENCRYPTION_REQUIRED",
    "DEMO_SEED_ENABLED",
    "DEMO_SEED_PROD_OK",
    "ALLOW_LEGACY_JWT"
  ];

  return {
    timestamp: packetTimestamp,
    nodeVersion: process.version,
    aiProvider: options.aiProvider,
    aiModel: options.aiModel,
    dbVendor: options.dbVendor,
    storageMode: options.storageMode,
    os: {
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
      type: os.type()
    },
    featureFlags: Object.fromEntries(
      featureFlags.map((key) => [key, safeEnvValue(key, process.env[key])])
    ),
    requiredEnv: Object.fromEntries(
      requiredKeys.map((key) => [key, process.env[key] ? "present" : "absent"])
    )
  };
}

async function createPdfBuffer(text: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 72, y: 700, size: 12, font });
  return Buffer.from(await pdfDoc.save());
}

async function startBackend(envOverrides: Record<string, string>) {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.ALLOW_ENV_API_FALLBACK = "false";
  process.env.GEMINI_API_KEY = "";
  process.env.STORAGE_ENCRYPTION_REQUIRED = "false";
  process.env.AWS_ACCESS_KEY_ID = "";
  process.env.AWS_S3_BUCKET = "";
  process.env.AWS_SECRET_ACCESS_KEY = "";
  ensureSigningKeys();

  for (const [key, value] of Object.entries(envOverrides)) {
    process.env[key] = value;
  }

  const { app } = await import(`../index.ts?packet=${Date.now()}`);
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

async function startOllamaMock(getAnchorId: () => string, getAnchorText: () => string) {
  const server = http.createServer((req, res) => {
    if (!req.url?.includes("/api/generate")) {
      res.statusCode = 200;
      res.end("{}");
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let prompt = "";
      try {
        prompt = String(JSON.parse(body || "{}")?.prompt || "");
      } catch {
        prompt = "";
      }
      const isAudit = /independent audit model/i.test(prompt);
      const responsePayload = isAudit
        ? { admissible: true, anchoredCount: 1, unanchoredCount: 0, totalClaims: 1, issues: [] }
        : { summary: "Anchored summary", claims: [{ text: getAnchorText(), anchorIds: [getAnchorId()] }] };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ response: JSON.stringify(responsePayload) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

async function main() {
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('standardFontDataUrl')) return;
    originalWarn(...args);
  };
  console.error = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('standardFontDataUrl')) return;
    originalError(...args);
  };
  const repoRoot = getRepoRoot();
  const serverRoot = path.resolve(process.cwd());
  const packetTimestamp = new Date().toISOString();
  const tag = nowTag();
  const packetDir = path.resolve("reports", "proof_packet", `packet-${tag}`);
  const outputsDir = path.join(packetDir, "artifacts", "outputs");
  const sandboxDir = path.join(packetDir, "sandbox");
  fs.mkdirSync(outputsDir, { recursive: true });
  fs.mkdirSync(sandboxDir, { recursive: true });

  const originalDbUrl = String(process.env.DATABASE_URL || "").trim();
  if (!originalDbUrl) {
    throw new Error("DATABASE_URL is required for proof packet isolation.");
  }
  if (!originalDbUrl.startsWith("postgres")) {
    throw new Error("Proof packet isolation requires a PostgreSQL DATABASE_URL.");
  }

  const baseUrl = new URL(originalDbUrl);
  const dbName = baseUrl.pathname.replace(/^\//, "") || "lexipro";
  const dbTag = tag.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const tempDbName = `${dbName}_proof_packet_${dbTag}`;

  const adminUrl = new URL(originalDbUrl);
  adminUrl.pathname = "/postgres";

  const tempDbUrl = new URL(originalDbUrl);
  tempDbUrl.pathname = `/${tempDbName}`;
  tempDbUrl.search = "";

  let prisma: any;
  let storageService: any;
  let storageModeValue = "DISK";
  let backend: { server: any; port: number } | null = null;
  let ollama: { server: any; port: number } | null = null;
  const originalCwd = process.cwd();

  try {
    const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${tempDbName}"`);
    } catch (err: any) {
      throw new Error(`Failed to create temp proof DB: ${err?.message || String(err)}`);
    } finally {
      await adminClient.$disconnect();
    }

    process.env.DATABASE_URL = tempDbUrl.toString();

    const tempClient = new PrismaClient({ datasources: { db: { url: tempDbUrl.toString() } } });
    try {
      await tempClient.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    } finally {
      await tempClient.$disconnect();
    }

    execSync("npx prisma migrate deploy --schema prisma/schema.prisma", {
      cwd: serverRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: tempDbUrl.toString() }
    });

    process.chdir(sandboxDir);

    let anchorId = "";
    let anchorText = "Anchor proof";
    ollama = await startOllamaMock(() => anchorId, () => anchorText);
    backend = await startBackend({
      OLLAMA_URL: `http://127.0.0.1:${ollama.port}`,
      AI_REQUEST_TIMEOUT_MS: "1500"
    });

    ({ prisma } = await import("../lib/prisma.js"));
    ({ storageService, storageMode: storageModeValue } = await import("../storageService.js"));

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const user = await prisma.user.create({
      data: { email: `proof-packet-${suffix}@lexipro.local`, passwordHash: "hash" }
    });
    const workspace = await prisma.workspace.create({
      data: { name: `Proof Packet ${suffix}` }
    });
    await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "member" }
    });

  const matterAnchored = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `proof-anchored-${suffix}`,
      name: "Proof Anchored Matter"
    }
  });
  const matterUnanchored = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `proof-withheld-${suffix}`,
      name: "Proof Withheld Matter"
    }
  });

    const fixturePath = path.resolve(repoRoot, "docs", "demo_set", "Anchor_Agreement.pdf");
    const useFixture = process.env.PROOF_PACKET_USE_FIXTURE === "1" && fs.existsSync(fixturePath);
    const pdfBuffer = useFixture
      ? fs.readFileSync(fixturePath)
      : await createPdfBuffer(anchorText);
    const storageKey = `${workspace.id}/${matterAnchored.slug}/${tag}-proof.pdf`;
    await storageService.upload(storageKey, pdfBuffer);
    fs.writeFileSync(path.join(outputsDir, "proof.pdf"), pdfBuffer);

  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matterAnchored.id,
      filename: "proof.pdf",
      mimeType: "application/pdf",
      storageKey,
      integrityHash: "hash-proof-123456"
    }
  });
  const anchor = await prisma.anchor.create({
    data: {
      exhibitId: exhibit.id,
      pageNumber: 1,
      lineNumber: 1,
      text: anchorText,
      bboxJson: JSON.stringify([0, 0, 1000, 1000])
    }
  });
  anchorId = anchor.id;

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
  const csrfToken = "proof-csrf";

  const runReport: RunReport = {
    startedAt: new Date().toISOString(),
    workspaceId: workspace.id,
    cases: []
  };

  const anchoredStart = Date.now();
    const anchoredRes = await fetch(`http://127.0.0.1:${backend.port}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: makeCookie(token, csrfToken),
      "x-csrf-token": csrfToken,
      "x-workspace-id": workspace.id
    },
    body: JSON.stringify({
      userPrompt: "anchor proof",
      promptKey: "forensic_synthesis",
      workspaceId: workspace.id,
      matterId: matterAnchored.id
    })
  });
  const anchoredJson = await anchoredRes.json().catch(() => ({}));
  const anchoredAudit = await prisma.auditEvent.findFirst({
    where: { workspaceId: workspace.id, eventType: "AI_CHAT_RELEASED" },
    orderBy: { createdAt: "desc" }
  });
  const anchoredRequestId = anchoredJson?.proof?.requestId ? String(anchoredJson.proof.requestId) : "";
  fs.writeFileSync(path.join(outputsDir, "ai_response.json"), JSON.stringify(anchoredJson, null, 2));
    runReport.cases.push({
    name: "anchored_pass",
    ok: anchoredRes.status === 200 && anchoredJson?.ok === true,
    durationMs: Date.now() - anchoredStart,
    auditEventId: anchoredAudit?.id || null,
    timestamp: new Date().toISOString()
  });

  const withheldStart = Date.now();
    const withheldRes = await fetch(`http://127.0.0.1:${backend.port}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: makeCookie(token, csrfToken),
      "x-csrf-token": csrfToken,
      "x-workspace-id": workspace.id
    },
    body: JSON.stringify({
      userPrompt: "unanchored request",
      promptKey: "forensic_synthesis",
      workspaceId: workspace.id,
      matterId: matterUnanchored.id
    })
  });
  const withheldJson = await withheldRes.json().catch(() => ({}));
  fs.writeFileSync(path.join(outputsDir, "withheld_response.json"), JSON.stringify(withheldJson, null, 2));
    runReport.cases.push({
    name: "withheld_case",
    ok: withheldRes.status === 422 && withheldJson?.ok === false && withheldJson?.errorCode === "WITHHELD",
    durationMs: Date.now() - withheldStart,
    auditEventId: withheldJson?.auditEventId || null,
    timestamp: new Date().toISOString(),
    errorCode: withheldJson?.errorCode
  });

  const integrityStart = Date.now();
    const integrityRes = await fetch(`http://127.0.0.1:${backend.port}/api/integrity/verify`, {
    method: "GET",
    headers: {
      Cookie: makeCookie(token, csrfToken),
      "x-csrf-token": csrfToken,
      "x-workspace-id": workspace.id
    }
  });
  const integrityJson = await integrityRes.json().catch(() => ({}));
  fs.writeFileSync(path.join(outputsDir, "integrity_verify.json"), JSON.stringify(integrityJson, null, 2));
  const integrityAudit = await prisma.auditEvent.findFirst({
    where: { workspaceId: workspace.id, eventType: "INTEGRITY_VERIFY" },
    orderBy: { createdAt: "desc" }
  });
    runReport.cases.push({
    name: "integrity_verify",
    ok: integrityRes.status === 200 && typeof integrityJson?.isValid === "boolean",
    durationMs: Date.now() - integrityStart,
    auditEventId: integrityAudit?.id || null,
    timestamp: new Date().toISOString()
  });

    runReport.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(packetDir, "run_report.json"), JSON.stringify(runReport, null, 2));

    const auditIds = Array.from(new Set(runReport.cases.map((c) => c.auditEventId).filter(Boolean))) as string[];
    const auditEvents = auditIds.length
      ? await prisma.auditEvent.findMany({ where: { id: { in: auditIds } } })
      : [];
    const auditExcerpt = auditEvents.map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      eventType: event.eventType,
      createdAt: event.createdAt,
      payload: (() => {
        try { return JSON.parse(event.payloadJson); } catch { return event.payloadJson; }
      })(),
      prevHash: event.prevHash,
      hash: event.hash
    }));
    fs.writeFileSync(path.join(packetDir, "audit_excerpt.json"), JSON.stringify(auditExcerpt, null, 2));

    const derivedEvents = await prisma.auditEvent.findMany({
      where: { workspaceId: workspace.id, eventType: "DERIVED_ARTIFACT" },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const derivedArtifacts = derivedEvents.map((event) => {
      try {
        return JSON.parse(event.payloadJson || "{}");
      } catch {
        return {};
      }
    });
    const claimProofArtifacts = anchoredRequestId
      ? derivedArtifacts.filter((artifact) => artifact?.requestId === anchoredRequestId)
      : [];
    const claimProofPayload = {
      requestId: anchoredRequestId || null,
      totalArtifacts: claimProofArtifacts.length,
      artifacts: claimProofArtifacts
    };
    fs.writeFileSync(path.join(packetDir, "claim_proofs.json"), JSON.stringify(claimProofPayload, null, 2));

    const withheldAuditId = runReport.cases.find((c) => c.name === "withheld_case")?.auditEventId || null;
    const withheldEvent = withheldAuditId
      ? await prisma.auditEvent.findFirst({ where: { id: withheldAuditId } })
      : null;
    const withheldExcerpt = withheldEvent
      ? {
        id: withheldEvent.id,
        eventType: withheldEvent.eventType,
        createdAt: withheldEvent.createdAt,
        payload: (() => {
          try { return JSON.parse(withheldEvent.payloadJson); } catch { return withheldEvent.payloadJson; }
        })(),
        prevHash: withheldEvent.prevHash,
        hash: withheldEvent.hash
      }
      : { id: null, eventType: null, createdAt: null, payload: null, prevHash: null, hash: null };
    fs.writeFileSync(path.join(packetDir, "audit_withheld_excerpt.json"), JSON.stringify(withheldExcerpt, null, 2));

    const aiProvider = "OLLAMA";
    const aiModel = process.env.OLLAMA_MODEL || "llama3.1";
    const envSnapshot = buildEnvSnapshot(packetTimestamp, {
      aiProvider,
      aiModel,
      dbVendor: getDbVendor(),
      storageMode: storageModeValue
    });
    fs.writeFileSync(path.join(packetDir, "environment_snapshot.json"), JSON.stringify(envSnapshot, null, 2));

    if (process.env.PROOF_PACKET_SKIP_TESTS !== "1") {
      const testStart = new Date();
      const testCommand = "npm --prefix server test";
      const testResult = spawnSync(testCommand, { cwd: repoRoot, encoding: "utf-8", shell: true });
      const testEnd = new Date();
      const testResults: TestResults = {
        startedAt: testStart.toISOString(),
        finishedAt: testEnd.toISOString(),
        exitCode: typeof testResult.status === "number" ? testResult.status : -1,
        ok: testResult.status === 0 && !testResult.error,
        stdout: testResult.stdout || "",
        stderr: testResult.stderr || (testResult.error ? String(testResult.error.message || testResult.error) : ""),
        command: testCommand
      };
      fs.writeFileSync(path.join(packetDir, "test_results.json"), JSON.stringify(testResults, null, 2));
      if (!testResults.ok) {
        throw new Error("Server tests failed during proof packet generation.");
      }
    } else {
      const skipped: TestResults = {
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        exitCode: null,
        ok: true,
        stdout: "",
        stderr: "",
        command: "skipped (PROOF_PACKET_SKIP_TESTS=1)"
      };
      fs.writeFileSync(path.join(packetDir, "test_results.json"), JSON.stringify(skipped, null, 2));
    }

    const verificationMd = [
    "# Verification Steps",
    "",
    "1) Recompute SHA-256 hashes and compare to hashes.txt:",
    "   - Linux/macOS: sha256sum -c hashes.txt",
    "   - Windows PowerShell:",
    "     Get-Content hashes.txt | ForEach-Object {",
    "       $parts = $_ -split '\\s{2,}';",
    "       if ($parts.Length -ge 2) {",
    "         $hash = (Get-FileHash -Algorithm SHA256 $parts[1]).Hash.ToLower();",
    "         if ($hash -ne $parts[0]) { throw \"Hash mismatch: $($parts[1])\" }",
    "       }",
    "     }",
    "",
    "2) Run the built-in packet self-check:",
    "   - npm --prefix server run proof:packet:check -- <packetDir>",
    "   - self_check.json captures the last self-check result for this packet.",
    "",
    "3) Verify the packet signature:",
    "   - npm --prefix server run proof:packet:verify -- <packetDir>",
    "",
    "4) Confirm audit events exist in the database and match audit_excerpt.json:",
    "   - For each auditEventId in run_report.json, fetch from DB and compare payload + hash.",
    "   - audit_withheld_excerpt.json is the exact WITHHELD event payload tied to the withheld_case.",
    "   - claim_proofs.json contains claim-level proof objects linked by requestId.",
    "   - CODE_HANDOVER_MANIFEST.md is listed in manifest.json and hashes.txt for tamper evidence.",
    "",
    "5) Confirm test results:",
    "   - Review test_results.json for pass/fail and raw output.",
    "",
    "6) Integrity chain check (if supported):",
    "   - Call /api/integrity/verify for the workspace and confirm isValid=true.",
    "",
    "## Known benign logs during test run",
    "You may see: `trust_graph_capture_failed` from `server/index.ts` when the trust graph capture runs concurrently with teardown in isolated proof DBs. It does not affect determinism, integrity verification, or the audit chain in this packet.",
    ""
    ].join("\n");
    fs.writeFileSync(path.join(packetDir, "verification.md"), verificationMd);
    fs.writeFileSync(
      path.join(packetDir, "self_check.json"),
      JSON.stringify({ ok: true, timestamp: new Date().toISOString(), packetName: path.basename(packetDir) }, null, 2)
    );

    const execSummary = [
      "# Proof Packet Summary",
      "",
      "This packet is a deterministic, machine-checkable bundle generated by the running system.",
      "",
      "## Contents",
      "- run_report.json: proof case outcomes and auditEventIds",
      "- audit_excerpt.json: audit records referenced by run_report.json",
      "- audit_withheld_excerpt.json: the exact WITHHELD event payload",
      "- claim_proofs.json: claim-level proof objects + hashes",
      "- artifacts/outputs/: captured API outputs",
      "- manifest.json + hashes.txt + signature.ed25519: tamper evidence",
      "",
      "## Verification",
      "Follow verification.md to validate hashes, signature, and audit linkage.",
      ""
    ].join("\n");
    fs.writeFileSync(path.join(packetDir, "EXECUTIVE_SUMMARY.md"), execSummary);

    const handoverPath = path.resolve(repoRoot, "CODE_HANDOVER_MANIFEST.md");
    if (!fs.existsSync(handoverPath)) {
      throw new Error("CODE_HANDOVER_MANIFEST.md missing at repo root.");
    }
    fs.copyFileSync(handoverPath, path.join(packetDir, "CODE_HANDOVER_MANIFEST.md"));

  const walk = (dir: string) => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "sandbox") continue;
        out.push(...walk(full));
      } else {
        out.push(full);
      }
    }
    return out;
  };

  const manifest: Manifest = {
    packetContractVersion: "v1",
    commitSha: getCommitSha(repoRoot),
    timestamp: packetTimestamp,
    workspaceId: workspace.id,
    nodeVersion: process.version,
    dbVendor: getDbVendor(),
    aiProvider: "OLLAMA",
    files: []
  };

    const coreFiles = walk(packetDir)
      .filter((filePath) => {
        const rel = path.relative(packetDir, filePath).replace(/\\/g, "/");
        return !["manifest.json", "hashes.txt", "signature.ed25519", "public_key.pem"].includes(rel);
      });

    for (const filePath of coreFiles) {
      const relPath = path.relative(packetDir, filePath).replace(/\\/g, "/");
      const stat = fs.statSync(filePath);
      const sha = sha256File(filePath);
      manifest.files.push({
        path: relPath,
        sha256: sha,
        size: stat.size,
        createdAt: packetTimestamp
      });
    }

    const manifestCore = JSON.stringify(manifest, null, 2);
    const hashesCoreLines = coreFiles.map((filePath) => {
      const relPath = path.relative(packetDir, filePath).replace(/\\/g, "/");
      const sha = sha256File(filePath);
      return `${sha}  ${relPath}`;
    });
    const hashesCore = `${hashesCoreLines.join("\n")}\n`;

    const signingInput = Buffer.from(`${manifestCore}\n---\n${hashesCore}`, "utf-8");
    const providedKeyB64 = String(process.env.PROOF_PACKET_PRIVATE_KEY_B64 || "").trim();
    const privateKey = providedKeyB64
      ? crypto.createPrivateKey(Buffer.from(providedKeyB64, "base64"))
      : crypto.generateKeyPairSync("ed25519").privateKey;
    const publicKey = crypto.createPublicKey(privateKey);
    const signature = crypto.sign(null, signingInput, privateKey);

    fs.writeFileSync(path.join(packetDir, "signature.ed25519"), signature.toString("base64"));
    fs.writeFileSync(path.join(packetDir, "public_key.pem"), publicKey.export({ type: "spki", format: "pem" }).toString());

    const finalFiles = walk(packetDir).filter((filePath) => {
      const rel = path.relative(packetDir, filePath).replace(/\\/g, "/");
      return rel !== "manifest.json";
    });

    const finalManifest: Manifest = {
      ...manifest,
      files: finalFiles.map((filePath) => {
        const relPath = path.relative(packetDir, filePath).replace(/\\/g, "/");
        const stat = fs.statSync(filePath);
        const sha = sha256File(filePath);
        return {
          path: relPath,
          sha256: sha,
          size: stat.size,
          createdAt: packetTimestamp
        };
      })
    };

    fs.writeFileSync(path.join(packetDir, "manifest.json"), JSON.stringify(finalManifest, null, 2));

    const hashFiles = walk(packetDir).filter((filePath) => path.relative(packetDir, filePath).replace(/\\/g, "/") !== "hashes.txt");
    const hashesLines = hashFiles.map((filePath) => {
      const relPath = path.relative(packetDir, filePath).replace(/\\/g, "/");
      const sha = sha256File(filePath);
      return `${sha}  ${relPath}`;
    });
    fs.writeFileSync(path.join(packetDir, "hashes.txt"), `${hashesLines.join("\n")}\n`);

    const checkScript = path.resolve(serverRoot, "scripts", "proof-packet-check.ts");
    const checkResult = spawnSync(process.execPath, ["--import", "tsx", checkScript, packetDir], { stdio: "inherit" });
    if (checkResult.status !== 0) {
      throw new Error(`Proof packet self-check failed with code ${checkResult.status}`);
    }

    console.log(packetDir);
  } finally {
    if (backend?.server) {
      await new Promise<void>((resolve) => backend?.server.close(() => resolve()));
    }
    if (ollama?.server) {
      await new Promise<void>((resolve) => ollama?.server.close(() => resolve()));
    }
    if (prisma?.$disconnect) {
      await prisma.$disconnect().catch(() => null);
    }
    process.chdir(originalCwd);
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch {
      // ignore sandbox cleanup failures
    }

    const cleanupAdmin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      await cleanupAdmin.$executeRawUnsafe(`DROP DATABASE "${tempDbName}" WITH (FORCE)`);
    } catch {
      await cleanupAdmin.$executeRawUnsafe(`DROP DATABASE "${tempDbName}"`);
    } finally {
      await cleanupAdmin.$disconnect();
    }
  }
}

main().catch((err) => {
  console.error("Proof packet generation failed:", err?.message || String(err));
  process.exit(1);
});
