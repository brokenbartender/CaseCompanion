import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

type GovernanceSnapshot = {
  workspaceId: string;
  updatedAt: string;
  ledgerEvents?: any[];
  releaseGate?: {
    policy?: string;
    enforced?: boolean;
    recentDecisions?: Array<{
      id: string;
      eventType: string;
      status: "PROVEN" | "WITHHELD";
      createdAt: string;
      promptKey?: string;
      anchoredCount?: number;
      unanchoredCount?: number;
      totalClaims?: number;
      durationMs?: number | null;
      reasons?: string[];
    }>;
  };
  proven?: { count?: number; note?: string };
  withheld?: { count?: number; note?: string; reasons?: Record<string, number> };
  integrityOnRead?: { lastCheckAt?: string | null; lastResult?: string | null };
  auditLogging?: { enabled?: boolean; lastEventAt?: string | null };
  anchorCoverage?: {
    anchorsAvailable?: number | null;
    anchorsUsed?: number | null;
    percent?: number | null;
    note?: string;
  };
  proof?: {
    guardrails?: any;
    proofOfLife?: any;
    auditRecent?: any;
    integritySample?: any;
  };
  notes?: Record<string, string | undefined>;
};

type LedgerEvent = {
  id: string;
  eventType: string;
  createdAt: string | null;
  hash?: string | null;
  exhibitId?: string | null;
  batesNumber?: string | null;
  integrityHash?: string | null;
  recordedHash?: string | null;
  currentHash?: string | null;
};

type IntegrityStatus = "OK" | "COMPROMISED" | "ERROR" | "UNKNOWN";

const normalizeLedgerEvents = (raw?: any[]): LedgerEvent[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((ev) => {
    let payload: any = {};
    try {
      payload = JSON.parse(ev?.payloadJson || "{}");
    } catch {
      payload = {};
    }
    const createdAtRaw = ev?.createdAt ? new Date(ev.createdAt) : null;
    const createdAt = createdAtRaw && !Number.isNaN(createdAtRaw.getTime())
      ? createdAtRaw.toISOString()
      : null;
    const eventType = String(ev?.eventType || "AUDIT_EVENT");
    const fallbackId = `${eventType}-${createdAt || "unknown"}`;
    return {
      id: String(ev?.id || ev?.hash || fallbackId),
      eventType,
      createdAt,
      hash: ev?.hash ? String(ev.hash) : null,
      exhibitId: payload?.exhibitId ? String(payload.exhibitId) : null,
      batesNumber: payload?.batesNumber || payload?.bates || null,
      integrityHash: payload?.integrityHash || null,
      recordedHash: payload?.recordedHash || null,
      currentHash: payload?.currentHash || null
    };
  });
};

export function useGovernanceSnapshot(workspaceId?: string) {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus>("UNKNOWN");
  const timerRef = useRef<number | null>(null);
  const visibleRef = useRef<boolean>(true);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchSnapshot = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const [snapshotResult, integrityResult] = await Promise.allSettled([
      api.get(`/workspaces/${workspaceId}/governance/snapshot?ts=${Date.now()}`),
      api.get(`/integrity/status?ts=${Date.now()}`)
    ]);
    if (snapshotResult.status === "fulfilled") {
      setSnapshot(snapshotResult.value);
      const rawEvents = snapshotResult.value?.ledgerEvents || snapshotResult.value?.proof?.auditRecent;
      setEvents(normalizeLedgerEvents(rawEvents));
    } else {
      setError(snapshotResult.reason?.message || "Snapshot fetch failed");
    }
    if (integrityResult.status === "fulfilled") {
      setIntegrityStatus(integrityResult.value?.status || "UNKNOWN");
    } else {
      setIntegrityStatus("ERROR");
    }
    setLoading(false);
  };

  const schedulePoll = () => {
    clearTimer();
    if (!visibleRef.current) return;
    timerRef.current = window.setTimeout(async () => {
      await fetchSnapshot();
      schedulePoll();
    }, 20000);
  };

  useEffect(() => {
    if (!workspaceId) return;
    visibleRef.current = document.visibilityState !== "hidden";

    const onVisibility = () => {
      visibleRef.current = document.visibilityState !== "hidden";
      if (visibleRef.current) {
        void fetchSnapshot();
        schedulePoll();
      } else {
        clearTimer();
      }
    };

    void fetchSnapshot();
    schedulePoll();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
      }, [workspaceId]);

  return {
    snapshot,
    error,
    loading,
    events,
    integrityStatus,
    refresh: fetchSnapshot
  };
}
