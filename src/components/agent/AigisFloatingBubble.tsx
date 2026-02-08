import React, { useEffect, useMemo, useState } from "react";
import { Brain, X, Zap } from "lucide-react";
import ThoughtTrace, { type ThoughtTraceStep } from "./ThoughtTrace";
import { useIntegrityAlerts } from "../../hooks/useIntegrityAlerts";
import { useLiveIntegrity } from "../../hooks/useLiveIntegrity";
import { getAuthToken, getWorkspaceId } from "../../services/authStorage";
import { getApiBase } from "../../services/apiBase";
import { getCsrfHeader } from "../../services/csrf";
import { useLocation, useNavigate } from "react-router-dom";

export default function AigisFloatingBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const active = false;
  const narration = "";
  const trace: ThoughtTraceStep[] = [];
  const { alert, clear } = useIntegrityAlerts();
  const breachActive = Boolean(alert);
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const authToken = useMemo(() => getAuthToken(), []);
  const liveIntegrity = useLiveIntegrity(workspaceId);
  const lastHeartbeat = liveIntegrity.events.find((event) => event.action === "DEH_HEARTBEAT");
  const ledgerStatus = breachActive
    ? "BREACH"
    : liveIntegrity.systemHealth === "SECURE_LEDGER_ACTIVE"
      ? "VERIFIED"
      : "CHECKING";
  const heartbeatPulse = Boolean(lastHeartbeat) && !breachActive;
  const [diagnosticMode, setDiagnosticMode] = useState(
    typeof window !== "undefined" && sessionStorage.getItem("lexipro_diag_mode") === "1"
  );
  const [hapticOn, setHapticOn] = useState(
    typeof window !== "undefined" && sessionStorage.getItem("lexipro_haptic") === "1"
  );
  const [pulseTick, setPulseTick] = useState(false);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [bubbleResponse, setBubbleResponse] = useState<string | null>(null);
  const [bubbleError, setBubbleError] = useState<string | null>(null);

  useEffect(() => {
    const sync = (event?: Event) => {
      if (event && "detail" in event) {
        const detail = (event as CustomEvent).detail;
        if (detail && typeof detail.enabled === "boolean") {
          setDiagnosticMode(detail.enabled);
          return;
        }
      }
      setDiagnosticMode(sessionStorage.getItem("lexipro_diag_mode") === "1");
    };
    window.addEventListener("lexipro:diag-mode", sync as EventListener);
    return () => window.removeEventListener("lexipro:diag-mode", sync as EventListener);
  }, []);

  useEffect(() => {
    const onLog = (event: Event) => {
      if (!diagnosticMode) return;
      const detail = (event as CustomEvent).detail as { line?: string } | undefined;
      const line = detail?.line;
      if (!line) return;
      setDiagnosticLog((prev) => [line, ...prev].slice(0, 6));
    };
    window.addEventListener("lexipro:diag-log", onLog as EventListener);
    return () => window.removeEventListener("lexipro:diag-log", onLog as EventListener);
  }, [diagnosticMode]);

  useEffect(() => {
    const timestamp = new Date().toISOString();
    const route = location.pathname || "/";
    if (!diagnosticMode) return;
    setDiagnosticLog((prev) => [
      `> [${timestamp}] CONTEXT_SCAN: ${route}`,
      ...prev
    ].slice(0, 6));
  }, [diagnosticMode, location.pathname]);

  useEffect(() => {
    if (!lastHeartbeat) return;
    setPulseTick(true);
    const timer = window.setTimeout(() => setPulseTick(false), 280);
    if (diagnosticMode) {
      setDiagnosticLog((prev) => [
        `> [${new Date().toISOString()}] HEARTBEAT_MATCH: ${lastHeartbeat.hash.slice(0, 10)}...`,
        ...prev
      ].slice(0, 6));
    }
    return () => window.clearTimeout(timer);
  }, [diagnosticMode, lastHeartbeat?.id]);

  const toggleHaptic = () => {
    const next = !hapticOn;
    setHapticOn(next);
    sessionStorage.setItem("lexipro_haptic", next ? "1" : "0");
  };

  const ingestStage = useMemo(() => {
    if (!liveIntegrity.events.length) return "IDLE";
    const hasEvent = (label: string) => liveIntegrity.events.some((event) => event.action === label);
    if (hasEvent("BATES_STAMPED")) return "COMPLETE";
    if (hasEvent("RULE_SCAN_COMPLETE")) return "STAMPING";
    if (hasEvent("HASH_SEALED")) return "SEALING";
    if (hasEvent("INGEST_STARTED") || hasEvent("EXHIBIT_UPLOAD")) return "INGESTING";
    return "IDLE";
  }, [liveIntegrity.events]);

  const statusNarration = useMemo(() => {
    switch (ingestStage) {
      case "INGESTING":
        return "Initializing bit-level sealing for LEX series. Anchoring entropy to local ledger nodes.";
      case "SEALING":
        return "Hash sealing in progress. The evidence hash is being locked before inference begins.";
      case "STAMPING":
        return "Rule 902(13)/(14) compliance verified. Bates anchors are being reserved.";
      case "COMPLETE":
        return "Tactical ingest complete. Ledger and Bates anchors are court-ready.";
      default:
        return null;
    }
  }, [ingestStage]);

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    if (!workspaceId) {
      setBubbleError("No workspace found. Sign in to enable Aigis chat.");
      return;
    }
    try {
      setSending(true);
      setBubbleError(null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...getCsrfHeader()
      };
      if (workspaceId) headers["x-workspace-id"] = workspaceId;
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${getApiBase()}/aigis/chat`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          query: prompt,
          mode: "GENERAL",
          matterId: null
        })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Aigis request failed.");
      }
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : await res.text();
      const response = typeof data === "string"
        ? data
        : data?.report || data?.response || data?.answer || JSON.stringify(data);
      setBubbleResponse(response || "No response.");
      setPrompt("");
    } catch (err: any) {
      setBubbleError(err?.message || "Aigis request failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen ? (
        <div className={`aigis-liquid-border ${pulseTick && hapticOn ? "haptic-pulse" : ""}`}>
          <div className={`w-96 rounded-3xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 aigis-liquid-surface ${
            breachActive ? "border-red-500/40 bg-red-950/90" : diagnosticMode ? "border-emerald-500/40 bg-black/95 font-mono" : "border-white/10 bg-slate-950/95"
          }`}>
          <header className="flex items-center justify-between border-b border-white/5 p-4 bg-indigo-500/5 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                breachActive
                  ? "bg-red-500/20 text-red-300"
                  : diagnosticMode
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-indigo-500/20 text-indigo-400"
              }`}>
                <Brain size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-widest">Aigis Sentinel</div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                  <span>{breachActive ? "BREACH_LOCKDOWN" : "DETERMINISTIC_ACTIVE"}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    breachActive ? "bg-red-400" : lastHeartbeat ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                  }`} />
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-white transition-colors"
              type="button"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-4 h-80 overflow-y-auto space-y-4 no-scrollbar relative">
            {diagnosticMode ? (
              <div className="absolute left-0 top-0 bottom-0 w-6 text-[9px] text-emerald-500/70 font-mono tracking-[0.2em] overflow-hidden">
                <div className="absolute inset-0 animate-[scan_2s_linear_infinite] opacity-70">10100101101001011010</div>
              </div>
            ) : null}
            <div className={`rounded-2xl border px-3 py-2 text-[10px] uppercase tracking-[0.3em] ${
              breachActive
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
            }`}>
              LEDGER: {ledgerStatus}{" "}
              <span className="ml-2 text-[9px] mono text-slate-400">
                {lastHeartbeat ? `HB ${lastHeartbeat.hash.slice(0, 10)}...` : "HB pending"}
              </span>
            </div>
            {diagnosticMode && diagnosticLog.length ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-black/70 p-3 text-[10px] font-mono text-emerald-200 space-y-1">
                {diagnosticLog.map((line, idx) => (
                  <div key={`${line}-${idx}`}>{line}</div>
                ))}
              </div>
            ) : null}
            {statusNarration && !breachActive ? (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                <span className="font-bold uppercase text-[10px] block mb-1">Clinical Narrator</span>
                {statusNarration}
              </div>
            ) : null}
            {bubbleError ? (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                {bubbleError}
              </div>
            ) : null}
            {bubbleResponse ? (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/10 text-xs text-slate-100 whitespace-pre-wrap">
                {bubbleResponse}
              </div>
            ) : null}
            {breachActive ? (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                <span className="font-bold uppercase text-[10px] block mb-1">Critical Alert</span>
                {alert?.message}
                {alert?.exhibitId ? (
                  <div className="mt-2 text-[10px] text-red-200">
                    Exhibit: <span className="mono">{alert.exhibitId}</span> {alert.filename ? `(${alert.filename})` : ""}
                  </div>
                ) : null}
                {alert?.recordedHash && alert?.actualHash ? (
                  <div className="mt-2 text-[10px] font-mono text-red-200">
                    Recorded: {alert.recordedHash.slice(0, 16)}... | Actual: {alert.actualHash.slice(0, 16)}...
                  </div>
                ) : null}
                <button
                  type="button"
                  className="mt-2 text-[10px] uppercase tracking-widest text-red-200/80 hover:text-red-100"
                  onClick={clear}
                >
                  Acknowledge Alert
                </button>
              </div>
            ) : active ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                <span className="font-bold uppercase text-[10px] block mb-1">Live Proof Context</span>
                {narration}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic text-center py-10">
                Ask Aigis to verify any exhibit or audit event.
              </div>
            )}
            <ThoughtTrace steps={trace} />
          </div>

          <footer className="p-4 bg-black/40 border-t border-white/5 rounded-b-3xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask Aigis..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 outline-none font-mono"
              />
              <button
                className="absolute right-2 top-2 p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                type="button"
                onClick={sendPrompt}
                disabled={sending}
              >
                {sending ? <span className="text-[10px]">...</span> : <Zap size={14} />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.3em] text-slate-500">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-slate-300 hover:text-white"
              >
                Upload Evidence
              </button>
              <div className="flex items-center gap-2">
                <span>Haptic Visuals</span>
                <button
                  type="button"
                  onClick={toggleHaptic}
                  className={`rounded-full border px-2 py-1 ${
                    hapticOn ? "border-emerald-500/40 text-emerald-200" : "border-white/10 text-slate-500"
                  }`}
                >
                  {hapticOn ? "On" : "Off"}
                </button>
              </div>
            </div>
          </footer>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative flex h-16 w-16 items-center justify-center rounded-full border shadow-2xl transition-all hover:scale-110 active:scale-95 ${
          breachActive
            ? "bg-red-600 border-red-400/70"
            : isOpen
              ? "bg-slate-900 border-white/20"
              : "bg-indigo-600 border-indigo-400/50"
        }`}
        type="button"
      >
        <span
          className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
            pulseTick ? "bg-emerald-400" : "bg-emerald-900"
          }`}
        />
        {active || heartbeatPulse ? (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950" />
          </span>
        ) : null}
        {isOpen ? <X className="text-white" /> : <Brain className="text-white group-hover:animate-pulse" />}
      </button>
    </div>
  );
}
