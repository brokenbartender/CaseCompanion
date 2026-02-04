import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import WebSocket from "ws";

const DEFAULT_WS = "ws://localhost:8789";

const defaultSequence = [
  { command: "goto", args: ["http://localhost:3001/login"] },
  { command: "wait", args: ["1500"] },
  { command: "screenshot", args: ["login"] },
  { command: "type", args: ["[data-testid='login-email']", "demo@lexipro.local"] },
  { command: "type", args: ["[data-testid='login-password']", "LexiPro!234"] },
  { command: "click", args: ["[data-testid='login-submit']"] },
  { command: "wait", args: ["2000"] },
  { command: "screenshot", args: ["post-login"] },
  { command: "buttons", args: [] }
];

function loadSequence(arg) {
  if (!arg) return defaultSequence;
  const filePath = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Sequence file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Sequence file must be a JSON array of commands.");
  }
  return parsed;
}

const wsUrl = process.env.QA_AGENT_WS || DEFAULT_WS;
const sequenceFile = process.argv[2];
const sequence = loadSequence(sequenceFile);

const ws = new WebSocket(wsUrl);
let index = 0;
let inflight = false;

function sendNext() {
  if (inflight) return;
  if (index >= sequence.length) {
    ws.close();
    return;
  }
  const cmd = sequence[index++];
  inflight = true;
  ws.send(JSON.stringify(cmd));
}

ws.on("open", () => {
  process.stdout.write(`WS connected: ${wsUrl}\n`);
  sendNext();
});

ws.on("message", (data) => {
  const msg = data.toString();
  process.stdout.write(`${msg}\n`);
  inflight = false;
  setTimeout(sendNext, 50);
});

ws.on("error", (err) => {
  process.stderr.write(`WS error: ${err.message}\n`);
  process.exit(1);
});

ws.on("close", () => {
  process.stdout.write("WS closed\n");
});
