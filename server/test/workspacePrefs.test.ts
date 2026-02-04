import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
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

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.ALLOW_SELF_SIGNUP = "true";
  ensureSigningKeys();
}

function getCookieValue(setCookie: string[] | undefined, name: string) {
  if (!setCookie) return null;
  for (const entry of setCookie) {
    const match = entry.match(new RegExp(`${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

let prefsTableAvailable = false;
let foundTables: { schema: string; name: string }[] = [];
if (dbAvailable) {
  try {
    const rows = await prisma.$queryRaw<{ table_schema: string; table_name: string }[]>`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND (
          table_name = 'WorkspacePreference'
          OR table_name = 'workspacepreference'
          OR table_name ILIKE '%workspace%pref%'
        )
    `;
    foundTables = rows.map((row) => ({
      schema: row.table_schema,
      name: row.table_name
    }));
    prefsTableAvailable = foundTables.length > 0;
  } catch {
    prefsTableAvailable = false;
  }
}

if (!dbAvailable || !prefsTableAvailable) {
  console.warn("[test-skip] workspacePrefs atomic test skipped", {
    dbAvailable,
    prefsTableAvailable,
    foundTables
  });
}

test("workspace prefs persist + bates reservation is atomic", { skip: !dbAvailable || !prefsTableAvailable }, async () => {
  setTestEnv();
  const { app } = await import(`../index.ts?workspacePrefs=${Date.now()}`);
  const agent = request.agent(app);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `prefs-test-${suffix}@lexipro.local`;
  const password = "Strong#Pass12345";

  let workspaceId: string | null = null;
  let userId: string | null = null;

  try {
    const registerRes = await agent
      .post("/api/auth/register")
      .send({ email, password })
      .set("Content-Type", "application/json");

    if (registerRes.status !== 200) {
      throw new Error(`Register failed: ${registerRes.status}`);
    }

    const csrfToken = getCookieValue(registerRes.headers["set-cookie"], "forensic_csrf");
    assert.ok(csrfToken, "csrf token cookie missing");

    const meRes = await agent.get("/api/auth/me");
    assert.equal(meRes.status, 200);
    workspaceId = meRes.body?.workspaceId || registerRes.body?.workspaceId || null;
    userId = meRes.body?.userId || null;
    assert.ok(workspaceId, "workspaceId missing from /api/auth/me");
    assert.ok(userId, "userId missing from /api/auth/me");

    const prefRes = await agent
      .post(`/api/workspaces/${workspaceId}/prefs`)
      .set("x-csrf-token", csrfToken as string)
      .send({ key: "lexipro_tour_completed", value: "true" });
    assert.equal(prefRes.status, 200);

    const readRes = await agent.get(`/api/workspaces/${workspaceId}/prefs`);
    assert.equal(readRes.status, 200);
    assert.equal(readRes.body?.prefs?.lexipro_tour_completed, "true");

    const batesRes = await agent
      .post(`/api/workspaces/${workspaceId}/prefs`)
      .set("x-csrf-token", csrfToken as string)
      .send({ key: "batesCounter", pages: 3, startAt: 12001 });

    assert.equal(batesRes.status, 200);
    assert.ok(batesRes.body?.range, "bates range missing");
    assert.equal(batesRes.body.range.start, 12001);
    assert.equal(batesRes.body.range.end, 12003);
    assert.equal(Number(batesRes.body.value), 12004);
  } finally {
    if (workspaceId) {
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => null);
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    restoreEnv();
  }
});
