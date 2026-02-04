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

function ensureDownloadSize(filePath: string | null, minBytes = 128) {
  if (!filePath) throw new Error("Download path not available");
  const stat = fs.statSync(filePath);
  if (stat.size < minBytes) {
    throw new Error(`Downloaded file too small: ${stat.size}`);
  }
}

test("perjury trap: source conflict, teleport flash, proof packet", async ({ page }) => {
  const loginRes = await loginWithRetry(page.request);
  const loginData = await loginRes.json();
  expect(loginData?.workspaceId).toBeTruthy();
  expect(loginData?.token).toBeTruthy();
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
  await page.goto("/assistant", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#case-assistant-exhibit", { timeout: 90_000 });

  const exhibitsResponse = await page.waitForResponse((res) => (
    res.url().includes("/exhibits") && res.request().method() === "GET"
  ), { timeout: 30_000 });
  expect(exhibitsResponse.ok()).toBeTruthy();

  await page.getByTestId("btn-view-draft").click({ noWaitAfter: true });

  const playbookSelect = page.locator("#drafting-playbook");
  await playbookSelect.waitFor({ state: "visible", timeout: 30_000 });
  const playbookOptions = playbookSelect.locator("option");
  const playbookCount = await playbookOptions.count();
  if (playbookCount > 0) {
    await playbookSelect.selectOption({ index: 0 });
  }

  await page.getByRole("button", { name: /run review/i }).click();
  await page.waitForSelector("text=Source Conflict detected", { timeout: 120_000 });

  const linkedInCitation = page.locator("button", { hasText: /LinkedIn/i }).first();
  if (await linkedInCitation.count()) {
    await linkedInCitation.click();
  } else {
    const mediaCitation = page.locator("button", { hasText: /@/ }).first();
    await mediaCitation.click();
  }
  await page.waitForSelector(".ring-yellow-400", { state: "visible" });

  await page.click("#nav-evidence");
  const downloadButton = page.locator("#btn-export-packet");
  await expect(downloadButton).toBeVisible({ timeout: 30_000 });
  await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    downloadButton.click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  ensureDownloadSize(await download.path());
});
