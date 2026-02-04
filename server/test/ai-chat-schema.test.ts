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
    data: { email: `schema-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Schema ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("invalid AI schema is withheld", { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.ALLOW_ENV_API_FALLBACK = "false";
  process.env.GEMINI_API_KEY = "";
  ensureSigningKeys();

  let citeId = "";
  const llmServer = http.createServer((req, res) => {
    if (req.url?.includes("/api/generate")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ response: `{not-json <cite>${citeId}</cite>` }));
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
      slug: `schema-${Date.now()}`,
      name: "Schema Matter"
    }
  });
  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: "schema.pdf",
      mimeType: "application/pdf",
      storageKey: `schema-${Date.now()}.pdf`,
      integrityHash: "hash-schema"
    }
  });
  const anchor = await prisma.anchor.create({
    data: {
      exhibitId: exhibit.id,
      pageNumber: 1,
      lineNumber: 1,
      text: "Schema anchor",
      bboxJson: JSON.stringify([10, 10, 20, 20])
    }
  });
  citeId = anchor.id;

  const { app } = await import(`../index.ts?schema=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "schema-csrf";

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "schema test",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const json = await res.json().catch(() => ({}));

    assert.equal(res.status, 422);
    assert.equal(json.ok, false);
    assert.equal(json.errorCode, "WITHHELD");
    assert.ok(Array.isArray(json.withheldReasons));
    assert.ok(json.withheldReasons.includes("INVALID_SCHEMA"));
    assert.ok(json.auditEventId);
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
