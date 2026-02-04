import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { prisma } from "../lib/prisma.js";

const BRIDGE_URL = "http://127.0.0.1:8790";
const ALLOWED_SHELL_PREFIXES = ["npm", "npx", "git", "docker"];

function isAllowedShell(command: string) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return ALLOWED_SHELL_PREFIXES.some((prefix) => lower.startsWith(prefix + " ") || lower === prefix);
}

async function callBridge(tool: string, params: any) {
  try {
    const res = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, params })
    });
    return await res.json();
  } catch {
    return { error: "Bridge offline. Run 'node tools/codex-bridge/server.mjs' first." };
  }
}

export const builderTools: FunctionDeclaration[] = [
  {
    name: "shell_exec",
    description: "Run a terminal command (npm, npx, git, docker only).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { command: { type: SchemaType.STRING } },
      required: ["command"]
    }
  },
  {
    name: "run_sql",
    description: "Run a read-only SQL query against Prisma (SELECT only).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { query: { type: SchemaType.STRING } },
      required: ["query"]
    }
  },
  {
    name: "read_source",
    description: "Read a file's content. ALWAYS read before editing.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { path: { type: SchemaType.STRING } },
      required: ["path"]
    }
  },
  {
    name: "rewrite_code",
    description: "Overwrite a file with new code. This is destructive/permanent.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: { type: SchemaType.STRING },
        content: { type: SchemaType.STRING }
      },
      required: ["path", "content"]
    }
  }
];

export async function executeBuilderTool(name: string, args: any) {
  if (name === "shell_exec") {
    const cmd = String(args?.command || "");
    if (!isAllowedShell(cmd)) {
      return { error: "Command not allowed. Only npm, npx, git, docker are permitted." };
    }
    return await callBridge("exec", args);
  }
  if (name === "run_sql") {
    const query = String(args?.query || "").trim();
    if (!query) return { error: "Query required." };
    if (!/^select\b/i.test(query)) {
      return { error: "Only SELECT queries are allowed." };
    }
    try {
      const rows = await prisma.$queryRawUnsafe(query);
      return { rows };
    } catch (err: any) {
      return { error: err?.message || "SQL error" };
    }
  }
  if (name === "read_source") return await callBridge("read_file", args);
  if (name === "rewrite_code") return await callBridge("write_file", args);
  return { error: "Unknown tool" };
}
