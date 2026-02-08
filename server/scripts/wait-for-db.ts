import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

let host = "localhost";
let port = 5432;

try {
  const parsed = new URL(url);
  if (parsed.hostname) host = parsed.hostname;
  if (parsed.port) port = Number(parsed.port);
} catch (err) {
  console.error("Invalid DATABASE_URL:", err);
  process.exit(1);
}

const timeoutMs = 30_000;
const intervalMs = 1_000;
const startedAt = Date.now();

function tryConnect(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 3000 }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForDb() {
  while (Date.now() - startedAt < timeoutMs) {
    const ok = await tryConnect();
    if (ok) {
      console.log(`DB reachable at ${host}:${port}`);
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.error(`DB not reachable at ${host}:${port} within ${timeoutMs}ms`);
  process.exit(1);
}

waitForDb();
