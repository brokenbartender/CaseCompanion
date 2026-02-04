import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { loadMemory, saveMemory, updateMemoryFromDiagnose } from "./memory.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3001";
const headless = process.env.QA_HEADLESS !== "false";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(repoRoot, "reports", "qa-ui-diagnostics", timestamp);
fs.mkdirSync(reportDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  headless,
  issues: [],
  interactions: [],
  console: [],
  pageErrors: [],
  requestFailures: [],
  screenshots: [],
  login: null,
};

const loginEmail = process.env.QA_LOGIN_EMAIL || "";
const loginPassword = process.env.QA_LOGIN_PASSWORD || "";

function saveJson() {
  fs.writeFileSync(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
}

async function capture(page, name) {
  const file = path.join(reportDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(path.relative(repoRoot, file));
}

async function getUiState(page) {
  return page.evaluate(() => {
    const body = document.body;
    const url = window.location.href;
    const title = document.title;
    const textSample = body ? body.innerText.slice(0, 2000) : "";
    const hash = btoa(
      JSON.stringify({
        url,
        title,
        textSample,
      })
    );
    return { url, title, hash };
  });
}

async function listTargets(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      if (!style || style.visibility === "hidden" || style.display === "none") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const buttons = Array.from(document.querySelectorAll("button"))
      .filter(visible)
      .map((btn) => ({
        type: "button",
        label: btn.textContent?.trim() || btn.getAttribute("aria-label") || "",
        selector: btn.id ? `#${btn.id}` : "",
      }))
      .filter((b) => b.label);

    const links = Array.from(document.querySelectorAll("a"))
      .filter(visible)
      .map((a) => ({
        type: "link",
        label: a.textContent?.trim() || a.getAttribute("aria-label") || "",
        selector: a.id ? `#${a.id}` : "",
        href: a.getAttribute("href") || "",
      }))
      .filter((l) => l.label);

    return { buttons, links };
  });
}

async function clickTarget(page, target) {
  if (target.selector) {
    const loc = page.locator(target.selector).first();
    if (await loc.count()) {
      await loc.click({ timeout: 3000 });
      return true;
    }
  }
  if (target.type === "link") {
    const loc = page.getByRole("link", { name: target.label }).first();
    if (await loc.count()) {
      await loc.click({ timeout: 3000 });
      return true;
    }
  }
  const loc = page.getByRole("button", { name: target.label }).first();
  if (await loc.count()) {
    await loc.click({ timeout: 3000 });
    return true;
  }
  const fallback = page.getByText(target.label, { exact: false }).first();
  if (await fallback.count()) {
    await fallback.click({ timeout: 3000 });
    return true;
  }
  return false;
}

async function diagnose() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => report.console.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (error) => report.pageErrors.push({ message: error.message }));
  page.on("requestfailed", (request) => {
    report.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
    });
  });

  page.on("response", async (response) => {
    try {
      const url = response.url();
      if (!url.includes("/auth/login")) return;
      const body = await response.text();
      report.login = { status: response.status(), body };
    } catch {
      // ignore
    }
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await capture(page, "00-home");

  if (loginEmail && loginPassword) {
    let emailInput = page.getByLabel(/email address/i).first();
    if (!(await emailInput.count())) {
      emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    }
    let passwordInput = page.getByLabel(/password/i).first();
    if (!(await passwordInput.count())) {
      passwordInput = page.locator('input[type="password"], input[name*="password"], input[placeholder*="password" i]').first();
    }
    if (!(await emailInput.count())) {
      emailInput = page.locator('input').nth(0);
    }
    if (!(await passwordInput.count())) {
      passwordInput = page.locator('input').nth(1);
    }
    if (await emailInput.count()) {
      await emailInput.fill(loginEmail);
    }
    if (await passwordInput.count()) {
      await passwordInput.fill(loginPassword);
    }
    const signInButton = page.getByRole("button", { name: /sign in|login|continue/i }).first();
    if (await signInButton.count()) {
      await signInButton.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      const authState = await page.evaluate(() => ({
        workspaceId: sessionStorage.getItem("workspace_id"),
        authToken: sessionStorage.getItem("auth_token") ? "set" : "missing",
      }));
      report.authState = authState;
      await capture(page, "01-after-login");
    }
  }

  const { buttons, links } = await listTargets(page);
  const targets = [
    ...buttons.map((b) => ({ ...b, source: "button" })),
    ...links.map((l) => ({ ...l, source: "link" })),
  ];

  const maxTargets = Number(process.env.QA_MAX_TARGETS || "30");
  const skipLabels = [/log out/i, /disconnect/i, /sign in/i, /create workspace/i];
  const filteredTargets = targets.filter((t) => !skipLabels.some((rx) => rx.test(t.label)));
  const trimmedTargets = filteredTargets.slice(0, maxTargets);

  for (let i = 0; i < trimmedTargets.length; i += 1) {
    const target = trimmedTargets[i];
    const before = await getUiState(page);
    if (before.url.endsWith("/login") && report.authState?.workspaceId) {
      // Avoid false positives after logout or redirect back to login.
      break;
    }
    const labelSafe = target.label.replace(/[^\w]+/g, "-").slice(0, 40);
    const tag = `${String(i + 1).padStart(2, "0")}-${target.type}-${labelSafe || "target"}`;
    await capture(page, `${tag}-before`);

    let clicked = false;
    let error = "";
    try {
      clicked = await clickTarget(page, target);
      await page.waitForTimeout(900);
    } catch (e) {
      error = String(e.message || e);
    }

    const after = await getUiState(page);
    await capture(page, `${tag}-after`);

    const changed = before.hash !== after.hash || before.url !== after.url;
    report.interactions.push({
      target,
      clicked,
      changed,
      before,
      after,
      error,
    });

    if (!clicked || !changed) {
      report.issues.push({
        type: !clicked ? "not-clickable" : "no-visible-change",
        label: target.label,
        selector: target.selector || "",
        href: target.href || "",
        url: before.url,
        before: `${tag}-before.png`,
        after: `${tag}-after.png`,
        error,
        suggestion: !clicked
          ? "Ensure this control is a real <button> or <a> with onClick bound."
          : "Add a visible state change (route, modal, toast, spinner) after click.",
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  saveJson();
  try {
    const memory = loadMemory(repoRoot);
    const updated = updateMemoryFromDiagnose(memory, report, reportDir);
    saveMemory(repoRoot, updated);
  } catch {
    // ignore memory update failures
  }
  await browser.close();

  const summary = [
    "# UI Diagnostic Report",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Base URL: ${baseUrl}`,
    `- Targets tested: ${trimmedTargets.length}`,
    `- Issues: ${report.issues.length}`,
  ];
  fs.writeFileSync(path.join(reportDir, "report.md"), summary.join("\n") + "\n", "utf-8");
  console.log(`UI diagnostics saved to ${reportDir}`);
}

diagnose().catch((error) => {
  console.error(error);
  saveJson();
  process.exit(1);
});
