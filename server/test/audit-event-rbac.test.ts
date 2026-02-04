import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
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

function makeCookie(token: string) {
  return `forensic_token=${encodeURIComponent(token)}`;
}

async function createUserWorkspace(role: "member" | "admin", suffix: string) {
  const user = await prisma.user.create({
    data: { email: `audit-rbac-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Audit RBAC ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("audit event access blocked for non-admin in other workspace", { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  ensureSigningKeys();

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { user: userA, workspace: workspaceA } = await createUserWorkspace("admin", `${suffix}-a`);
  const { user: userB, workspace: workspaceB } = await createUserWorkspace("member", `${suffix}-b`);

  const prevHash = crypto.randomBytes(32).toString("hex");
  const hash = crypto.randomBytes(32).toString("hex");
  const auditEvent = await prisma.auditEvent.create({
    data: {
      workspaceId: workspaceA.id,
      actorId: userA.id,
      eventType: "AI_RELEASE_GATE_BLOCKED",
      payloadJson: JSON.stringify({ withheldReasons: ["NO_ANCHOR_NO_OUTPUT"] }),
      prevHash,
      hash
    }
  });

  const { app } = await import(`../index.ts?auditrbac=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: userB.id }, process.env.JWT_SECRET as string);

    const res = await fetch(`http://127.0.0.1:${port}/api/audit/events/${auditEvent.id}`, {
      headers: {
        Cookie: makeCookie(token),
        "x-workspace-id": workspaceB.id
      }
    });

    assert.equal(res.status, 403);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try { await prisma.workspace.delete({ where: { id: workspaceA.id } }); } catch { /* immutable audit log */ }
    try { await prisma.workspace.delete({ where: { id: workspaceB.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: userA.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: userB.id } }); } catch { /* immutable audit log */ }
    restoreEnv();
  }
});
