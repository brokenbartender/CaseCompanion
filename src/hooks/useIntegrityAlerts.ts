import { useEffect, useMemo, useState } from "react";
import { getWorkspaceId } from "../services/authStorage";
import { getApiBase } from "../services/apiBase";

export type IntegrityAlert = {
  type: string;
  exhibitId?: string;
  filename?: string;
  reason?: string;
  recordedHash?: string;
  actualHash?: string;
  message: string;
  timestamp: string;
};

export function useIntegrityAlerts() {
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const [alert, setAlert] = useState<IntegrityAlert | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const source = new EventSource(
      `${getApiBase()}/workspaces/${workspaceId}/integrity/alerts/stream`,
      { withCredentials: true }
    );
    source.onmessage = (event) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);
        const message = payload?.message || "CRITICAL ALERT: DETERMINISTIC_HEARTBEAT_DESYNC";
        setAlert({
          type: payload?.type || "SYSTEM_INTEGRITY_BREACH",
          exhibitId: payload?.exhibitId,
          filename: payload?.filename,
          reason: payload?.reason,
          recordedHash: payload?.recordedHash,
          actualHash: payload?.actualHash,
          message,
          timestamp: payload?.timestamp || new Date().toISOString()
        });
      } catch {
        setAlert({
          type: "SYSTEM_INTEGRITY_BREACH",
          message: "CRITICAL ALERT: DETERMINISTIC_HEARTBEAT_DESYNC",
          timestamp: new Date().toISOString()
        });
      }
    };
    return () => {
      source.close();
    };
  }, [workspaceId]);

  const clear = () => setAlert(null);

  return { alert, clear };
}
