import type { ToolDefinition, ToolRisk } from "./toolTypes.js";

const SAFE_COMMANDS = [
  "ls",
  "dir",
  "rg",
  "cat",
  "type",
  "git status",
  "git diff",
  "node -v",
  "npm -v"
];

const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i,
  /\bdel\b/i,
  /\bformat\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\breg\s+(add|delete)\b/i,
  /\bdiskpart\b/i,
  /\bchkdsk\b/i,
  /\bcleanmgr\b/i
];

function hasShellChaining(command: string) {
  return /[;&|><]/.test(command);
}

export function isSafeCommand(command: string) {
  const trimmed = command.trim().toLowerCase();
  if (!trimmed) return false;
  if (hasShellChaining(trimmed)) return false;
  if (DESTRUCTIVE_PATTERNS.some((re) => re.test(trimmed))) return false;
  return SAFE_COMMANDS.some((allowed) => trimmed.startsWith(allowed));
}

function getAutonomyLevel() {
  const raw = String(process.env.AGENT_AUTONOMY_LEVEL || "semi").toLowerCase();
  if (raw === "supervised" || raw === "autonomous") return raw;
  return "semi";
}

export function assessToolCall(tool: ToolDefinition, args: Record<string, any>) {
  let risk: ToolRisk = tool.risk;
  let requiresApproval = risk === "high" || risk === "critical";
  let reason = "";
  const autonomy = getAutonomyLevel();

  if (tool.name === "run_command") {
    const command = String(args?.command || "");
    if (!command) {
      risk = "medium";
      requiresApproval = false;
    } else if (isSafeCommand(command)) {
      risk = "medium";
      requiresApproval = false;
    } else {
      risk = "high";
      requiresApproval = true;
      reason = "Command requires approval due to potential system impact.";
    }
  }

  if (tool.name === "write_file" || tool.name === "delete_file") {
    risk = "high";
    requiresApproval = true;
    reason = "File mutation requires approval.";
  }

  if (autonomy === "supervised") {
    requiresApproval = true;
    reason = reason || "Supervised autonomy requires approval.";
  } else if (autonomy === "autonomous" && risk === "medium") {
    requiresApproval = false;
  }

  return { risk, requiresApproval, reason };
}
