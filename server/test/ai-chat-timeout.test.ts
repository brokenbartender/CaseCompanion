import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { ensureSigningKeys } from "./helpers/signingKeys.js";

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value as string;
  }
}

let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

async function createUserWorkspace(role: "member" | "admin") {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `ai-timeout-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `AI Timeout ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("ai chat timeout returns audit-linked response", { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.AI_REQUEST_TIMEOUT_MS = "150";
  process.env.ALLOW_ENV_API_FALLBACK = "false";
  process.env.GEMINI_API_KEY = "";
  ensureSigningKeys();

  const llmServer = http.createServer((req, res) => {
    if (req.url?.includes("/api/generate")) {
      return;
    }
    res.statusCode = 200;
    res.end("{}");
  });
  await new Promise<void>((resolve) => llmServer.listen(0, resolve));
  const llmAddress = llmServer.address();
  const llmPort = typeof llmAddress === "object" && llmAddress ? llmAddress.port : 0;
  process.env.OLLAMA_URL = `http://127.0.0.1:${llmPort}`;

  const { user, workspace } = await createUserWorkspace("member");
  const matter = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `ai-timeout-${Date.now()}`,
      name: "AI Timeout Matter"
    }
  });
  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: "timeout.pdf",
      mimeType: "application/pdf",
      storageKey: `timeout-${Date.now()}.pdf`,
      integrityHash: "hash-timeout"
    }
  });
  const anchor = await prisma.anchor.create({
    data: {
      exhibitId: exhibit.id,
      pageNumber: 1,
      lineNumber: 1,
      text: "Timeout anchor text",
      bboxJson: JSON.stringify([10, 10, 20, 20])
    }
  });

  const { app } = await import(`../index.ts?aitimeout=${Date.now()}`);
  const server = app.listen(0);
  const startedAt = Date.now();

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "timeout-csrf";

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "timeout test",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const elapsedMs = Date.now() - startedAt;
    const json = await res.json().catch(() => ({}));

    assert.equal(res.status, 504);
    assert.equal(json.ok, false);
    assert.equal(json.errorCode, "AI_TIMEOUT");
    assert.ok(json.auditEventId, "expected auditEventId in response");
    assert.ok(elapsedMs < 1000, "timeout response should be fast");

    const audit = await prisma.auditEvent.findUnique({ where: { id: json.auditEventId } });
    assert.ok(audit, "audit event should exist");
    assert.equal(audit?.eventType, "AI_MODEL_CALL_FAILED");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => llmServer.close(() => resolve()));
    await prisma.anchor.delete({ where: { id: anchor.id } });
    await prisma.exhibit.delete({ where: { id: exhibit.id } });
    await prisma.matter.delete({ where: { id: matter.id } });
    try { await prisma.workspace.delete({ where: { id: workspace.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { /* immutable audit log */ }
    restoreEnv();
  }
});
