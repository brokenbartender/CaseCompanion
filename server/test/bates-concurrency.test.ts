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

let prefsAvailable = false;
if (dbAvailable) {
  try {
    await prisma.workspacePreference.findFirst();
    prefsAvailable = true;
  } catch {
    prefsAvailable = false;
  }
}

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

async function createUserWorkspace(role: "member" | "admin") {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `bates-test-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Bates Test ${suffix}` } });
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
}

test("bates reservations are atomic under concurrency", { skip: !dbAvailable || !prefsAvailable }, async () => {
  setTestEnv();
  const { user, workspace } = await createUserWorkspace("admin");
  const { app } = await import(`../index.ts?bates=${Date.now()}`);

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = crypto.randomUUID();

    const makeRequest = () => fetch(`http://127.0.0.1:${port}/api/workspaces/${workspace.id}/prefs`, {
      method: "POST",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key: "batesCounter", pages: 1, startAt: 12001 })
    });

    const responses = await Promise.all(Array.from({ length: 10 }, () => makeRequest()));
    const payloads = await Promise.all(responses.map((res) => res.json()));

    payloads.forEach((payload, idx) => {
      assert.equal(payload?.ok, true, `request ${idx + 1} failed`);
    });

    const starts = payloads.map((payload) => Number(payload?.range?.start));
    const unique = new Set(starts);
    assert.equal(unique.size, 10);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try { await prisma.workspacePreference.deleteMany({ where: { workspaceId: workspace.id } }); } catch { /* table missing in legacy db */ }
    try { await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } }); } catch { /* ignore */ }
    try { await prisma.workspace.delete({ where: { id: workspace.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { /* immutable audit log */ }
    restoreEnv();
  }
});
