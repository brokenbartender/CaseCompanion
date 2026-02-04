import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const pdfPath = path.resolve("e2e", "fixtures", "sample.pdf");
const pdfBuffer = fs.readFileSync(pdfPath);

const require = createRequire(import.meta.url);
const admPath = path.resolve("server", "node_modules", "adm-zip");
const AdmZip = require(admPath);

test("proof run: ingest -> grounded citation -> withheld -> proof packet", async ({ page }) => {
  const auditEvents: Array<{ id: string; eventType: string }> = [];

  const manifest = {
    workspaceId: "w1",
    integrityMode: "signed",
    signatureStatus: "signed",
    signerKeyId: "demo-key",
    files: [
      { path: "evidence/sample.pdf", sha256: "deadbeef" }
    ]
  };
  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.addFile("hashes.txt", Buffer.from("deadbeef  evidence/sample.pdf\n"));
  zip.addFile("signature.ed25519", Buffer.from("sig"));
  zip.addFile("evidence/sample.pdf", pdfBuffer);
  const proofZip = zip.toBuffer();

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathName = url.pathname;
    const method = route.request().method();

    if (pathName === "/api/auth/login" && method === "POST") {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid" }) });
    }

    if (pathName === "/api/auth/register" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "t1", workspaceId: "w1" })
      });
    }

    if (pathName === "/api/auth/me") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workspaceId: "w1", role: "admin", workspaceName: "M&A Green Run" })
      });
    }

    if (pathName === "/api/workspaces/w1/prefs") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, prefs: { lexipro_tour_completed: "true" } })
      });
    }

    if (pathName === "/api/demo/seed") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          exhibits: [{ id: "ex1", filename: "Sample_LOI.pdf" }]
        })
      });
    }

    if (pathName === "/api/workspaces/w1/exhibits") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "ex1", filename: "Sample_LOI.pdf", integrityHash: "hash1", verificationStatus: "CERTIFIED" }
        ])
      });
    }

    if (pathName === "/api/workspaces/w1/exhibits/ex1/anchors") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "a1", exhibitId: "ex1", pageNumber: 1, lineNumber: 1, text: "Anchor 1", bboxJson: [100, 100, 120, 30] }
        ])
      });
    }

    if (pathName.startsWith("/api/workspaces/w1/exhibits/") && pathName.endsWith("/file")) {
      return route.fulfill({ status: 200, headers: { "Content-Type": "application/pdf" }, body: pdfBuffer });
    }

    if (pathName === "/api/audit/log" && method === "POST") {
      const payload = route.request().postDataJSON() as { action?: string };
      auditEvents.push({ id: `audit-${auditEvents.length + 1}`, eventType: payload?.action || "UNKNOWN" });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }

    if (pathName === "/api/workspaces/w1/audit/logs") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(auditEvents) });
    }

    if (pathName === "/api/ai/status") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, status: "READY" }) });
    }

    if (pathName === "/api/integrity/verify") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, status: "SECURE_LEDGER_ACTIVE" }) });
    }

    if (pathName === "/api/workspaces/w1/integrity/alerts/stream") {
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    }

    if (pathName === "/api/workspaces/w1/audit/stream") {
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    }

    if (pathName.startsWith("/api/workspaces/w1/audit/recent")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    }

    if (pathName === "/api/ai/chat" && method === "POST") {
      const payload = route.request().postDataJSON() as { userPrompt?: string };
      if (/^anchored\b/i.test(String(payload?.userPrompt || ""))) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            text: "Anchored response.",
            claims: [{ text: "Claim 1", anchorIds: ["a1"] }],
            anchorsById: {
              a1: { id: "a1", exhibitId: "ex1", pageNumber: 1, bbox: [100, 100, 120, 30], integrityHash: "hash1" }
            },
            metrics: { anchoredCount: 1, unanchoredCount: 0, totalClaims: 1 }
          })
        });
      }
      auditEvents.push({ id: "audit-withheld", eventType: "AI_RELEASE_GATE_BLOCKED" });
      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          errorCode: "NO_ANCHOR_NO_OUTPUT",
          message: "WITHHELD: No Anchor",
          totalCount: 0,
          rejectedCount: 0,
          reasons: ["NO_ANCHOR_NO_OUTPUT"],
          auditEventId: "audit-withheld"
        })
      });
    }

    if (pathName === "/api/workspaces/w1/matters/m1/proof-packet") {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/zip" },
        body: proofZip
      });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.addInitScript(() => {
    class DummyEventSource {
      onmessage = null;
      onerror = null;
      addEventListener() {}
      close() {}
    }
    (window as any).EventSource = DummyEventSource as any;
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.click("text=Instant Access");
  await page.waitForURL("**/");

  const fileInput = page.locator("input[type=file]").first();
  await fileInput.setInputFiles(pdfPath);
  await page.waitForSelector("text=Evidence recorded", { timeout: 60_000 });

  await page.goto("/assistant?teleportTest=1", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#teleport-test-panel");
  await page.waitForSelector("#case-assistant-exhibit");
  await page.waitForFunction(() => {
    const select = document.querySelector("#case-assistant-exhibit") as HTMLSelectElement | null;
    return Boolean(select && select.options.length > 0 && select.value === "ex1");
  });

  const anchored = await page.evaluate(async () => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: "anchored proof request",
        promptKey: "case_assistant",
        workspaceId: "w1",
        matterId: "m1"
      })
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  expect(anchored.status).toBe(200);
  expect(anchored.body?.metrics?.anchoredCount).toBe(1);

  await page.click("#teleport-case-bbox");
  await page.waitForSelector(".sniper-wash", { state: "visible" });

  const unanchored = await page.evaluate(async () => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPrompt: "unanchored request",
        promptKey: "case_assistant",
        workspaceId: "w1",
        matterId: "m1"
      })
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  });
  expect(unanchored.status).toBe(422);
  expect(unanchored.body?.errorCode).toBe("NO_ANCHOR_NO_OUTPUT");

  const auditLog = await page.evaluate(async () => {
    const res = await fetch("/api/workspaces/w1/audit/logs");
    return res.json().catch(() => []);
  });
  expect(Array.isArray(auditLog)).toBeTruthy();
  expect(auditLog.some((evt: any) => evt.eventType === "AI_RELEASE_GATE_BLOCKED")).toBeTruthy();

  const proofPacketBase64 = await page.evaluate(async () => {
    const res = await fetch("/api/workspaces/w1/matters/m1/proof-packet");
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (const b of buf) binary += String.fromCharCode(b);
    return btoa(binary);
  });
  const proofBuffer = Buffer.from(proofPacketBase64, "base64");
  const parsedZip = new AdmZip(proofBuffer);
  const entryNames = parsedZip.getEntries().map((entry: any) => entry.entryName);
  expect(entryNames).toContain("manifest.json");
  const manifestText = parsedZip.readAsText("manifest.json");
  const parsedManifest = JSON.parse(manifestText);
  expect(parsedManifest.signatureStatus).toBe("signed");
  expect(parsedManifest.integrityMode).toBe("signed");
});