import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { WebSocketServer } from "ws";
import { loadMemory, saveMemory, summarizeMemory, updateMemoryFromAgentSession } from "../memory.mjs";
import { buildCodeContext } from "../code-context.mjs";
import { loadKnowledge, saveKnowledge, summarizeKnowledge } from "../knowledge.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3001";
const headless = process.env.QA_HEADLESS !== "false";
const wsPort = Number(process.env.QA_AGENT_WS_PORT || "8789");
const traceEnabledDefault = String(process.env.QA_TRACE || "1") !== "0";
const traceEvery = Math.max(1, Number(process.env.QA_TRACE_EVERY || "1"));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(repoRoot, "reports", "qa-browser-agent", timestamp);
fs.mkdirSync(reportDir, { recursive: true });
const latestManifestPath = path.join(repoRoot, "reports", "qa-browser-agent", "latest.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "agent> ",
});

let browser;
let context;
let page;
let wss;
let cancelRequested = false;
let traceEnabled = traceEnabledDefault;
let traceStep = 0;
const session = {
  id: new Date().toISOString().replace(/[:.]/g, "-"),
  startedAt: new Date().toISOString(),
  baseUrl,
  commands: [],
  routes: [],
  notes: [],
  screenshots: [],
};

function writeLatestManifest() {
  const payload = {
    reportDir,
    baseUrl,
    screenshots: session.screenshots.slice(-40),
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(latestManifestPath, JSON.stringify(payload, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

function broadcastEvent(message) {
  if (!wss) return;
  const data = JSON.stringify({ type: "event", message });
  wss.clients?.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

async function init() {
  browser = await chromium.launch({ headless });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on("console", (msg) => {
    const kind = msg.type();
    if (["error", "warning"].includes(kind)) {
      broadcastEvent(`console:${kind} ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    broadcastEvent(`pageerror: ${err?.message || String(err)}`);
  });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  console.log(`Browser ready at ${baseUrl}`);
  // Bind to all interfaces so the browser can connect via localhost or LAN hostname.
  wss = new WebSocketServer({ port: wsPort, host: "0.0.0.0" });
  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "status", message: "connected" }));
    socket.on("message", async (raw) => {
      try {
        const text = raw.toString();
        const payload = JSON.parse(text);
        const result = await handleCommand(payload.command, payload.args || [], (message) => {
          socket.send(JSON.stringify({ type: "event", message }));
        });
        socket.send(JSON.stringify({ type: "result", result }));
      } catch (error) {
        socket.send(JSON.stringify({ type: "error", message: error.message }));
      }
    });
  });
  console.log(`Agent WebSocket listening on ws://0.0.0.0:${wsPort}`);
  console.log("Type 'help' for commands.");
  rl.prompt();
}

async function shutdown() {
  try {
    session.finishedAt = new Date().toISOString();
    const memory = loadMemory(repoRoot);
    const updated = updateMemoryFromAgentSession(memory, session);
    saveMemory(repoRoot, updated);
    writeLatestManifest();
    wss?.close();
    await browser?.close();
  } finally {
    rl.close();
  }
}

function parseArgs(line) {
  const regex = /"([^"]*)"|'([^']*)'|(\\S+)/g;
  const out = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    out.push(match[1] ?? match[2] ?? match[3]);
  }
  return out;
}

async function doScreenshot(name = "screenshot") {
  if (cancelRequested) throw new Error("Cancelled");
  const file = path.join(reportDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Saved ${file}`);
  session.screenshots.push(file);
  writeLatestManifest();
  return file;
}

async function doClick(selectorOrText) {
  if (cancelRequested) throw new Error("Cancelled");
  if (!selectorOrText) throw new Error("click requires selector or text");
  if (selectorOrText.startsWith("#") || selectorOrText.startsWith(".") || selectorOrText.startsWith("[") || selectorOrText.startsWith("//")) {
    await page.locator(selectorOrText).first().click({ timeout: 5000 });
    return;
  }
  await page.getByRole("button", { name: selectorOrText }).first().click({ timeout: 3000 }).catch(async () => {
    await page.getByText(selectorOrText, { exact: false }).first().click({ timeout: 3000 });
  });
}

async function doType(selector, text) {
  if (cancelRequested) throw new Error("Cancelled");
  if (!selector || text === undefined) throw new Error("type requires selector and text");
  await page.locator(selector).first().fill(text);
}

async function doPress(key) {
  if (cancelRequested) throw new Error("Cancelled");
  if (!key) throw new Error("press requires key");
  await page.keyboard.press(key);
}

async function doWait(ms) {
  if (cancelRequested) throw new Error("Cancelled");
  const delay = Number(ms);
  if (Number.isNaN(delay)) throw new Error("wait requires milliseconds");
  const start = Date.now();
  while (Date.now() - start < delay) {
    if (cancelRequested) throw new Error("Cancelled");
    await page.waitForTimeout(150);
  }
}

async function doGoto(url) {
  if (cancelRequested) throw new Error("Cancelled");
  if (!url) throw new Error("goto requires url");
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

async function doExpectText(text) {
  if (cancelRequested) throw new Error("Cancelled");
  if (!text) throw new Error("expect requires text");
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 });
  console.log(`Found: ${text}`);
}

async function doListButtons() {
  if (cancelRequested) throw new Error("Cancelled");
  const buttons = await page.locator("button").allTextContents();
  const unique = [...new Set(buttons.map((b) => b.trim()).filter(Boolean))];
  console.log(unique.join("\n") || "(no buttons found)");
}

async function captureRoute() {
  const info = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
  }));
  session.routes.push(info);
}

async function runDemoFlow() {
  if (cancelRequested) throw new Error("Cancelled");
  console.log("Running demo flow...");
  await doClick("Run Guided Tour");
  await doClick("Run Guided Investigation");
  await doWait(2000);
  await doClick("Security & Trust");
  await doClick("Run Security Check");
  await doWait(1000);
  await doClick("Integrations");
  await doClick("Trigger Export");
  await doWait(800);
  await doClick("ROI Snapshot");
  await doWait(800);
  await doScreenshot("demo-flow");
  console.log("Demo flow complete.");
}

async function maybeTrace(label, notify) {
  if (!traceEnabled) return;
  traceStep += 1;
  if (traceStep % traceEvery !== 0) return;
  const file = await doScreenshot(`trace-${traceStep}-${label}`);
  if (notify) notify(`Screenshot saved: ${file}`);
}

function showMemory() {
  const memory = loadMemory(repoRoot);
  const summary = summarizeMemory(memory);
  return [
    "Memory Snapshot:",
    `- Updated: ${summary.updatedAt || "never"}`,
    `- Recent runs: ${summary.latestRuns?.join(" | ") || "none"}`,
    `- Top issues: ${summary.topIssues?.join(" | ") || "none"}`,
    `- Routes: ${summary.routes?.join(" | ") || "none"}`,
    summary.notes?.length ? `- Notes: ${summary.notes.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function help() {
  return [
    "Commands:",
    "  help",
    "  goto <url>",
    "  click <selector|text>",
    "  type <selector> <text>",
    "  press <key>",
    "  wait <ms>",
    "  screenshot [name]",
    "  expect <text>",
    "  buttons",
    "  memory",
    "  code",
    "  knowledge",
    "  know <field> <value>",
    "  remember <note>",
    "  demo",
    "  trace <on|off>",
    "  cancel",
    "  stop",
    "  exit",
  ].join("\n");
}

async function handleCommand(command, args, notify) {
  const cmd = String(command || "").toLowerCase();
  if (cmd !== "cancel" && cmd !== "stop") cancelRequested = false;
  session.commands.push({ cmd, args, at: new Date().toISOString() });
  if (notify) notify(`Working: ${cmd} ${args.join(" ")}`.trim());
  switch (cmd) {
    case "help":
      return help();
    case "goto":
      if (notify) notify(`Navigating to ${args[0] || ""}`.trim());
      await doGoto(args[0]);
      await captureRoute();
      await maybeTrace("goto", notify);
      return "ok";
    case "click":
      if (notify) notify(`Clicking ${args.join(" ")}`.trim());
      await doClick(args.join(" "));
      await captureRoute();
      await maybeTrace("click", notify);
      return "ok";
    case "type":
      if (notify) notify(`Typing in ${args[0] || ""}`.trim());
      await doType(args[0], args.slice(1).join(" "));
      await maybeTrace("type", notify);
      return "ok";
    case "press":
      if (notify) notify(`Pressing ${args[0] || ""}`.trim());
      await doPress(args[0]);
      await maybeTrace("press", notify);
      return "ok";
    case "wait":
      if (notify) notify(`Waiting ${args[0] || ""}ms`.trim());
      await doWait(args[0]);
      await maybeTrace("wait", notify);
      return "ok";
    case "screenshot":
      if (notify) notify("Taking screenshot");
      await doScreenshot(args[0] || "screenshot");
      return "ok";
    case "expect":
      if (notify) notify(`Waiting for text: ${args.join(" ")}`.trim());
      await doExpectText(args.join(" "));
      await maybeTrace("expect", notify);
      return "ok";
    case "buttons":
      if (notify) notify("Listing buttons");
      await doListButtons();
      return "ok";
    case "memory":
      return showMemory();
    case "code": {
      const context = buildCodeContext(repoRoot);
      return JSON.stringify(context, null, 2);
    }
    case "knowledge": {
      const knowledge = summarizeKnowledge(loadKnowledge(repoRoot));
      return JSON.stringify(knowledge, null, 2);
    }
    case "know": {
      const field = args[0];
      const value = args.slice(1).join(" ").trim();
      if (!field) return "Usage: know <field> <value>";
      const knowledge = loadKnowledge(repoRoot);
      if (Array.isArray(knowledge[field])) {
        if (value) knowledge[field].push(value);
      } else if (value) {
        knowledge[field] = value;
      }
      saveKnowledge(repoRoot, knowledge);
      return "ok";
    }
    case "remember":
      session.notes.push(args.join(" ").trim());
      return "ok";
    case "trace": {
      const toggle = String(args[0] || "").toLowerCase();
      if (["on", "true", "1", "enable"].includes(toggle)) {
        traceEnabled = true;
        return "trace enabled";
      }
      if (["off", "false", "0", "disable"].includes(toggle)) {
        traceEnabled = false;
        return "trace disabled";
      }
      return `trace is ${traceEnabled ? "on" : "off"}`;
    }
    case "demo":
      if (notify) notify("Running demo flow");
      await runDemoFlow();
      return "ok";
    case "cancel":
    case "stop":
      cancelRequested = true;
      if (notify) notify("Cancel requested");
      return "cancelled";
    case "exit":
    case "quit":
      await shutdown();
      return "bye";
    default:
      return `Unknown command: ${command}`;
  }
}

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return rl.prompt();
  const [cmd, ...args] = parseArgs(trimmed);
  try {
    const result = await handleCommand(cmd, args);
    if (result && cmd.toLowerCase() === "help") {
      console.log(result);
    } else if (result && result !== "ok") {
      console.log(result);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
  rl.prompt();
});

rl.on("SIGINT", async () => {
  await shutdown();
});

await init();
