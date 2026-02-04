import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import request from "supertest";
import { prisma } from "../lib/prisma.js";
import {
  decryptBufferForWorkspace,
  encryptBufferForWorkspace,
  ensureWorkspaceKey,
  getWorkspaceKey,
  shredKey
} from "../services/cryptoShredder.js";

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildAuthHeader(userId: string) {
  const secret = String(process.env.JWT_SECRET || "");
  if (!secret) throw new Error("JWT_SECRET missing.");
  const token = jwt.sign({ userId }, secret, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

async function createWorkspaceFixture(label: string) {
  const suffix = `${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const user = await prisma.user.create({
    data: { email: `shredder-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({
    data: { name: `Shredder ${suffix}` }
  });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "member" }
  });
  const matter = await prisma.matter.create({
    data: { workspaceId: workspace.id, slug: `matter-${suffix}`, name: "Shredder Matter" }
  });
  return { user, workspace, matter };
}

async function runLegalHoldCheck(app: any) {
  const { user, workspace, matter } = await createWorkspaceFixture("hold");
  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: "Hold.pdf",
      mimeType: "application/pdf",
      storageKey: `${workspace.id}/${matter.slug}/hold.pdf`,
      integrityHash: "hash-hold-123",
      legalHold: true
    }
  });

  const auth = buildAuthHeader(user.id);
  const res = await request(app)
    .delete(`/api/workspaces/${workspace.id}/exhibits/${exhibit.id}`)
    .set("Authorization", auth)
    .set("x-workspace-id", workspace.id)
    .send({ reason: "close-case" });

  const ok = res.status === 403 && String(res.body?.error || "").includes("COMPLIANCE LOCK");
  return {
    ok,
    status: res.status,
    response: res.body || null
  };
}

async function runShredderCheck() {
  const { workspace } = await createWorkspaceFixture("shred");
  const sample = Buffer.from("LexiPro key shredder verification payload");
  ensureWorkspaceKey(workspace.id);
  const keyBefore = getWorkspaceKey(workspace.id);
  const encrypted = encryptBufferForWorkspace(sample, workspace.id);
  const encryptedHash = sha256(encrypted);
  const receipt = shredKey(workspace.id);
  const keyAfter = getWorkspaceKey(workspace.id);
  let blocked = false;
  let errorMessage = "";
  try {
    decryptBufferForWorkspace(encrypted, workspace.id);
  } catch (err: any) {
    blocked = true;
    errorMessage = err?.message || String(err);
  }

  return {
    workspaceId: workspace.id,
    shredReceipt: receipt,
    keyPresentBefore: Boolean(keyBefore),
    keyPresentAfter: Boolean(keyAfter),
    decryptBlocked: blocked,
    decryptError: errorMessage,
    encryptedSampleHash: encryptedHash,
    encryptedSampleBytes: encrypted.length
  };
}

async function main() {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";

  const { app } = await import(`../index.ts?shredder=${Date.now()}`);
  const legalHold = await runLegalHoldCheck(app);
  const shredder = await runShredderCheck();

  const report = {
    generatedAt: new Date().toISOString(),
    threatModel: "Workspace data is encrypted with a per-workspace key. Shredding the key renders encrypted payloads unrecoverable under the defined threat model.",
    legalHoldEnforcement: legalHold,
    shredderEvidence: shredder,
    environment: {
      nodeVersion: process.version,
      runtime: process.env.NODE_ENV || "unknown"
    }
  };

  const reportDir = path.resolve(process.cwd(), "..", "reports", "deletion_evidence");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `key_shredder_report-${nowTag()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(reportPath);
}

main().catch((err) => {
  console.error("Key shredder report failed:", err?.message || String(err));
  process.exit(1);
});
