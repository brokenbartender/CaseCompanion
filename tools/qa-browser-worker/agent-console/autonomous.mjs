import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { loadMemory, saveMemory, summarizeMemory, updateMemoryFromAutonomous } from "../memory.mjs";
import { buildCodeContext } from "../code-context.mjs";
import { loadKnowledge, summarizeKnowledge } from "../knowledge.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3001";
const headless = process.env.QA_HEADLESS !== "false";
const maxSteps = Number(process.env.QA_MAX_STEPS || "24");
function readEnvFileValue(key) {
  try {
    const envPath = path.join(repoRoot, ".env");
    const raw = fs.readFileSync(envPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      if (k !== key) continue;
      return line.slice(idx + 1).trim();
    }
  } catch {
    return "";
  }
  return "";
}

const provider = process.env.QA_PROVIDER || "openai";
const openAiKey =
  process.env.OPENAI_API_KEY ||
  process.env.QA_OPENAI_API_KEY ||
  readEnvFileValue("OPENAI_API_KEY");
const model =
  process.env.QA_OPENAI_MODEL ||
  process.env.OLLAMA_MODEL ||
  "llama3:8b-instruct-q4_K_M";

if (provider === "openai" && !openAiKey) {
  console.error("Missing OPENAI_API_KEY (or QA_OPENAI_API_KEY).");
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(repoRoot, "reports", "qa-browser-agent", timestamp);
fs.mkdirSync(reportDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  headless,
  model,
  steps: [],
  console: [],
  pageErrors: [],
  requestFailures: [],
  screenshots: [],
  decisions: [],
};

function recordStep(step) {
  report.steps.push({ ...step, at: new Date().toISOString() });
}

async function capture(page, name) {
  const file = path.join(reportDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(path.relative(repoRoot, file));
}

async function getPageSnapshot(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      return style && style.visibility !== "hidden" && style.display !== "none" && el.getBoundingClientRect().height > 0;
    };

    const buttons = Array.from(document.querySelectorAll("button"))
      .filter(visible)
      .map((btn) => btn.textContent?.trim())
      .filter(Boolean);

    const links = Array.from(document.querySelectorAll("a"))
      .filter(visible)
      .map((a) => a.textContent?.trim())
      .filter(Boolean);

    const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
      .filter(visible)
      .map((input, index) => {
        const el = input;
        const id = el.getAttribute("id");
        const name = el.getAttribute("name");
        const placeholder = el.getAttribute("placeholder");
        const testId = el.getAttribute("data-testid");
        const type = el.getAttribute("type") || el.tagName.toLowerCase();
        let selector = "";
        if (id) selector = `#${id}`;
        else if (testId) selector = `[data-testid="${testId}"]`;
        else if (name) selector = `${el.tagName.toLowerCase()}[name="${name}"]`;
        else if (placeholder) selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
        else selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        const label = el.getAttribute("aria-label") || placeholder || name || id || type;
        return { selector, label, type };
      });

    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .filter(visible)
      .map((h) => h.textContent?.trim())
      .filter(Boolean);

    return {
      title: document.title,
      url: window.location.href,
      buttons: Array.from(new Set(buttons)),
      links: Array.from(new Set(links)),
      inputs,
      headings,
    };
  });
}

async function callOpenAi(payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }
  return response.json();
}

async function callOllama(prompt) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const controller = new AbortController();
  const timeoutMs = Number(process.env.QA_OLLAMA_TIMEOUT_MS || "30000");
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a careful autonomous QA agent. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      format: "json",
      stream: false,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }
  return response.json();
}

function buildSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      action: {
        type: "string",
        enum: ["click_text", "click_selector", "type", "press", "wait", "screenshot", "done"],
      },
      target: { type: "string" },
      text: { type: "string" },
      rationale: { type: "string" },
    },
    required: ["action", "target", "text", "rationale"],
  };
}

function buildPrompt(snapshot, lastResult) {
  const memory = summarizeMemory(loadMemory(repoRoot));
  const knowledge = summarizeKnowledge(loadKnowledge(repoRoot));
  const includeCode = process.env.QA_CODE_SCAN === "1";
  const codeContext = includeCode ? buildCodeContext(repoRoot) : null;
  return [
    "You are an autonomous QA agent testing a web app as a real user.",
    "You may reference the codebase summary when deciding what to test.",
    "Pick ONE next action to move through the demo and validate core features.",
    "Return ONLY JSON matching the provided schema. Use empty strings when not needed.",
    "If you believe the demo is complete, respond with action=done.",
    "",
    `Goal: validate the app end-to-end (guided tour, security check, integrations, ROI, proof pack, request demo).`,
    `Last result: ${lastResult || "none"}`,
    "",
    "Long-term memory (prior runs):",
    JSON.stringify(memory, null, 2),
    "",
    "Knowledge base (slow-changing truths):",
    JSON.stringify(knowledge, null, 2),
    includeCode ? "" : null,
    includeCode ? "Codebase summary (read-only):" : null,
    includeCode ? JSON.stringify(codeContext, null, 2) : null,
    "",
    "Page snapshot:",
    JSON.stringify(snapshot, null, 2),
  ].filter(Boolean).join("\n");
}

async function run() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    report.console.push({ type: msg.type(), text: msg.text(), at: new Date().toISOString() });
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

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await capture(page, "00-home");

  let lastResult = "";
  for (let step = 1; step <= maxSteps; step += 1) {
    const snapshot = await getPageSnapshot(page);
    const prompt = buildPrompt(snapshot, lastResult);

    let content = "";
    if (provider === "openai") {
      const payload = {
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are a careful autonomous QA agent. Output strict JSON only.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "qa_action",
            strict: true,
            schema: buildSchema(),
          },
        },
        temperature: 0,
      };

      const data = await callOpenAi(payload);
      if (data?.refusal) {
        recordStep({ name: "refusal", detail: "Model refused to answer." });
        break;
      }
      content =
        data?.output_text ||
        data?.output?.find((item) => item.type === "message")?.content?.find((part) => part.type === "output_text")
          ?.text ||
        "";
    } else {
      const data = await callOllama(prompt);
      content = data?.message?.content || "";
    }
    if (!content) {
      recordStep({ name: "empty", detail: "Model returned empty output." });
      break;
    }
    let decision;
    try {
      decision = JSON.parse(content);
    } catch {
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        decision = JSON.parse(content.slice(start, end + 1));
      } else {
        recordStep({ name: "parse-error", detail: "Model output not JSON." });
        break;
      }
    }
    report.decisions.push(decision);

    if (decision.action === "done") {
      recordStep({ name: "done", detail: decision.rationale });
      break;
    }

    try {
      if (decision.action === "click_text") {
        await page.getByRole("button", { name: decision.target }).first().click({ timeout: 3000 }).catch(async () => {
          await page.getByText(decision.target, { exact: false }).first().click({ timeout: 3000 });
        });
      } else if (decision.action === "click_selector") {
        await page.locator(decision.target).first().click({ timeout: 5000 });
      } else if (decision.action === "type") {
        await page.locator(decision.target).first().fill(decision.text);
      } else if (decision.action === "press") {
        await page.keyboard.press(decision.target);
      } else if (decision.action === "wait") {
        await page.waitForTimeout(Number(decision.target) || 500);
      } else if (decision.action === "screenshot") {
        await capture(page, decision.target || `step-${step}`);
      }

      await page.waitForTimeout(500);
      await capture(page, `step-${step}`);
      const pageMeta = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll("h1")).map((h) => h.textContent?.trim()).filter(Boolean),
        h2: Array.from(document.querySelectorAll("h2")).map((h) => h.textContent?.trim()).filter(Boolean),
      }));
      lastResult = `ok: ${decision.action}`;
      recordStep({ name: decision.action, detail: decision.rationale, page: pageMeta });
    } catch (error) {
      lastResult = `error: ${error.message}`;
      recordStep({ name: "error", detail: lastResult });
    }
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(
    path.join(reportDir, "report.md"),
    [
      "# QA Autonomous Agent Report",
      `- Started: ${report.startedAt}`,
      `- Finished: ${report.finishedAt}`,
      `- Base URL: ${baseUrl}`,
      `- Model: ${model}`,
      `- Steps: ${report.steps.length}`,
      `- Decisions: ${report.decisions.length}`,
      `- Console messages: ${report.console.length}`,
      `- Page errors: ${report.pageErrors.length}`,
      `- Request failures: ${report.requestFailures.length}`,
      `- Screenshots: ${report.screenshots.length}`,
    ].join("\n") + "\n",
    "utf-8"
  );
  try {
    const memory = loadMemory(repoRoot);
    const updated = updateMemoryFromAutonomous(memory, report, reportDir);
    saveMemory(repoRoot, updated);
  } catch {
    // ignore memory update failures
  }

  await browser.close();
  console.log(`Autonomous QA report saved to ${reportDir}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
