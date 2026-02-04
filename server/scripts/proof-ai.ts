import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { ensureSigningKeys } from "../test/helpers/signingKeys.js";
import { storageService } from "../storageService.js";

type ProofCaseResult = {
  name: string;
  ok: boolean;
  errorCode?: string;
  auditEventId?: string | null;
  timingMs: number;
  timestamp: string;
  details?: Record<string, unknown>;
};

type ProofReport = {
  startedAt: string;
  finishedAt?: string;
  cases: ProofCaseResult[];
};

const report: ProofReport = {
  startedAt: new Date().toISOString(),
  cases: []
};

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

async function createUserWorkspace(role: "member" | "admin", tag: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `proof-${tag}-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Proof ${tag} ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

async function createMatter(workspaceId: string, tag: string) {
  return prisma.matter.create({
    data: {
      workspaceId,
      slug: `proof-${tag}-${Date.now()}`,
      name: `Proof ${tag} Matter`
    }
  });
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
  ensureSigningKeys();

  for (const [key, value] of Object.entries(envOverrides)) {
    process.env[key] = value;
  }

  const { app } = await import(`../index.ts?proof=${Date.now()}`);
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

async function startOllamaMock(mode: "normal" | "timeout", getAnchorId: () => string) {
  const server = http.createServer((req, res) => {
    if (!req.url?.includes("/api/generate")) {
      res.statusCode = 200;
      res.end("{}");
      return;
    }
    if (mode === "timeout") {
      return;
    }
    const anchorId = getAnchorId();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      response: JSON.stringify({
        summary: "Anchored summary",
        claims: [{ text: "Anchor proof", anchorIds: [anchorId] }]
      })
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

async function runCase(name: string, fn: () => Promise<ProofCaseResult>) {
  const started = Date.now();
  try {
    const result = await fn();
    result.timingMs = Date.now() - started;
    report.cases.push(result);
  } catch (err: any) {
    report.cases.push({
      name,
      ok: false,
      errorCode: "HARNESS_ERROR",
      auditEventId: null,
      timingMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      details: { message: err?.message || String(err) }
    });
  }
}

async function main() {
  const nowTag = `${Date.now()}`;
  let anchorId = "";

  const ollama = await startOllamaMock("normal", () => anchorId);
  const backend = await startBackend({
    OLLAMA_URL: `http://127.0.0.1:${ollama.port}`,
    AI_REQUEST_TIMEOUT_MS: "1000"
  });

  const { user, workspace } = await createUserWorkspace("member", "main");
  const matterAnchored = await createMatter(workspace.id, "anchored");
  const matterUnanchored = await createMatter(workspace.id, "unanchored");

  const pdfBuffer = await createPdfBuffer("Anchor proof");
  const storageKey = `workspace-${workspace.id}/proof-${nowTag}.pdf`;
  await storageService.upload(storageKey, pdfBuffer);

  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matterAnchored.id,
      filename: "proof.pdf",
      mimeType: "application/pdf",
      storageKey,
      integrityHash: "hash-proof"
    }
  });
  const anchor = await prisma.anchor.create({
    data: {
      exhibitId: exhibit.id,
      pageNumber: 1,
      lineNumber: 1,
      text: "Anchor proof",
      bboxJson: JSON.stringify([0, 0, 1000, 1000])
    }
  });
  anchorId = anchor.id;

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
  const csrfToken = "proof-csrf";

  await runCase("anchored-pass", async () => {
    const startedAt = Date.now();
    const res = await fetch(`http://127.0.0.1:${backend.port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "anchored request",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matterAnchored.id
      })
    });
    const json = await res.json().catch(() => ({}));
    const auditEvent = await prisma.auditEvent.findFirst({
      where: { workspaceId: workspace.id, eventType: "AI_CHAT_RELEASED" },
      orderBy: { createdAt: "desc" }
    });

    return {
      name: "anchored-pass",
      ok: res.status === 200 && json?.ok === true && Array.isArray(json.findings),
      errorCode: res.status === 200 ? undefined : json?.errorCode,
      auditEventId: auditEvent?.id || null,
      timingMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    };
  });

  await runCase("unanchored-withheld", async () => {
    const startedAt = Date.now();
    const res = await fetch(`http://127.0.0.1:${backend.port}/api/ai/chat`, {
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
    const json = await res.json().catch(() => ({}));
    const auditEvent = json?.auditEventId
      ? await prisma.auditEvent.findUnique({ where: { id: json.auditEventId } })
      : null;

    const ok = res.status === 422 && json?.ok === false && json?.errorCode === "WITHHELD" && json?.auditEventId;

    return {
      name: "unanchored-withheld",
      ok,
      errorCode: json?.errorCode,
      auditEventId: json?.auditEventId || null,
      timingMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      details: {
        auditEventType: auditEvent?.eventType || null
      }
    };
  });

  await new Promise<void>((resolve) => backend.server.close(() => resolve()));
  await new Promise<void>((resolve) => ollama.server.close(() => resolve()));

  const timeoutOllama = await startOllamaMock("timeout", () => anchorId);
  const timeoutBackend = await startBackend({
    OLLAMA_URL: `http://127.0.0.1:${timeoutOllama.port}`,
    AI_REQUEST_TIMEOUT_MS: "250"
  });

  const timeoutMatter = await createMatter(workspace.id, "timeout");

  await runCase("timeout-handled", async () => {
    const startedAt = Date.now();
    const res = await fetch(`http://127.0.0.1:${timeoutBackend.port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "timeout request",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: timeoutMatter.id
      })
    });
    const json = await res.json().catch(() => ({}));

    const ok = res.status === 504 && json?.ok === false && json?.errorCode === "AI_TIMEOUT" && json?.auditEventId;

    return {
      name: "timeout-handled",
      ok,
      errorCode: json?.errorCode,
      auditEventId: json?.auditEventId || null,
      timingMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    };
  });

  await new Promise<void>((resolve) => timeoutBackend.server.close(() => resolve()));
  await new Promise<void>((resolve) => timeoutOllama.server.close(() => resolve()));

  await prisma.anchor.delete({ where: { id: anchor.id } });
  await prisma.exhibit.delete({ where: { id: exhibit.id } });
  await prisma.matter.delete({ where: { id: matterAnchored.id } });
  await prisma.matter.delete({ where: { id: matterUnanchored.id } });
  await prisma.matter.delete({ where: { id: timeoutMatter.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.user.delete({ where: { id: user.id } });

  try { await storageService.delete(storageKey); } catch { /* ignore */ }

  report.finishedAt = new Date().toISOString();
  const outDir = path.resolve("reports", "proof");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `ai-proof-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`AI proof report written: ${outPath}`);
}

main().catch((err) => {
  console.error("AI proof harness failed:", err?.message || String(err));
  process.exit(1);
});
