import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 8790;
const WORKSPACE_ROOT = process.cwd();

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { tool, params } = JSON.parse(body);

        if (tool === "exec") {
          console.log(`[EXEC] ${params.command}`);
          const proc = spawn(params.command, { shell: true, cwd: WORKSPACE_ROOT });
          let stdout = "";
          let stderr = "";
          proc.stdout.on("data", (d) => (stdout += d));
          proc.stderr.on("data", (d) => (stderr += d));
          proc.on("close", (code) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ stdout, stderr, code }));
          });
          return;
        }

        if (tool === "read_file") {
          const target = path.resolve(WORKSPACE_ROOT, params.path);
          if (!target.startsWith(WORKSPACE_ROOT)) throw new Error("Access Denied");
          const content = fs.readFileSync(target, "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ content }));
          return;
        }

        if (tool === "write_file") {
          const target = path.resolve(WORKSPACE_ROOT, params.path);
          if (!target.startsWith(WORKSPACE_ROOT)) throw new Error("Access Denied");
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, params.content);
          console.log(`[WRITE] ${params.path}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        res.writeHead(400);
        res.end(JSON.stringify({ error: "Unknown tool" }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`⚡ CODEX BRIDGE (GOD MODE) RUNNING ON PORT ${PORT}`);
});
