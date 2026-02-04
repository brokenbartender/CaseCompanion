import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PS_BRIDGE_PORT || 8791);
const HOST = process.env.PS_BRIDGE_HOST || "127.0.0.1";
const POWERSHELL = process.env.PS_BIN || "C:\\\\WINDOWS\\\\System32\\\\WindowsPowerShell\\\\v1.0\\\\powershell.exe";

const jobs = new Map();

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(payload));
}

function startJob(command) {
  const id = randomUUID();
  const child = spawn(POWERSHELL, ["-NoProfile", "-Command", command], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  jobs.set(id, { child, buffer: [], done: false });
  child.stdout.on("data", (chunk) => jobs.get(id)?.buffer.push(chunk.toString()));
  child.stderr.on("data", (chunk) => jobs.get(id)?.buffer.push(chunk.toString()));
  child.on("close", (code) => {
    const job = jobs.get(id);
    if (job) {
      job.buffer.push(`\n[exit ${code}]\n`);
      job.done = true;
    }
  });
  return id;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/ps/start") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const command = String(payload.command || "").trim();
        if (!command) return json(res, 400, { error: "Command required" });
        const id = startJob(command);
        json(res, 200, { id });
      } catch (err) {
        json(res, 500, { error: String(err?.message || err) });
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/ps/cancel") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const id = String(payload.id || "").trim();
        const job = jobs.get(id);
        if (!job) return json(res, 404, { error: "Not found" });
        job.child.kill();
        job.done = true;
        json(res, 200, { ok: true });
      } catch (err) {
        json(res, 500, { error: String(err?.message || err) });
      }
    });
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/ps/stream")) {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const id = url.searchParams.get("id") || "";
    const job = jobs.get(id);
    if (!job) return json(res, 404, { error: "Not found" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const flush = () => {
      const current = jobs.get(id);
      if (!current) {
        res.end();
        return;
      }
      while (current.buffer.length) {
        const line = current.buffer.shift();
        res.write(`data: ${JSON.stringify(line)}\n\n`);
      }
      if (current.done) {
        res.write(`event: done\ndata: "done"\n\n`);
        res.end();
        jobs.delete(id);
      }
    };

    const interval = setInterval(flush, 250);
    req.on("close", () => clearInterval(interval));
    flush();
    return;
  }

  json(res, 404, { error: "Not Found" });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`PowerShell bridge listening on http://${HOST}:${PORT}\n`);
});
