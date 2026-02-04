import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { ensureSigningKeys } from "./helpers/signingKeys.js";
import { storageService } from "../storageService.js";
import { logAuditEvent } from "../audit.js";
import { generateProofPacket } from "../services/packagingService.js";
import { verifyPacketIntegrity } from "../utils/packetVerifier.js";

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

async function createUserWorkspace(role: "member" | "admin", seed: string) {
  const user = await prisma.user.create({
    data: { email: `acq-${seed}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Acq ${seed}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("e2e acquisition flow: grounded chat, rejection, and proof packet", { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "";
  process.env.JWT_AUDIENCE = "";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.ALLOW_ENV_API_FALLBACK = "false";
  process.env.GEMINI_API_KEY = "";
  process.env.AI_REQUEST_TIMEOUT_MS = "1000";
  process.env.STORAGE_ENCRYPTION_REQUIRED = "false";
  process.env.ISOLATED_ENV = "true";
  ensureSigningKeys();

  let llmCitation = "";
  let anchorId = "";
  let anchorIdSecondary = "";
  const llmServer = http.createServer((req, res) => {
    if (!req.url?.includes("/api/generate")) {
      res.statusCode = 200;
      res.end("{}");
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let prompt = "";
      try {
        const parsed = JSON.parse(body || "{}");
        prompt = String(parsed?.prompt || "");
      } catch {
        prompt = "";
      }
      const isAudit = /independent audit model/i.test(prompt);
      const responsePayload = isAudit
        ? { admissible: true, anchoredCount: 1, unanchoredCount: 0, totalClaims: 1, issues: [] }
        : {
            summary: `Start date confirmed <cite>${llmCitation}</cite>`,
            claims: [
              { text: "Start Date: January 1, 2025", anchorIds: [anchorId || "missing", anchorIdSecondary || "missing-secondary"] }
            ]
          };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ response: JSON.stringify(responsePayload) }));
    });
  });
  await new Promise<void>((resolve) => llmServer.listen(0, resolve));
  const llmAddress = llmServer.address();
  const llmPort = typeof llmAddress === "object" && llmAddress ? llmAddress.port : 0;
  process.env.OLLAMA_URL = `http://127.0.0.1:${llmPort}`;

  const seed = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { user, workspace } = await createUserWorkspace("member", seed);
  const matter = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `acq-${seed}`,
      name: "Acquisition Matter"
    }
  });

  const { app } = await import(`../index.ts?acq=${Date.now()}`);
  const server = app.listen(0);

  let storageKey = "";
  let exhibitId = "";

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "acq-csrf";

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const pageTwo = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("Contract Start Date: January 1, 2025", { x: 72, y: 700, size: 12, font });
    pageTwo.drawText("Contract Start Date: January 1, 2025", { x: 72, y: 700, size: 12, font });
    const pdfBytes = await pdfDoc.save();

    storageKey = `workspace-${workspace.id}/contract-${Date.now()}.pdf`;
    await storageService.upload(storageKey, Buffer.from(pdfBytes));

    const exhibit = await prisma.exhibit.create({
      data: {
        workspaceId: workspace.id,
        matterId: matter.id,
        filename: "Contract.pdf",
        mimeType: "application/pdf",
        storageKey,
        integrityHash: "hash-contract-123456"
      }
    });
    exhibitId = exhibit.id;

    const anchor = await prisma.anchor.create({
      data: {
        exhibitId,
        pageNumber: 1,
        lineNumber: 1,
        text: "Contract Start Date: January 1, 2025",
        bboxJson: JSON.stringify([0, 0, 1000, 1000])
      }
    });
    anchorId = anchor.id;
    const secondaryAnchor = await prisma.anchor.create({
      data: {
        exhibitId,
        pageNumber: 2,
        lineNumber: 1,
        text: "Contract Start Date: January 1, 2025",
        bboxJson: JSON.stringify([0, 0, 1000, 1000])
      }
    });
    anchorIdSecondary = secondaryAnchor.id;

    await logAuditEvent(workspace.id, user.id, "EXHIBIT_UPLOAD", { details: { exhibitId } });

    llmCitation = anchorId;
    const groundedRes = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "What is the start date?",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const groundedJson = await groundedRes.json().catch(() => ({}));
    assert.equal(groundedRes.status, 200);
    assert.equal(groundedJson.ok, true);

    const anchoredAudit = await prisma.auditEvent.findFirst({
      where: { workspaceId: workspace.id, eventType: "AI_CHAT_ANCHORED" },
      orderBy: { createdAt: "desc" }
    });
    const releasedAudit = await prisma.auditEvent.findFirst({
      where: { workspaceId: workspace.id, eventType: "AI_CHAT_RELEASED" },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(anchoredAudit);
    assert.ok(releasedAudit);

    llmCitation = "anchor-fabricated";
    const rejectedRes = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "What is the start date?",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const rejectedJson = await rejectedRes.json().catch(() => ({}));
    assert.equal(rejectedRes.status, 422);
    assert.equal(rejectedJson.errorCode, "WITHHELD");

    const blockedAudit = await prisma.auditEvent.findFirst({
      where: { workspaceId: workspace.id, eventType: "AI_RELEASE_GATE_BLOCKED" },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(blockedAudit);

    const packet = await generateProofPacket(workspace.id, matter.id);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acq-flow-"));
    const zipPath = path.join(tmpDir, "proof.zip");
    fs.writeFileSync(zipPath, packet.buffer);

    const verification = verifyPacketIntegrity(zipPath);
    assert.deepEqual(verification, { ok: true });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => llmServer.close(() => resolve()));
    if (anchorId) await prisma.anchor.delete({ where: { id: anchorId } });
    if (exhibitId) await prisma.exhibit.delete({ where: { id: exhibitId } });
    await prisma.matter.delete({ where: { id: matter.id } });
    try { await prisma.workspace.delete({ where: { id: workspace.id } }); } catch { /* immutable audit log */ }
    try { await prisma.user.delete({ where: { id: user.id } }); } catch { /* immutable audit log */ }
    if (storageKey) {
      try { await storageService.delete(storageKey); } catch { /* ignore */ }
    }
    restoreEnv();
  }
});
