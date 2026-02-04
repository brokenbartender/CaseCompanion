import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
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

async function createUserWorkspace(role: "member" | "admin") {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `approval-test-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Approval Test ${suffix}` } });
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
  process.env.GENESIS_SEED = "test-genesis";
  process.env.AUTH_COOKIE_NAME = "forensic_token";
  process.env.CSRF_COOKIE_NAME = "forensic_csrf";
  process.env.DEMO_MODE = "true";
  process.env.ISOLATED_ENV = "true";
  process.env.DEMO_SEED_ENABLED = "true";
  process.env.DEMO_APPROVAL_BYPASS = "false";
  process.env.APPROVAL_REQUIRED = "true";
  process.env.APPROVAL_TOKEN = "approve-123";
  ensureSigningKeys();
}

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

test("demo endpoints require approval token even in demo mode", { skip: !dbAvailable }, async () => {
  setTestEnv();
  const { user, workspace } = await createUserWorkspace("admin");
  const { app } = await import(`../index.ts?demoapproval=${Date.now()}`);

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "csrf-token";

    const res = await fetch(`http://127.0.0.1:${port}/api/demo/seed`, {
      method: "POST",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      }
    });
    const json = await res.json().catch(() => ({}));

    assert.equal(res.status, 403);
    assert.equal(json?.error, "Approval token required");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
    restoreEnv();
  }
});

test("demo mode refuses to start without ISOLATED_ENV", () => {
  const env = {
    ...process.env,
    NODE_ENV: "test",
    DISABLE_AUTOSTART: "true",
    JWT_SECRET: "test-secret",
    GENESIS_SEED: "test-genesis",
    DEMO_MODE: "true",
    ISOLATED_ENV: "false",
    APPROVAL_REQUIRED: "true",
    APPROVAL_TOKEN: "approve-123"
  };

  const indexPath = path.resolve(process.cwd(), "index.ts").replace(/\\/g, "/");
  const result = spawnSync(
    process.execPath,
    [
      "--loader",
      "ts-node/esm",
      "-e",
      `import("${indexPath}").then(() => process.exit(0)).catch(() => process.exit(1));`
    ],
    { env, cwd: path.resolve(process.cwd()), encoding: "utf-8" }
  );

  assert.notEqual(result.status, 0);
});
