import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";
import { prisma } from "../lib/prisma.js";
import { buildAuthHeader, getDemoContext } from "./demo-helpers.js";

test("health endpoint returns ok", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${res.text}`);
  assert.ok(res.body?.ok);
});

test("unified timeline returns events", async () => {
  const ctx = await getDemoContext();
  const auth = buildAuthHeader(ctx.userId);

  const res = await request(app)
    .get(`/api/workspaces/${ctx.workspaceId}/timeline/unified?matterId=${ctx.matterId}`)
    .set("Authorization", auth)
    .set("x-workspace-id", ctx.workspaceId);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body?.events));
  assert.ok(res.body.events.length >= 1, "Expected at least one timeline event");
});

test("exhibit file endpoint returns bytes", async () => {
  const ctx = await getDemoContext();
  const auth = buildAuthHeader(ctx.userId);

  const res = await request(app)
    .get(`/api/workspaces/${ctx.workspaceId}/exhibits/${ctx.exhibitPdfId}/file?matterId=${ctx.matterId}`)
    .set("Authorization", auth)
    .set("x-workspace-id", ctx.workspaceId);

  assert.equal(res.status, 200);
  assert.ok(String(res.headers["content-type"]).includes("application/pdf"));
  assert.ok(res.body?.length > 0, "Expected non-empty PDF body");
});

test("audit log endpoint persists entries", async () => {
  const ctx = await getDemoContext();
  const auth = buildAuthHeader(ctx.userId);
  const action = `TEST_AUDIT_${Date.now()}`;

  const before = await prisma.auditEvent.count({
    where: { workspaceId: ctx.workspaceId, action }
  });

  const res = await request(app)
    .post("/api/audit/log")
    .set("Authorization", auth)
    .set("x-workspace-id", ctx.workspaceId)
    .send({ action, resourceId: ctx.exhibitPdfId, details: { source: "e2e" } });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);

  const after = await prisma.auditEvent.count({
    where: { workspaceId: ctx.workspaceId, action }
  });

  assert.equal(after, before + 1);
});

test("release gate blocked endpoint returns 422", async () => {
  const res = await request(app).get("/api/test/release-cert/blocked");
  assert.equal(res.status, 422);
  assert.equal(res.body?.errorCode, "NO_ANCHOR_NO_OUTPUT");
});
