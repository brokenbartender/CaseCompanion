import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import http from "node:http";
import { PDFDocument, StandardFonts } from "pdf-lib";
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
    data: { email: `grounding-${suffix}@lexipro.local`, passwordHash: "hash" }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Grounding ${suffix}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role }
  });
  return { user, workspace };
}

test("ai chat withholds unanchored output and releases anchored output", { skip: !dbAvailable }, async () => {
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
  ensureSigningKeys();

  const { storageService } = await import("../storageService.js");

  let anchorId = "";
  let secondaryAnchorId = "";
  let llmCitation = "";
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
        : { summary: `Anchored summary <cite>${llmCitation}</cite>`, claims: [{ text: "Anchor proof", anchorIds: [anchorId || "missing"] }] };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ response: JSON.stringify(responsePayload) }));
    });
  });
  await new Promise<void>((resolve) => llmServer.listen(0, resolve));
  const llmAddress = llmServer.address();
  const llmPort = typeof llmAddress === "object" && llmAddress ? llmAddress.port : 0;
  process.env.OLLAMA_URL = `http://127.0.0.1:${llmPort}`;

  const { user, workspace } = await createUserWorkspace("member");
  const matter = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `grounding-${Date.now()}`,
      name: "Grounding Matter"
    }
  });

  const { app } = await import(`../index.ts?grounding=${Date.now()}`);
  const server = app.listen(0);

  let exhibitId = "";
  let storageKey = "";

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);
    const csrfToken = "grounding-csrf";

    const withheldRes = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "see doc",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const withheldJson = await withheldRes.json().catch(() => ({}));

    assert.equal(withheldRes.status, 422);
    assert.equal(withheldJson.ok, false);
    assert.equal(withheldJson.errorCode, "WITHHELD");
    assert.ok(Array.isArray(withheldJson.withheldReasons));
    assert.ok(withheldJson.auditEventId);

    const auditEvent = await prisma.auditEvent.findUnique({ where: { id: withheldJson.auditEventId } });
    assert.ok(auditEvent);
    assert.equal(auditEvent?.eventType, "AI_RELEASE_GATE_BLOCKED");
    const auditPayload = JSON.parse(auditEvent?.payloadJson || "{}");
    assert.ok(auditPayload.requestId);
    assert.ok(Array.isArray(auditPayload.withheldReasons));

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText("Anchor proof", { x: 72, y: 700, size: 12, font });
    const pdfBytes = await pdfDoc.save();

    storageKey = `workspace-${workspace.id}/exhibit-${Date.now()}.pdf`;
    await storageService.upload(storageKey, Buffer.from(pdfBytes));

    const exhibit = await prisma.exhibit.create({
      data: {
        workspaceId: workspace.id,
        matterId: matter.id,
        filename: "anchor.pdf",
        mimeType: "application/pdf",
        storageKey,
        integrityHash: "hash-grounding-123456"
      }
    });
    exhibitId = exhibit.id;

    const anchor = await prisma.anchor.create({
      data: {
        exhibitId,
        pageNumber: 1,
        lineNumber: 1,
        text: "Anchor proof",
        bboxJson: JSON.stringify([0, 0, 1000, 1000])
      }
    });
    anchorId = anchor.id;
    const anchorB = await prisma.anchor.create({
      data: {
        exhibitId,
        pageNumber: 1,
        lineNumber: 2,
        text: "Second anchor proof",
        bboxJson: JSON.stringify([0, 0, 900, 900])
      }
    });
    secondaryAnchorId = anchorB.id;

    llmCitation = anchorId;
    const anchoredRes = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "see doc",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const anchoredJson = await anchoredRes.json().catch(() => ({}));

    assert.equal(anchoredRes.status, 200);
    assert.equal(anchoredJson.ok, true);
    assert.ok(Array.isArray(anchoredJson.findings));
    assert.ok(anchoredJson.findings.every((f: any) => Array.isArray(f.anchorIds)));

    llmCitation = "anchor-999";
    const rejectedRes = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: makeCookie(token, csrfToken),
        "x-csrf-token": csrfToken,
        "x-workspace-id": workspace.id
      },
      body: JSON.stringify({
        userPrompt: "see doc",
        promptKey: "forensic_synthesis",
        workspaceId: workspace.id,
        matterId: matter.id
      })
    });
    const rejectedJson = await rejectedRes.json().catch(() => ({}));
    assert.equal(rejectedRes.status, 422);
    assert.equal(rejectedJson.errorCode, "WITHHELD");
    assert.ok(Array.isArray(rejectedJson.withheldReasons));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => llmServer.close(() => resolve()));
    if (anchorId) await prisma.anchor.delete({ where: { id: anchorId } });
    if (secondaryAnchorId) await prisma.anchor.delete({ where: { id: secondaryAnchorId } });
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
