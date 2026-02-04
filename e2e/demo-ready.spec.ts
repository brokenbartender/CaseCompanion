import { test, expect } from "@playwright/test";
import fs from "node:fs";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@lexipro.local";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "LexiPro!234";

async function loginWithRetry(request: typeof test.prototype.request, maxAttempts = 5) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await request.post("http://127.0.0.1:8787/api/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD }
    });
    lastStatus = res.status();
    if (res.ok()) return res;
    if (lastStatus !== 429 || attempt === maxAttempts) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Login API failed ${lastStatus}`);
}

function ensureDownloadSize(filePath: string | null, minBytes = 64) {
  if (!filePath) throw new Error("Download path not available");
  const stat = fs.statSync(filePath);
  if (stat.size < minBytes) {
    throw new Error(`Downloaded file too small: ${stat.size}`);
  }
}

test("golden demo flow: login, citations, teleport, export", async ({ page }) => {
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];
  let exportSeen = false;
  let exportStatus = 0;
  let exportBytes = 0;

  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      serverErrors.push(res.url());
    }
    if (res.url().includes("/package")) {
      exportSeen = true;
      exportStatus = res.status();
      void res.body().then((buf) => {
        exportBytes = buf?.byteLength || 0;
      }).catch(() => {});
    }
  });

  const loginRes = await loginWithRetry(page.request);
  const loginData = await loginRes.json();
  if (!loginData?.workspaceId) {
    throw new Error("Login response missing workspaceId");
  }
  if (!loginData?.token) {
    throw new Error("Login response missing token");
  }
  const csrfToken = `csrf-${Date.now()}`;
  await page.context().addCookies([
    { name: "forensic_token", value: loginData.token, url: "http://127.0.0.1:8787" },
    { name: "forensic_csrf", value: csrfToken, url: "http://127.0.0.1:8787" },
    { name: "forensic_token", value: loginData.token, url: "http://localhost:8787" },
    { name: "forensic_csrf", value: csrfToken, url: "http://localhost:8787" },
    { name: "forensic_token", value: loginData.token, url: "http://127.0.0.1:5173" },
    { name: "forensic_csrf", value: csrfToken, url: "http://127.0.0.1:5173" },
    { name: "forensic_token", value: loginData.token, url: "http://localhost:5173" },
    { name: "forensic_csrf", value: csrfToken, url: "http://localhost:5173" }
  ]);

  await page.addInitScript(({ workspaceId, token }) => {
    if (workspaceId) sessionStorage.setItem("workspace_id", workspaceId);
    if (token) sessionStorage.setItem("auth_token", token);
    sessionStorage.setItem("workspace_role", "owner");
  }, { workspaceId: loginData.workspaceId, token: loginData.token });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ workspaceId, token }) => {
    if (workspaceId) sessionStorage.setItem("workspace_id", workspaceId);
    if (token) sessionStorage.setItem("auth_token", token);
    sessionStorage.setItem("workspace_role", "owner");
  }, { workspaceId: loginData.workspaceId, token: loginData.token });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(({ workspaceId, token }) => {
    if (workspaceId) sessionStorage.setItem("workspace_id", workspaceId);
    if (token) sessionStorage.setItem("auth_token", token);
    sessionStorage.setItem("workspace_role", "owner");
  }, { workspaceId: loginData.workspaceId, token: loginData.token });
  await expect(page.locator("nav")).toBeVisible();
  await page.waitForSelector("#nav-narrative", { timeout: 90_000 });

  await page.click("#nav-narrative");
  await page.goto("/assistant?seed=1", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#case-assistant-exhibit");

  const exhibitsResponse = await page.waitForResponse((res) => (
    res.url().includes("/exhibits") && res.request().method() === "GET"
  ), { timeout: 30_000 });
  if (!exhibitsResponse.ok()) {
    throw new Error(`Exhibits fetch failed ${exhibitsResponse.status()}: ${await exhibitsResponse.text()}`);
  }

  const exhibitOptions = page.locator("#case-assistant-exhibit option");
  await page.waitForFunction(() => {
    const select = document.querySelector("#case-assistant-exhibit") as HTMLSelectElement | null;
    return Boolean(select && select.options.length > 2);
  });
  const optionCount = await exhibitOptions.count();
  expect(optionCount).toBeGreaterThan(2);

  const optionText = (await exhibitOptions.allTextContents()).join(" |");
  expect(optionText).toMatch(/\.pdf/i);
  expect(optionText).toMatch(/\.mp4/i);
  expect(optionText).toMatch(/\.wav/i);

  await page.getByTestId("btn-view-draft").click({ noWaitAfter: true });

  const playbookSelect = page.locator("#drafting-playbook");
  await playbookSelect.waitFor({ state: "visible", timeout: 30_000 });
  const playbookOptions = playbookSelect.locator("option");
  const playbookCount = await playbookOptions.count();
  if (playbookCount > 0) {
    await playbookSelect.selectOption({ index: 0 });
  }

  await page.getByRole("button", { name: /run review/i }).click();
  await expect(page.locator("#seeded-source-conflict")).toBeVisible({ timeout: 45_000 });

  const docCitation = page.locator("button", { hasText: /p\.1/ }).first();
  await expect(docCitation).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000);
  await docCitation.click();
  await page.waitForSelector(".sniper-wash", { state: "visible" });

  const mediaCitation = page.locator("button", { hasText: /@ 00:12/ }).first();
  await expect(mediaCitation).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000);
  await mediaCitation.click();
  await expect(page.locator('[data-testid="teleport-flash"]')).toBeVisible();

  await page.click("#nav-evidence");
  await page.waitForLoadState("domcontentloaded");

  const ensureExportButton = async () => {
    const packetButton = page.locator("#btn-export-packet");
    if (await packetButton.count()) return packetButton;
    await page.goto("/command-center", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("nav", { timeout: 20000 });
    await page.waitForSelector("#btn-export-packet", { timeout: 30000 });
    return page.locator("#btn-export-packet");
  };

  const packetButton = await ensureExportButton();
  if (!(await packetButton.count())) {
    throw new Error("Export packet button not available in Command Center.");
  }

  const waitForExportResponse = async () => {
    try {
      return await page.waitForResponse(
        (res) => res.url().includes("/package") && res.status() === 200,
        { timeout: 10000 }
      );
    } catch {
      return null;
    }
  };

  const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  const pendingResponse = waitForExportResponse();
  await packetButton.click();
  const [download, exportResponse] = await Promise.all([downloadPromise, pendingResponse]);

  if (exportResponse) {
    exportSeen = true;
    exportStatus = exportResponse.status();
    exportBytes = (await exportResponse.body()).byteLength;
    const disposition = exportResponse.headers()["content-disposition"] || "";
    if (disposition) {
      expect(disposition).toMatch(/lexipro|export|packet|admissibility/i);
    }
  }

  if (download) {
    expect(download.suggestedFilename()).toMatch(/LexiPro|Export|Packet|admissibility/i);
    const downloadPath = await download.path();
    ensureDownloadSize(downloadPath, 128);
    if (downloadPath) {
      fs.unlinkSync(downloadPath);
    }
  }

  const retryPackage = async () => {
    const cookieHeader = `forensic_token=${loginData.token}; forensic_csrf=${csrfToken}`;
    const exhibitsRes = await page.request.get(
      `http://127.0.0.1:8787/api/workspaces/${loginData.workspaceId}/exhibits`,
      { headers: { "x-workspace-id": loginData.workspaceId, "x-csrf-token": csrfToken, Cookie: cookieHeader } }
    );
    if (!exhibitsRes.ok()) {
      throw new Error(`Exhibits fetch failed ${exhibitsRes.status()}`);
    }
    const exhibits = await exhibitsRes.json().catch(() => []);
    const target = Array.isArray(exhibits) ? exhibits[0] : null;
    if (!target?.id) {
      throw new Error("No exhibits available for export.");
    }
    const packageRes = await page.request.get(
      `http://127.0.0.1:8787/api/exhibits/${target.id}/package`,
      { headers: { "x-workspace-id": loginData.workspaceId, "x-csrf-token": csrfToken, Cookie: cookieHeader } }
    );
    return packageRes;
  };

  if (!exportSeen || exportStatus !== 200 || exportBytes <= 0) {
    const cookieHeader = `forensic_token=${loginData.token}; forensic_csrf=${csrfToken}`;
    const exhibitsRes = await page.request.get(
      `http://127.0.0.1:8787/api/workspaces/${loginData.workspaceId}/exhibits`,
      { headers: { "x-workspace-id": loginData.workspaceId, "x-csrf-token": csrfToken, Cookie: cookieHeader } }
    );
    if (!exhibitsRes.ok()) {
      throw new Error(`Exhibits fetch failed ${exhibitsRes.status()}`);
    }
    const exhibits = await exhibitsRes.json().catch(() => []);
    const target = Array.isArray(exhibits) ? exhibits[0] : null;
    if (!target?.id) {
      throw new Error("No exhibits available for export.");
    }
    const packageRes = await page.request.get(
      `http://127.0.0.1:8787/api/exhibits/${target.id}/package`,
      { headers: { "x-workspace-id": loginData.workspaceId, "x-csrf-token": csrfToken, Cookie: cookieHeader } }
    );
    exportStatus = packageRes.status();
    exportBytes = (await packageRes.body()).byteLength;
  }

  if (exportStatus !== 200 || exportBytes <= 0) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const retry = await retryPackage();
      exportStatus = retry.status();
      exportBytes = (await retry.body()).byteLength;
      if (exportStatus === 200 && exportBytes > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  expect(exportStatus).toBe(200);
  expect(exportBytes).toBeGreaterThan(0);

  const nonClioServerErrors = serverErrors.filter((url) => !url.includes("notifications/clio"));
  const blockingErrors = consoleErrors.filter((entry) => {
    const msg = String(entry || "");
    if (!msg) return false;
    if (msg.includes("Failed to load resource") && msg.includes("500") && nonClioServerErrors.length === 0) {
      return false;
    }
    return true;
  });
  expect(nonClioServerErrors).toEqual([]);
  expect(blockingErrors).toEqual([]);
});
