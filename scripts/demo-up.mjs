import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import net from "node:net";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const skipReset = args.has("--skip-reset") || process.env.DEMO_SKIP_RESET === "1";

const envPath = path.join(root, "server", ".env");
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

const backendAlreadyUp = await isPortOpen(8787);
const frontendAlreadyUp = await isPortOpen(5173);

if (!backendAlreadyUp) {
  const dockerUp = spawnSync("docker-compose", ["up", "-d"], {
    cwd: root,
    stdio: "inherit",
    shell: true
  });

  if (dockerUp.status !== 0) {
    console.warn("Docker not detected or docker-compose failed -- continuing with local services.");
  }
} else {
  console.log("Backend already running on 8787 OK");
}

if (frontendAlreadyUp) {
  console.log("Frontend already running on 5173 OK");
}

if (backendAlreadyUp && frontendAlreadyUp) {
  console.log("All demo services already running OK");
}

if (!skipReset) {
const skipReset = process.argv.includes("--skip-reset") || process.env.DEMO_SKIP_RESET === "1";
if (!skipReset) {
  const reset = spawnSync("npm", ["run", "demo:reset"], {
    cwd: root,
    stdio: "inherit",
    shell: true
  });

  if (reset.status !== 0) {
    process.exit(reset.status ?? 1);
  }
}
} else {
  console.log("Skipping demo reset (requested).");
}

let demoPrivateKeyPem = process.env.DEMO_PRIVATE_KEY_PEM;
let demoPublicKeyPem = process.env.DEMO_PUBLIC_KEY_PEM;
if (!demoPrivateKeyPem || !demoPublicKeyPem) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  demoPrivateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  demoPublicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
}

const backend = backendAlreadyUp
  ? null
  : spawn("npm", ["run", "start"], {
      cwd: path.join(root, "server"),
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        PRIVATE_KEY_PEM: process.env.PRIVATE_KEY_PEM || demoPrivateKeyPem,
        PUBLIC_KEY_PEM: process.env.PUBLIC_KEY_PEM || demoPublicKeyPem
      }
    });

const frontend = frontendAlreadyUp
  ? null
  : spawn("npm", ["run", "dev:client", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
      cwd: root,
      stdio: "inherit",
      shell: true
    });

console.log("");
console.log("Demo up: http://127.0.0.1:5173");
console.log("Backend: http://127.0.0.1:8787/api/health");
console.log(`Demo creds: ${demoEmail} / ${demoPassword}`);
console.log("First clicks: 1) Login 2) Open Case Assistant 3) Click a citation to teleport highlight 4) Export proof");
console.log("");

const shutdown = (code = 0) => {
  backend?.kill("SIGINT");
  frontend?.kill("SIGINT");
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
backend?.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});
frontend?.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});
