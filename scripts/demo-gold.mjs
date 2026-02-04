import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

process.env.DEMO_MODE = "1";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf-8", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    process.stdout.write(result.stdout || "");
    process.exit(result.status ?? 1);
  }
  return String(result.stdout || "");
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = net.createConnection({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`));
          return;
        }
        setTimeout(check, 1000);
      });
    };
    check();
  });
}

function getLatestPacketDir(rootDir) {
  if (!fs.existsSync(rootDir)) return "";
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const full = path.join(rootDir, entry.name);
      const stat = fs.statSync(full);
      return { path: full, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries[0]?.path || "";
}

async function main() {
  run("npm", ["run", "demo:reset"]);
  const demoUp = spawn("npm", ["run", "demo:up", "--", "--skip-reset"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  demoUp.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });

  try {
    await waitForPort(8787, 60000);
    await waitForPort(5173, 60000);
  } catch (err) {
    demoUp.kill("SIGINT");
    throw err;
  }
  await sleep(3000);
  process.env.PROOF_PACKET_SKIP_TESTS = "1";
  runCapture("npm", ["--prefix", "server", "run", "proof:packet"]);
  const packetRoot = path.resolve("server", "reports", "proof_packet");
  const fallbackRoot = path.resolve("reports", "proof_packet");
  const packetDir = getLatestPacketDir(packetRoot) || getLatestPacketDir(fallbackRoot);
  if (!packetDir) {
    console.error("Proof packet directory not found after generation.");
    process.exit(1);
  }
  runNode(["scripts/verify-proof-packet.mjs", packetDir]);
  demoUp.kill("SIGINT");
}

main();
