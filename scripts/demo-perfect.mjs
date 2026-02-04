import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "server", ".env");

const DEMO_FIXED_TIMESTAMP = process.env.DEMO_FIXED_TIMESTAMP || "2026-01-01T00:00:00.000Z";
const WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || "lexis-workspace-01";
const MATTER_ID = process.env.DEMO_MATTER_ID || "lexis-matter-01";
const WITHHELD_MATTER_ID = process.env.DEMO_WITHHELD_MATTER_ID || "lexis-matter-withheld";

let demoEmail = "demo@lexipro.local";
let demoPassword = "LexiPro!234";
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=");
    if (key === "SEED_DEMO_EMAIL" && value) demoEmail = value.trim();
    if (key === "SEED_DEMO_PASSWORD" && value) demoPassword = value.trim();
  }
}

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
  });

const runSeed = () => {
  const result = spawnSync("npm", ["run", "demo:reset"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      DEMO_FIXED_TIMESTAMP
    }
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const writeJson = (filePath, payload) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { res, json };
};

const printChecklist = (extra = []) => {
  console.log("");
  console.log("M&A Green Run demo checklist:");
  console.log("- URL: http://127.0.0.1:5173");
  console.log(`- Credentials: ${demoEmail} / ${demoPassword}`);
  console.log("- Teleport: Assistant -> Draft -> Run Review -> click [MA-Green-Run-Police-Report.pdf, p.1]");
  console.log("- Withheld: select MA-Green-Run-Private-Image.png -> prompt: DEMO_WITHHELD: unanchored request");
  console.log("- Anchored prompt (optional): DEMO_TELEPORT: Green Run liability cap");
  console.log("- Export: Command Center -> Generate Court-Ready Packet");
  if (extra.length) {
    for (const line of extra) console.log(line);
  }
  console.log("");
};

runSeed();

const backendUp = await isPortOpen(8787);
const frontendUp = await isPortOpen(5173);

if (!backendUp || !frontendUp) {
  console.log("Demo services are not fully running.");
  console.log("Start with these two terminals:");
  console.log("Terminal A:");
  console.log(`  DEMO_FIXED_TIMESTAMP=\"${DEMO_FIXED_TIMESTAMP}\" DEMO_PERFECT=1 npm --prefix server run start`);
  console.log("Terminal B:");
  console.log("  npm run dev:client -- --host 127.0.0.1 --port 5173 --strictPort");
  printChecklist();
  process.exit(0);
}

const loginUrl = "http://127.0.0.1:8787/api/auth/login";
const { res: loginRes, json: loginJson } = await fetchJson(loginUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: demoEmail, password: demoPassword })
});

if (!loginRes.ok || !loginJson?.token) {
  console.error("Login failed:", loginRes.status, loginJson);
  printChecklist(["- Login failed; please verify credentials and backend."]);
  process.exit(1);
}

const token = loginJson.token;
const csrfToken = `csrf-${Date.now()}`;
const cookie = `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
const headers = {
  "Content-Type": "application/json",
  "x-csrf-token": csrfToken,
  "x-workspace-id": WORKSPACE_ID,
  Authorization: `Bearer ${token}`,
  Cookie: cookie
};

const reportsDir = path.join(root, "reports", "demo-perfect");
fs.mkdirSync(reportsDir, { recursive: true });

const anchoredPrompt = "DEMO_TELEPORT: Green Run liability cap";
const anchored = await fetchJson("http://127.0.0.1:8787/api/ai/chat", {
  method: "POST",
  headers,
  body: JSON.stringify({
    userPrompt: anchoredPrompt,
    promptKey: "forensic_synthesis",
    workspaceId: WORKSPACE_ID,
    matterId: MATTER_ID
  })
});
writeJson(path.join(reportsDir, "anchored_response.json"), anchored.json);

const withheldPrompt = "DEMO_WITHHELD: unanchored request";
const withheld = await fetchJson("http://127.0.0.1:8787/api/ai/chat", {
  method: "POST",
  headers,
  body: JSON.stringify({
    userPrompt: withheldPrompt,
    promptKey: "forensic_synthesis",
    workspaceId: WORKSPACE_ID,
    matterId: WITHHELD_MATTER_ID
  })
});
writeJson(path.join(reportsDir, "withheld_response.json"), withheld.json);

const packetRes = await fetch(`http://127.0.0.1:8787/api/workspaces/${WORKSPACE_ID}/matters/${MATTER_ID}/proof-packet`, {
  method: "GET",
  headers: {
    "x-workspace-id": WORKSPACE_ID,
    Authorization: `Bearer ${token}`,
    Cookie: cookie
  }
});

if (packetRes.ok) {
  const buffer = Buffer.from(await packetRes.arrayBuffer());
  const packetPath = path.join(reportsDir, `matter_${MATTER_ID}_proof_packet.zip`);
  fs.writeFileSync(packetPath, buffer);
  printChecklist([
    `- Proof packet saved: ${packetPath}`,
    "- Offline verify: unzip, then run `node verify.js` inside the packet"
  ]);
} else {
  printChecklist([
    `- Proof packet export failed (${packetRes.status}). Use UI export button instead.`
  ]);
}
