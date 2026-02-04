import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

type AiStatus = {
  preferredProvider: string;
  activeProvider: string;
  mode: string;
  health: "OK" | "DEGRADED" | "OFFLINE";
  models: { primary: string; audit: string };
  audit: { enabled: boolean; provider: string; model: string };
  lastFailover: null | { at: string; reason: string; from: string; to: string; promptKey?: string };
  fix: string | null;
  timestamps: {
    lastApiSuccessAt: number | null;
    lastApiFailureAt: number | null;
    lastOllamaSuccessAt: number | null;
    lastOllamaFailureAt: number | null;
  };
};

export function useAiStatus(enabled: boolean) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const visibleRef = useRef<boolean>(true);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchStatus = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await api.get("/ai/status");
      setStatus(data as AiStatus);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "AI status unavailable");
    } finally {
      setLoading(false);
    }
  };

  const schedulePoll = () => {
    clearTimer();
    if (!visibleRef.current || !enabled) return;
    timerRef.current = window.setTimeout(async () => {
      await fetchStatus();
      schedulePoll();
    }, 8000);
  };

  useEffect(() => {
    if (!enabled) return;
    visibleRef.current = document.visibilityState !== "hidden";
    const onVisibility = () => {
      visibleRef.current = document.visibilityState !== "hidden";
      if (visibleRef.current) {
        void fetchStatus();
        schedulePoll();
      } else {
        clearTimer();
      }
    };
    void fetchStatus();
    schedulePoll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
  }, [enabled]);

  return { status, error, loading, refresh: fetchStatus };
}
