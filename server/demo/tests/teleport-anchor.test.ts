import test from "node:test";
import assert from "node:assert/strict";
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

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

async function createUserWorkspace(role: "member" | "admin") {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `teleport-test-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Teleport Test ${suffix}` } });
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
  process.env.STORAGE_ENCRYPTION_REQUIRED = "false";
  process.env.DEMO_EXHIBIT_PATHS = [
    path.resolve(process.cwd(), "..", "docs", "demo_set", "Anchor_Agreement.pdf"),
    path.resolve(process.cwd(), "..", "docs", "demo_set", "Email_Thread.pdf"),
    path.resolve(process.cwd(), "..", "docs", "demo_set", "Financial_Statement.pdf"),
    path.resolve(process.cwd(), "..", "docs", "demo_set", "Contradictory_Memo.pdf")
  ].join(",");
}

test("teleport anchors include bbox after demo seed", { skip: !dbAvailable }, async () => {
  setTestEnv();
  const { user, workspace } = await createUserWorkspace("admin");
  const { app } = await import(`../index.ts?teleportseed=${Date.now()}`);

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "teleport-csrf-token";

    const seedRes = await fetch(`http://127.0.0.1:${port}/api/demo/seed`, {
      method: "POST",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id,
        "x-approval-token": "approve-123"
      }
    });
    const seedBody = await seedRes.text();
    assert.ok(seedRes.ok, `seed failed ${seedRes.status}: ${seedBody}`);

    const exhibitsRes = await fetch(`http://127.0.0.1:${port}/api/workspaces/${workspace.id}/exhibits`, {
      method: "GET",
      headers: {
        Cookie: makeCookie(token, csrfToken),
        "x-workspace-id": workspace.id
      }
    });
    assert.ok(exhibitsRes.ok);
    const exhibits = await exhibitsRes.json().catch(() => []);
    assert.ok(Array.isArray(exhibits));
    assert.ok(exhibits.length > 0);

    const exhibitId = String(exhibits[0].id || "");
    assert.ok(exhibitId);

    const anchorsRes = await fetch(
      `http://127.0.0.1:${port}/api/workspaces/${workspace.id}/exhibits/${exhibitId}/anchors`,
      {
        method: "GET",
        headers: {
          Cookie: makeCookie(token, csrfToken),
          "x-workspace-id": workspace.id
        }
      }
    );
    assert.ok(anchorsRes.ok);
    const anchors = await anchorsRes.json().catch(() => []);
    assert.ok(Array.isArray(anchors));
    const withBBox = anchors.find((anchor: any) => {
      const raw = anchor?.bboxJson ?? anchor?.bbox;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) && parsed.length === 4;
        } catch {
          return false;
        }
      }
      return Array.isArray(raw) && raw.length === 4;
    });
    assert.ok(withBBox, "Expected at least one anchor with bbox for teleport");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try { await prisma.workspace.delete({ where: { id: workspace.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { /* immutable audit log */ }
    restoreEnv();
  }
});
