import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3001";
const apiUrl = process.env.QA_API_URL || "http://localhost:8787";
const headless = process.env.QA_HEADLESS !== "false";
const extraHosts = (process.env.QA_ALLOW_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(repoRoot, "reports", "qa-browser-worker", timestamp);
fs.mkdirSync(reportDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  apiUrl,
  headless,
  steps: [],
  console: [],
  pageErrors: [],
  requestFailures: [],
  blockedRequests: [],
  screenshots: [],
  findings: [],
};

const allowHosts = new Set([
  new URL(baseUrl).host,
  new URL(apiUrl).host,
  "localhost",
  "127.0.0.1",
  ...extraHosts,
]);

const allowPrefixes = ["data:", "blob:"];
const allowHostsLoose = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

function recordStep(name, status = "ok", detail = "") {
  report.steps.push({ name, status, detail, at: new Date().toISOString() });
}

async function safeClick(page, label) {
  const locator = page.getByRole("button", { name: label }).first();
  const fallback = page.locator(`text=${JSON.stringify(label)}`).first();
  const target = (await locator.count()) ? locator : fallback;
  if ((await target.count()) === 0) {
    report.findings.push({ type: "missing", label });
    return false;
  }
  try {
    await target.click({ timeout: 2000 });
    return true;
  } catch (error) {
    report.findings.push({ type: "click-failed", label, error: String(error) });
    return false;
  }
}

async function capture(page, name) {
  const file = path.join(reportDir, name);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(path.relative(repoRoot, file));
}

async function main() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    report.console.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      at: new Date().toISOString(),
    });
  });

  page.on("pageerror", (error) => {
    report.pageErrors.push({ message: error.message, at: new Date().toISOString() });
  });

  page.on("requestfailed", (request) => {
    report.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
      at: new Date().toISOString(),
    });
  });

  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (allowPrefixes.some((prefix) => url.startsWith(prefix))) {
      return route.continue();
    }
    try {
      const target = new URL(url);
      if (allowHosts.has(target.host) || allowHostsLoose.has(target.host)) {
        return route.continue();
      }
      report.blockedRequests.push({ url, at: new Date().toISOString() });
      return route.abort();
    } catch {
      report.blockedRequests.push({ url, at: new Date().toISOString() });
      return route.abort();
    }
  });

  try {
    recordStep("open-home");
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
    await capture(page, "01-home.png");

    recordStep("guided-tour");
    await safeClick(page, "Run Guided Tour");
    await safeClick(page, "Run Guided Investigation");
    await safeClick(page, "Run Tour");
    await safeClick(page, "Start Tour");
    await page.waitForTimeout(2500);
    await capture(page, "02-after-tour.png");

    recordStep("trust-security");
    await safeClick(page, "Security & Trust");
    await safeClick(page, "Run Security Check");
    await page.waitForTimeout(1200);
    await capture(page, "03-security.png");

    recordStep("integrations");
    await safeClick(page, "Integrations");
    await safeClick(page, "Trigger Export");
    await safeClick(page, "Export to Relativity");
    await page.waitForTimeout(1200);
    await capture(page, "04-integrations.png");

    recordStep("roi-snapshot");
    await safeClick(page, "ROI Snapshot");
    await page.waitForTimeout(800);
    await capture(page, "05-roi.png");

    recordStep("proof-pack");
    await safeClick(page, "Proof Pack");
    await safeClick(page, "Forensic Audit Report");
    await page.waitForTimeout(800);
    await capture(page, "06-proof-pack.png");

    recordStep("request-demo");
    await safeClick(page, "Request Demo");
    await page.waitForTimeout(800);
    await capture(page, "07-request-demo.png");
  } catch (error) {
    recordStep("fatal", "fail", String(error));
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(reportDir, "report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );

  const summaryLines = [
    "# QA Browser Worker Report",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Base URL: ${baseUrl}`,
    `- API URL: ${apiUrl}`,
    `- Headless: ${headless}`,
    `- Steps: ${report.steps.length}`,
    `- Console messages: ${report.console.length}`,
    `- Page errors: ${report.pageErrors.length}`,
    `- Request failures: ${report.requestFailures.length}`,
    `- Blocked requests: ${report.blockedRequests.length}`,
    `- Screenshots: ${report.screenshots.length}`,
  ];

  fs.writeFileSync(path.join(reportDir, "report.md"), summaryLines.join("\n") + "\n", "utf-8");
  console.log(`QA report saved to ${reportDir}`);
}

main().catch((error) => {
  report.steps.push({ name: "bootstrap", status: "fail", detail: String(error) });
  fs.writeFileSync(
    path.join(reportDir, "report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );
  console.error(error);
  process.exit(1);
});
