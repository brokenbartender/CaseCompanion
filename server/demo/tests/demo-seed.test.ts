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
    process.env[key] = value;
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
    data: { email: `seed-test-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Seed Test ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  ensureSigningKeys();
  process.env.GENESIS_SEED = "test-genesis";
  process.env.DEMO_MODE = "true";
  process.env.ISOLATED_ENV = "true";
  process.env.DEMO_SEED_ENABLED = "true";
  process.env.APPROVAL_REQUIRED = "true";
  process.env.APPROVAL_TOKEN = "approve-123";
}

function setProdEnv() {
  process.env.NODE_ENV = "production";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "prod-strong-secret-123456";
  ensureSigningKeys();
  process.env.GENESIS_SEED = "prod-genesis-seed-123456";
  process.env.JWT_ISSUER = "https://issuer.lexipro.local";
  process.env.JWT_AUDIENCE = "lexipro";
  process.env.CORS_ORIGINS = "https://lexipro.example";
  process.env.DEMO_MODE = "true";
  process.env.ISOLATED_ENV = "true";
  process.env.ALLOW_DEMO_IN_PROD = "true";
  process.env.DEMO_SEED_ENABLED = "true";
  process.env.DEMO_SEED_PROD_OK = "false";
  process.env.APPROVAL_TOKEN = "prod-approval-123456";
  process.env.ALLOW_LEGACY_JWT = "false";
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.RELEASE_CERT_PRIVATE_KEY_B64 = Buffer.from(privatePem).toString("base64");
  process.env.RELEASE_CERT_PUBLIC_KEY_B64 = Buffer.from(publicPem).toString("base64");
}

test("demo seed rejects non-admin users", { skip: !dbAvailable }, async () => {
  setTestEnv();
  const { user, workspace } = await createUserWorkspace("member");
  const { app } = await import(`../index.ts?demoseed=${Date.now()}`);

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "test-csrf-token";

    const res = await fetch(`http://127.0.0.1:${port}/api/demo/seed`, {
      method: "POST",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id,
        "x-approval-token": "approve-123"
      }
    });
    const json = await res.json().catch(() => ({}));

    assert.equal(res.status, 403);
    assert.equal(json?.error, "Insufficient role");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
    restoreEnv();
  }
});

test("demo seed blocks production without explicit prod ok", { skip: !dbAvailable }, async () => {
  setProdEnv();
  const { user, workspace } = await createUserWorkspace("admin");
  const { app } = await import(`../index.ts?demoseedprod=${Date.now()}`);

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }
    );
    const csrfToken = "prod-csrf-token";

    const res = await fetch(`http://127.0.0.1:${port}/api/demo/seed`, {
      method: "POST",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id,
        "x-approval-token": "prod-approval-123456"
      }
    });
    const json = await res.json().catch(() => ({}));

    assert.equal(res.status, 403);
    assert.equal(json?.errorCode, "DEMO_SEED_PROD_LOCKED");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
    restoreEnv();
  }
});
