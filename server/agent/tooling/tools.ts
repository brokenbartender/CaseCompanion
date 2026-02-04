import fs from "fs/promises";
import path from "path";
import { spawn } from "node:child_process";
import { safeResolve } from "../../pathUtils.js";
import type { ToolDefinition, ToolResult } from "./toolTypes.js";

const MAX_OUTPUT_CHARS = 12000;
const MAX_READ_BYTES = 200_000;

function truncateOutput(text: string): ToolResult {
  if (text.length <= MAX_OUTPUT_CHARS) {
    return { ok: true, output: text };
  }
  return {
    ok: true,
    output: text.slice(0, MAX_OUTPUT_CHARS) + "\n...<truncated>",
    truncated: true
  };
}

async function listDirHandler(args: Record<string, any>, ctx: any) {
  const dir = String(args?.path || ".");
  const resolved = safeResolve(ctx.repoRoot, dir);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const items = entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "dir" : "file"
  }));
  return truncateOutput(JSON.stringify({ path: dir, entries: items }, null, 2));
}

async function readFileHandler(args: Record<string, any>, ctx: any) {
  const target = String(args?.path || "");
  if (!target) return { ok: false, output: "path is required" };
  const resolved = safeResolve(ctx.repoRoot, target);
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) return { ok: false, output: "path is not a file" };
  const buffer = await fs.readFile(resolved);
  const sliced = buffer.length > MAX_READ_BYTES ? buffer.slice(0, MAX_READ_BYTES) : buffer;
  const text = sliced.toString("utf-8");
  return {
    ok: true,
    output: text + (buffer.length > MAX_READ_BYTES ? "\n...<truncated>" : ""),
    truncated: buffer.length > MAX_READ_BYTES
  };
}

async function writeFileHandler(args: Record<string, any>, ctx: any) {
  const target = String(args?.path || "");
  const content = String(args?.content ?? "");
  if (!target) return { ok: false, output: "path is required" };
  if (ctx.dryRun) {
    return { ok: true, output: `dry-run: write ${target} (${content.length} chars)` };
  }
  const resolved = safeResolve(ctx.repoRoot, target);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
  return { ok: true, output: `wrote ${target} (${content.length} chars)` };
}

async function deleteFileHandler(args: Record<string, any>, ctx: any) {
  const target = String(args?.path || "");
  if (!target) return { ok: false, output: "path is required" };
  if (ctx.dryRun) {
    return { ok: true, output: `dry-run: delete ${target}` };
  }
  const resolved = safeResolve(ctx.repoRoot, target);
  await fs.unlink(resolved);
  return { ok: true, output: `deleted ${target}` };
}

function runCommand(command: string, cwd: string, timeoutMs: number): Promise<ToolResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, cwd });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: `command timed out after ${timeoutMs}ms` });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      const combined = stdout + (stderr ? `\n${stderr}` : "");
      const result = truncateOutput(combined || "");
      result.ok = code === 0;
      result.data = { exitCode: code };
      resolve(result);
    });
  });
}

async function runCommandHandler(args: Record<string, any>, ctx: any) {
  const command = String(args?.command || "").trim();
  const timeoutMs = Number.isFinite(args?.timeoutMs) ? Number(args.timeoutMs) : 30_000;
  if (!command) return { ok: false, output: "command is required" };
  if (ctx.dryRun) {
    return { ok: true, output: `dry-run: ${command}` };
  }
  return runCommand(command, ctx.repoRoot, timeoutMs);
}

async function respondHandler(args: Record<string, any>) {
  const text = String(args?.text || "").trim();
  return { ok: true, output: text || "No response provided." };
}

async function rememberHandler(args: Record<string, any>, ctx: any) {
  const note = String(args?.note || "").trim();
  if (!note) return { ok: false, output: "note is required" };
  await ctx.remember(note);
  return { ok: true, output: `remembered: ${note}` };
}

export const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    name: "respond",
    description: "Return a user-facing response without executing any action.",
    risk: "low",
    argsSchema: "{ text: string }",
    handler: respondHandler
  },
  {
    name: "remember",
    description: "Store a memory note for future tasks.",
    risk: "low",
    argsSchema: "{ note: string }",
    handler: rememberHandler
  },
  {
    name: "list_dir",
    description: "List files in a directory under the workspace root.",
    risk: "low",
    argsSchema: "{ path: string }",
    handler: listDirHandler
  },
  {
    name: "read_file",
    description: "Read a text file under the workspace root.",
    risk: "low",
    argsSchema: "{ path: string }",
    handler: readFileHandler
  },
  {
    name: "write_file",
    description: "Write a text file under the workspace root.",
    risk: "high",
    argsSchema: "{ path: string, content: string }",
    handler: writeFileHandler
  },
  {
    name: "delete_file",
    description: "Delete a file under the workspace root.",
    risk: "high",
    argsSchema: "{ path: string }",
    handler: deleteFileHandler
  },
  {
    name: "run_command",
    description: "Run a shell command from the workspace root.",
    risk: "high",
    argsSchema: "{ command: string, timeoutMs?: number }",
    handler: runCommandHandler
  }
];
