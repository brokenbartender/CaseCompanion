import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
    data: { email: `ai-key-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `AI Key ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("workspace AI key persists across server reload", { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.ALLOW_ENV_API_FALLBACK = "false";
  process.env.GEMINI_API_KEY = "";
  process.env.AI_KEY_ENCRYPTION_KEY_B64 = crypto.randomBytes(32).toString("base64");
  ensureSigningKeys();

  const { user, workspace } = await createUserWorkspace("admin");

  const { app } = await import(`../index.ts?aiKey=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "ai-key-csrf";

    const setRes = await fetch(`http://127.0.0.1:${port}/api/ai/key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({ apiKey: "test-api-key-123" })
    });
    assert.equal(setRes.status, 200);

    await new Promise<void>((resolve) => server.close(() => resolve()));

    const { app: appReloaded } = await import(`../index.ts?aiKeyReload=${Date.now()}`);
    const serverReloaded = appReloaded.listen(0);

    try {
      const addressReloaded = serverReloaded.address();
      const portReloaded = typeof addressReloaded === "object" && addressReloaded ? addressReloaded.port : 0;
      const statusRes = await fetch(`http://127.0.0.1:${portReloaded}/api/ai/status`, {
        headers: {
          Cookie: makeCookie(token, csrfToken),
          "x-csrf-token": csrfToken,
          "x-workspace-id": workspace.id
        }
      });
      const json = await statusRes.json().catch(() => ({}));
      assert.equal(statusRes.status, 200);
      assert.equal(json?.preferredProvider, "API");
    } finally {
      await new Promise<void>((resolve) => serverReloaded.close(() => resolve()));
    }
  } finally {
    await prisma.workspaceSecret.deleteMany({
      where: { workspaceId: workspace.id, provider: "GEMINI" }
    });
    try { await prisma.workspace.delete({ where: { id: workspace.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { /* immutable audit log */ }
    restoreEnv();
  }
});
