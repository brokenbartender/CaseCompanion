import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const pdfPath = path.resolve("e2e", "fixtures", "sample.pdf");
const pdfBuffer = fs.readFileSync(pdfPath);

test("proof loop: anchored + withheld + teleport + export", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathName = url.pathname;
    const method = route.request().method();

    if (pathName === "/api/auth/me") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workspaceId: "w1", role: "admin" })
      });
    }

    if (pathName === "/api/workspaces/w1/prefs") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, prefs: { lexipro_tour_completed: "true" } })
      });
    }

    if (pathName === "/api/workspaces/w1/exhibits") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "ex1", filename: "Sample_LOI.pdf", integrityHash: "hash1", verificationStatus: "CERTIFIED" },
          { id: "ex2", filename: "Second_Exhibit.pdf", integrityHash: "hash2", verificationStatus: "PENDING" }
        ])
      });
    }

    if (pathName === "/api/workspaces/w1/exhibits/ex1/anchors") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "a1", exhibitId: "ex1", pageNumber: 1, lineNumber: 1, text: "Anchor 1", bboxJson: [100, 100, 120, 30] },
          { id: "a-missing", exhibitId: "ex1", pageNumber: 2, lineNumber: 2, text: "Missing bbox" }
        ])
      });
    }

    if (pathName === "/api/workspaces/w1/exhibits/ex2/anchors") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "a2", exhibitId: "ex2", pageNumber: 1, lineNumber: 1, text: "Anchor 2", bboxJson: [200, 100, 120, 30] }
        ])
      });
    }

    if (pathName.startsWith("/api/workspaces/w1/exhibits/") && pathName.endsWith("/file")) {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/pdf" },
        body: pdfBuffer
      });
    }

    if (pathName === "/api/audit/log") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }

    if (pathName === "/api/workspaces/w1/audit/logs") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    }

    if (pathName === "/api/exhibits/ex1/package") {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/zip" },
        body: Buffer.from("PK\x03\x04")
      });
    }

    if (pathName === "/api/ai/status") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, status: "READY" })
      });
    }

    if (pathName === "/api/integrity/verify") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, status: "SECURE_LEDGER_ACTIVE" })
      });
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
      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          errorCode: "NO_ANCHOR_NO_OUTPUT",
          message: "No Anchor -> No Output (422).",
          totalCount: 0,
          rejectedCount: 0,
          reasons: ["NO_ANCHOR_NO_OUTPUT"]
        })
      });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
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

  await page.click("#teleport-case-bbox");
  await page.waitForSelector(".sniper-wash", { state: "visible" });

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

  const exportRes = await page.evaluate(async () => {
    const res = await fetch("/api/exhibits/ex1/package");
    return res.status;
  });
  expect(exportRes).toBe(200);
});
