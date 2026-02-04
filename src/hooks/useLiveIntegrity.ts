import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { getApiBase } from "../services/apiBase";

export interface IntegrityEvent {
  id: string;
  action: string;
  actor: string;
  hash: string;
  timestamp: string;
  status: "VERIFIED" | "TAMPERED";
}

const DEFAULT_POLL_MS = 5000;

const toIntegrityEvent = (ev: any): IntegrityEvent => {
  let payload: any = {};
  try {
    payload = JSON.parse(ev?.payloadJson || "{}");
  } catch {
    payload = {};
  }
  const action = String(ev?.eventType || "AUDIT_EVENT");
  const actor = String(ev?.actorId || payload?.actorId || "system");
  const hash = String(
    ev?.hash ||
      payload?.hash ||
      payload?.integrityHash ||
      payload?.currentHash ||
      "pending"
  );
  const timestamp = ev?.createdAt ? new Date(ev.createdAt).toISOString() : new Date().toISOString();
  const status = action.includes("REVOKED") || payload?.verificationStatus === "REVOKED"
    ? "TAMPERED"
    : "VERIFIED";

  return {
    id: String(ev?.id || `${action}-${timestamp}`),
    action,
    actor,
    hash,
    timestamp,
    status
  };
};

export function useLiveIntegrity(workspaceId?: string, pollMs = DEFAULT_POLL_MS) {
  const [events, setEvents] = useState<IntegrityEvent[]>([]);
  const [systemHealth, setSystemHealth] = useState<"SECURE_LEDGER_ACTIVE" | "CONNECTION_LOST" | "CALCULATING">("CALCULATING");
  const [lastError, setLastError] = useState<string | null>(null);

  const canPoll = useMemo(() => Boolean(workspaceId), [workspaceId]);

  const refresh = async () => {
    if (!workspaceId) return;
    try {
      const logs = await api.get(`/workspaces/${workspaceId}/audit/recent?take=6`);
      const nextEvents = Array.isArray(logs) ? logs.map(toIntegrityEvent) : [];
      setEvents(nextEvents);
      setSystemHealth("SECURE_LEDGER_ACTIVE");
      setLastError(null);
    } catch (err: any) {
      setSystemHealth("CONNECTION_LOST");
      setLastError(err?.message || "Audit feed unavailable");
    }
  };

  useEffect(() => {
    if (!canPoll) return;
    let active = true;
    let interval: number | undefined;
    let source: EventSource | null = null;

    const startPolling = () => {
      const tick = async () => {
        if (!active) return;
        await refresh();
      };
      void tick();
      interval = window.setInterval(tick, pollMs);
    };

    if (typeof window !== "undefined" && "EventSource" in window) {
      source = new EventSource(
        `${getApiBase()}/workspaces/${workspaceId}/audit/stream`,
        { withCredentials: true }
      );
      source.addEventListener("audit", (event: MessageEvent) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data || "[]");
          const nextEvents = Array.isArray(data) ? data.map(toIntegrityEvent) : [];
          setEvents(nextEvents);
          setSystemHealth("SECURE_LEDGER_ACTIVE");
          setLastError(null);
        } catch (err: any) {
          setLastError(err?.message || "Audit stream parse failed");
        }
      });
      source.onerror = () => {
        setSystemHealth("CONNECTION_LOST");
        setLastError("Audit stream disconnected");
        source?.close();
        source = null;
        startPolling();
      };
    } else {
      startPolling();
    }

    return () => {
      active = false;
      if (source) source.close();
      if (interval) window.clearInterval(interval);
    };
  }, [canPoll, pollMs, workspaceId]);

  return { events, systemHealth, lastError, refresh };
}
