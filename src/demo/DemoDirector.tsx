import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { api } from "../services/api";
import { getApiBase } from "../services/apiBase";
import { getWorkspaceId, refreshSession, setAuthToken, setWorkspaceId, setWorkspaceName, setWorkspaceRole } from "../services/authStorage";
import { getCsrfHeader } from "../services/csrf";
import { useAutoDemo } from "./useAutoDemo";
import { useDemoDirector } from "./useDemoDirector";
import { isDemoModeEnabled } from "./demoMode";
import { dispatchDemoAction, onDemoStage, type DemoStage } from "./demoActions";

const DEMO_DIRECTOR_FLAG = "lexipro_demo_director";

type StageRow = { id: DemoStage; label: string };

const STAGES: StageRow[] = [
  { id: "PREFLIGHT", label: "Preflight" },
  { id: "SEEDING", label: "Seeding" },
  { id: "INTAKE", label: "Intake" },
  { id: "TELEPORT", label: "Teleport" },
  { id: "WITHHELD", label: "Withheld" },
  { id: "AUDIT", label: "Audit View" },
  { id: "EXPORT", label: "Export" },
  { id: "COMPLETE", label: "Complete" }
];

const waitFor = async (check: () => boolean, timeoutMs = 15000, intervalMs = 500) => {
  const started = Date.now();
  return new Promise<void>((resolve, reject) => {
    const interval = window.setInterval(() => {
      if (check()) {
        window.clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        window.clearInterval(interval);
        reject(new Error("Timed out waiting for stage completion."));
      }
    }, intervalMs);
  });
};

export default function DemoDirector() {
  const director = useDemoDirector();
  const demo = useAutoDemo();
  const nav = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoplay] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("autoplay") === "1";
  });
  const [demoModeReady, setDemoModeReady] = useState(isDemoModeEnabled());
  const [workspaceId, setWorkspaceIdState] = useState(() => getWorkspaceId());
  const stageDoneRef = useRef<Record<DemoStage, boolean>>({
    PREFLIGHT: false,
    SEEDING: false,
    INTAKE: false,
    TELEPORT: false,
    WITHHELD: false,
    AUDIT: false,
    EXPORT: false,
    COMPLETE: false
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(DEMO_DIRECTOR_FLAG, "1");
    director.activate();
    return () => {
      sessionStorage.removeItem(DEMO_DIRECTOR_FLAG);
      director.deactivate();
    };
  }, []);

  useEffect(() => {
    return onDemoStage((stage) => {
      stageDoneRef.current[stage] = true;
      director.setStageStatus(stage, "done");
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`lexipro_demo_stage_${stage.toLowerCase()}`, "done");
      }
    });
  }, []);

  const setStageRunning = (stage: DemoStage) => {
    director.setStage(stage);
    director.setStageStatus(stage, "running");
  };

  const setStageError = (stage: DemoStage, message: string) => {
    director.setStage(stage);
    director.setStageStatus(stage, "error");
    director.setError(message);
  };

  const buildDemoIdentity = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const counterKey = "lexipro_demo_counter";
    let counter = 0;
    if (typeof window !== "undefined") {
      counter = Number(sessionStorage.getItem(counterKey) || "0") + 1;
      sessionStorage.setItem(counterKey, String(counter));
    }
    const email = `demo+${date}-${counter}@lexipro.local`;
    const password = `demo-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    return { email, password };
  };

  const ensureDemoAuth = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lexipro_demo_env", "1");
      sessionStorage.setItem("lexipro_demo_mode", "1");
      sessionStorage.setItem("lexipro_demo_director", "1");
    }
    const ok = await refreshSession().catch(() => false);
    if (ok && getWorkspaceId()) return;

    const demoEmail = String(import.meta.env.VITE_DEMO_EMAIL || "demo@lexipro.local");
    const demoPassword = String(import.meta.env.VITE_DEMO_PASSWORD || "demo1234");
    try {
      const login = await api.post("/auth/login", { email: demoEmail, password: demoPassword });
      if (login?.token) setAuthToken(String(login.token));
      if (login?.workspaceId) setWorkspaceId(String(login.workspaceId));
      await refreshSession().catch(() => null);
      if (getWorkspaceId()) return;
    } catch {
      // fall through to registration
    }

    const identity = buildDemoIdentity();
    const register = await api.post("/auth/register", {
      email: identity.email,
      password: identity.password
    });
    if (register?.token) setAuthToken(String(register.token));
    if (register?.workspaceId) setWorkspaceId(String(register.workspaceId));
    await refreshSession().catch(() => null);
  };

  const refreshWorkspaceId = () => {
    setWorkspaceIdState(getWorkspaceId());
  };

  const waitForSelector = async (selector: string, timeoutMs = 20000) => {
    await waitFor(() => Boolean(document.querySelector(selector)), timeoutMs, 250);
  };

  const waitForText = async (text: string, timeoutMs = 20000) => {
    await waitFor(() => document.body?.innerText?.includes(text), timeoutMs, 250);
  };

  const waitForPathname = async (pathname: string, timeoutMs = 20000) => {
    await waitFor(() => window.location.pathname === pathname, timeoutMs, 250);
  };

  const navigateAndWait = async (pathname: string, opts?: { selector?: string; text?: string }) => {
    nav(pathname);
    await waitForPathname(pathname, 20000);
    if (opts?.selector) await waitForSelector(opts.selector, 20000);
    if (opts?.text) await waitForText(opts.text, 20000);
  };

  const runPreflight = async () => {
    setStageRunning("PREFLIGHT");
    await refreshSession();
    await ensureDemoAuth();
    const health = await api.get("/health");
    if (health?.demoMode === false) {
      throw new Error("Demo mode disabled on the server. Set DEMO_MODE=1.");
    }
    if (health?.demoSeedEnabled === false) {
      throw new Error("Demo seeding disabled on the server (DEMO_MODE/DEMO_SEED_ENABLED).");
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lexipro_demo_env", "1");
    }
    setDemoModeReady(true);
    const hydrateSession = async () => {
      const me = await api.get("/auth/me");
      if (me?.workspaceId) setWorkspaceId(String(me.workspaceId));
      if (me?.workspaceName) setWorkspaceName(String(me.workspaceName));
      if (me?.role) setWorkspaceRole(String(me.role));
    };
    try {
      await hydrateSession();
      refreshWorkspaceId();
    } catch {
      let attempts = 0;
      while (attempts < 3) {
        attempts += 1;
        const identity = buildDemoIdentity();
        try {
          const register = await api.post("/auth/register", {
            email: identity.email,
            password: identity.password
          });
          if (register?.token) setAuthToken(String(register.token));
          if (register?.workspaceId) setWorkspaceId(String(register.workspaceId));
          await hydrateSession();
          refreshWorkspaceId();
          break;
        } catch (err: any) {
          const message = String(err?.message || "");
          if (!message.toLowerCase().includes("already exists")) {
            throw err;
          }
        }
      }
    }
    refreshWorkspaceId();
    director.setStageStatus("PREFLIGHT", "done");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lexipro_demo_stage_preflight", "done");
    }
  };

  const runSeed = async () => {
    setStageRunning("SEEDING");
    refreshWorkspaceId();
    const liveWorkspaceId = getWorkspaceId();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getCsrfHeader()
    };
    if (liveWorkspaceId) headers["x-workspace-id"] = liveWorkspaceId;
    let res = await fetch(`${getApiBase()}/demo/seed`, {
      method: "POST",
      headers,
      credentials: "include"
    });
    if (res.status === 401) {
      await ensureDemoAuth();
      const refreshedWorkspaceId = getWorkspaceId();
      if (refreshedWorkspaceId) headers["x-workspace-id"] = refreshedWorkspaceId;
      res = await fetch(`${getApiBase()}/demo/seed`, {
        method: "POST",
        headers,
        credentials: "include"
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Demo seed failed.");
    }
    const json = await res.json().catch(() => ({}));
    setSeeded(Boolean(json?.seeded || json?.seededCount || json?.exhibit));
    director.setStageStatus("SEEDING", "done");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lexipro_demo_stage_seeding", "done");
    }
  };

  const waitForIntake = async () => {
    setStageRunning("INTAKE");
    await navigateAndWait("/intake", { selector: 'input[type="file"][name="file"]' });
    dispatchDemoAction({ type: "intake:triage" });
    await waitFor(() => stageDoneRef.current.INTAKE, 30000, 750);
  };

  const waitForTeleport = async () => {
    setStageRunning("TELEPORT");
    await navigateAndWait("/assistant", { selector: "#case-assistant-exhibit" });
    dispatchDemoAction({ type: "assistant:teleport" });
    await waitFor(() => stageDoneRef.current.TELEPORT, 30000, 500);
  };

  const waitForWithheld = async () => {
    setStageRunning("WITHHELD");
    if (window.location.pathname !== "/assistant") {
      await navigateAndWait("/assistant", { selector: "#case-assistant-exhibit" });
    }
    dispatchDemoAction({ type: "assistant:withheld" });
    await waitFor(() => stageDoneRef.current.WITHHELD, 30000, 500);
  };

  const waitForAudit = async () => {
    setStageRunning("AUDIT");
    const auditId = sessionStorage.getItem("lexipro_demo_withheld_audit") || "";
    if (auditId) {
      nav(`/security?auditEventId=${auditId}`);
    }
    await waitForPathname("/security", 20000);
    if (auditId) {
      await waitForText(`Audit event requested: ${auditId}`, 20000);
    } else {
      await waitForText("Audit event requested", 20000);
    }
    await waitFor(() => stageDoneRef.current.AUDIT, 30000, 750);
  };

  const waitForExport = async () => {
    setStageRunning("EXPORT");
    await navigateAndWait("/", { selector: "#btn-export-packet" });
    dispatchDemoAction({ type: "export:packet" });
    await waitFor(() => stageDoneRef.current.EXPORT, 30000, 750);
  };

  const runDemo = async () => {
    setBusy(true);
    director.reset();
    director.setRunning(true);
    director.setError(null);
    sessionStorage.setItem("lexipro_demo_mode", "1");
    Object.keys(stageDoneRef.current).forEach((stage) => {
      sessionStorage.removeItem(`lexipro_demo_stage_${stage.toLowerCase()}`);
    });
    stageDoneRef.current = {
      PREFLIGHT: false,
      SEEDING: false,
      INTAKE: false,
      TELEPORT: false,
      WITHHELD: false,
      AUDIT: false,
      EXPORT: false,
      COMPLETE: false
    };
    try {
      const runWithRetries = async (stage: DemoStage, action: () => Promise<void>, maxRetries = 2) => {
        let attempt = 0;
        while (attempt <= maxRetries) {
          try {
            await action();
            return;
          } catch (err: any) {
            attempt += 1;
            if (attempt > maxRetries) throw err;
            director.bumpRetries();
          }
        }
      };

      await runWithRetries("PREFLIGHT", runPreflight);
      await runWithRetries("SEEDING", runSeed);
      demo.start();
      await runWithRetries("INTAKE", waitForIntake);
      await runWithRetries("TELEPORT", waitForTeleport);
      await runWithRetries("WITHHELD", waitForWithheld);
      await runWithRetries("AUDIT", waitForAudit);
      await runWithRetries("EXPORT", waitForExport);
      director.setStage("COMPLETE");
      director.setStageStatus("COMPLETE", "done");
      director.setRunning(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lexipro_demo_complete", "1");
        sessionStorage.setItem("lexipro_demo_stage_complete", "done");
        sessionStorage.setItem("lexipro_demo_autoplay_run", "1");
        if (window.location.pathname !== "/demo") {
          nav("/demo");
        }
      }
    } catch (err: any) {
      const message = err?.message || "Demo run failed.";
      setStageError(director.stage, message);
      director.setRunning(false);
    } finally {
      setBusy(false);
    }
  };

  const retryStage = async () => {
    director.setError(null);
    director.bumpRetries();
    const current = director.stage;
    try {
      if (current === "PREFLIGHT") return await runPreflight();
      if (current === "SEEDING") return await runSeed();
      if (current === "INTAKE") return await waitForIntake();
      if (current === "TELEPORT") return await waitForTeleport();
      if (current === "WITHHELD") return await waitForWithheld();
      if (current === "AUDIT") return await waitForAudit();
      if (current === "EXPORT") return await waitForExport();
    } catch (err: any) {
      setStageError(current, err?.message || "Retry failed.");
    }
  };

  const handleCopySummary = async () => {
    const auditId = sessionStorage.getItem("lexipro_demo_withheld_audit") || "unavailable";
    const lines = [
      "LexiPro Demo Summary",
      `Seeded: ${seeded ? "yes" : "no"}`,
      `Teleport: ${director.stageStatus.TELEPORT === "done" ? "success" : "pending"}`,
      `Withheld audit id: ${auditId}`,
      `Proof packet export: ${director.stageStatus.EXPORT === "done" ? "success" : "pending"}`,
      `Completed at: ${new Date().toISOString()}`
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    if (!autoplay) return;
    if (busy) return;
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("lexipro_demo_autoplay_run") === "1") return;
      sessionStorage.setItem("lexipro_demo_autoplay_run", "1");
    }
    void runDemo();
  }, [autoplay, busy]);

  useEffect(() => {
    if (location.pathname === "/security") {
      const params = new URLSearchParams(location.search);
      if (params.get("auditEventId")) {
        stageDoneRef.current.AUDIT = true;
        director.setStageStatus("AUDIT", "done");
      }
    }
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Demo Director</CardTitle>
            <CardSubtitle>Zero-effort guided run with preflight and autoplay.</CardSubtitle>
          </CardHeader>
          <CardBody>
            {!demoModeReady ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 text-sm text-slate-300">
                Demo mode will be verified on start.
              </div>
            ) : null}
            {director.error ? (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-200">
                {director.error}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAGES.map((row) => (
                <div
                  key={row.id}
                  data-demo-stage={row.label}
                  className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{row.label}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      director.stageStatus[row.id] === "done"
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                        : director.stageStatus[row.id] === "error"
                          ? "bg-red-500/20 text-red-200 border border-red-500/40"
                          : director.stageStatus[row.id] === "running"
                            ? "bg-blue-500/20 text-blue-200 border border-blue-500/40"
                            : "bg-white/5 text-slate-400 border border-white/10"
                    }`}>
                      {director.stageStatus[row.id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled={busy} onClick={runDemo}>
                {busy ? "Running..." : "Start Demo"}
              </Button>
              <Button variant="secondary" disabled={!director.error} onClick={retryStage}>
                Retry Stage
              </Button>
              <Button variant="ghost" onClick={() => nav("/")}>
                Exit Demo
              </Button>
              <div className="ml-auto text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Seeded: {seeded ? "Yes" : "No"} - Workspace: {workspaceId || "unassigned"}
              </div>
            </div>

            {director.stageStatus.COMPLETE === "done" ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <div className="text-lg font-semibold text-emerald-200">Demo complete</div>
                <div className="mt-2 text-sm text-emerald-100/80">
                  Proof packet generated and audit chain verified.
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => dispatchDemoAction({ type: "export:packet" })}
                  >
                    Download Proof Packet Again
                  </Button>
                  <Button variant="secondary" onClick={runDemo}>
                    Restart Demo
                  </Button>
                  <Button variant="ghost" onClick={() => nav("/security")}>
                    View Audit Ledger
                  </Button>
                  <Button variant="ghost" onClick={handleCopySummary}>
                    {copied ? "Copied" : "Copy Demo Summary"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
