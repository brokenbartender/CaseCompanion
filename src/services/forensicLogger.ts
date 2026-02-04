import { getCsrfHeader } from "./csrf";
import { getWorkspaceId } from "./authStorage";
import { getApiBase } from "./apiBase";

type LogLevel = "INFO" | "WARN" | "ERROR";

export async function logForensicEvent(action: string, details: Record<string, any>, level: LogLevel = "INFO") {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers["x-workspace-id"] = workspaceId;
  Object.assign(headers, getCsrfHeader());

  try {
    await fetch(`${getApiBase()}/audit/log`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        action,
        resourceId: details?.resourceId,
        details: {
          level,
          ...details
        }
      })
    });
  } catch {
    // No console output: ledger logging is best-effort.
  }
}
