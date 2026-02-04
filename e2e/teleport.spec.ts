import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const pdfPath = path.resolve("e2e", "fixtures", "sample.pdf");
const pdfBuffer = fs.readFileSync(pdfPath);

test("teleport latency and fallbacks", async ({ page }) => {
  const consoleLines: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("TELEPORT_MS=")) consoleLines.push(text);
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ workspaceId: "w1", role: "admin" })
    });
  });

  await page.route("**/api/workspaces/w1/prefs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, prefs: { lexipro_tour_completed: "true" } })
    });
  });

  await page.route("**/api/workspaces/w1/exhibits", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "ex1", filename: "Sample_LOI_Draft_DEMO.pdf", integrityHash: "hash1" },
        { id: "ex2", filename: "Second_Exhibit.pdf", integrityHash: "hash2" }
      ])
    });
  });

  await page.route("**/api/workspaces/w1/exhibits/ex1/anchors", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "a1", exhibitId: "ex1", pageNumber: 1, lineNumber: 1, text: "Anchor 1", bboxJson: [100, 100, 120, 30] },
        { id: "a-missing", exhibitId: "ex1", pageNumber: 2, lineNumber: 2, text: "Missing bbox" }
      ])
    });
  });

  await page.route("**/api/workspaces/w1/exhibits/ex2/anchors", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "a2", exhibitId: "ex2", pageNumber: 1, lineNumber: 1, text: "Anchor 2", bboxJson: [200, 100, 120, 30] }
      ])
    });
  });

  await page.route("**/api/workspaces/w1/exhibits/*/file**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer
    });
  });

  await page.route("**/api/ai/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, status: "READY" })
    });
  });

  await page.route("**/api/audit/log", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.route("**/api/integrity/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, status: "SECURE_LEDGER_ACTIVE" })
    });
  });

  await page.route("**/api/workspaces/w1/integrity/alerts/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: ""
    });
  });

  await page.route("**/api/workspaces/w1/audit/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: ""
    });
  });

  await page.route("**/api/workspaces/w1/audit/recent?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([])
    });
  });

  await page.addInitScript(() => {
    class DummyEventSource {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      addEventListener() {}
      close() {}
    }
    (window as any).EventSource = DummyEventSource as any;
    sessionStorage.setItem("workspace_id", "w1");
    sessionStorage.setItem("workspace_role", "admin");
  });

  await page.goto("/assistant?teleportTest=1", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("#teleport-test-panel");
  await page.waitForSelector("#case-assistant-exhibit");
  await page.waitForFunction(() => {
    const select = document.querySelector("#case-assistant-exhibit") as HTMLSelectElement | null;
    return Boolean(select && select.options.length > 0 && select.value === "ex1");
  });

  // Normal bbox
  await page.click("#teleport-case-bbox");
  await page.waitForSelector(".sniper-wash", { state: "visible" });

  // AnchorId only (fetch bbox)
  await page.click("#teleport-case-anchor");
  await page.waitForSelector(".sniper-wash", { state: "visible" });

  // Missing bbox (fallback toast)
  await page.click("#teleport-case-missing");
  await page.waitForSelector("text=BBox unavailable");

  // Exhibit mismatch (auto-switch toast)
  await page.click("#teleport-case-switch");
  await page.waitForSelector("text=Switched to Exhibit");

  const last = consoleLines[consoleLines.length - 1] || "";
  const ms = Number(last.split("TELEPORT_MS=")[1] || 0);
  expect(ms).toBeGreaterThan(0);
  expect(ms).toBeLessThan(1000);
});
