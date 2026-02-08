import { api } from "../services/api";
import { getCsrfHeader } from "../services/csrf";
import { getWorkspaceId, refreshSession, setAuthToken, setWorkspaceId } from "../services/authStorage";
import { getApiBase } from "../services/apiBase";
import { dispatchDemoAction } from "./demoActions";

export type AutoDemoStage = {
  id: "INGEST" | "INTEL" | "SABOTAGE" | "SOVEREIGN";
  duration: number;
  label: string;
  route: string;
  narrative?: string;
};

export type AutoDemoHandlers = {
  onNavigate?: (route: string) => void;
  onStage?: (stage: AutoDemoStage) => void;
  onNarrate?: (text: string) => void;
  onTrace?: (type: "thought" | "action" | "observation" | "final", content: string) => void;
  onProgress?: (value: number) => void;
  onStageProgress?: (value: number) => void;
  onDone?: () => void;
};

export const DEMO_STAGES: AutoDemoStage[] = [
  {
    id: "INGEST",
    duration: 120000,
    label: "Tactical Ingest Gate",
    route: "/",
    narrative: "Initializing secure ingestion: mapping raw evidence to immutable vector coordinates."
  },
  {
    id: "INTEL",
    duration: 180000,
    label: "Evidence-Grounded Assistant",
    route: "/assistant",
    narrative: "Forensic AI active: cross-referencing claims against verified source anchors."
  },
  {
    id: "SABOTAGE",
    duration: 120000,
    label: "Release Gate Challenge",
    route: "/assistant",
    narrative: "Hallucination guard: validating citation integrity before release."
  },
  {
    id: "SOVEREIGN",
    duration: 180000,
    label: "Sovereignty Hub",
    route: "/",
    narrative: "Compiling Proof Packet: generating SHA-256 signatures for chain of custody."
  }
];

const NARRATOR_PERSONA = [
  "You are a Clinical Forensic Auditor narrating a live proof walkthrough.",
  "Use a mathematically certain, transparent tone.",
  "Reference FRE 902(13) and 902(14) when admissibility is discussed.",
  "Keep it to 2-3 sentences, no legal advice, no speculation."
].join("\n");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emitDiagnostic = (line: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lexipro:diag-log", { detail: { line } }));
};

const isMockDemo = () => {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("lexipro_demo_mock") === "1";
};

const ensureDemoSession = async () => {
  if (typeof window === "undefined") return;
  if (isMockDemo()) {
    sessionStorage.setItem("lexipro_demo_env", "1");
    sessionStorage.setItem("lexipro_demo_mode", "1");
    return;
  }
  sessionStorage.setItem("lexipro_demo_env", "1");
  sessionStorage.setItem("lexipro_demo_mode", "1");
  if (getWorkspaceId()) return;
  const ok = await refreshSession().catch(() => false);
  if (ok && getWorkspaceId()) return;
  try {
    const res: any = await api.post("/auth/login", {
      email: "demo@lexipro.local",
      password: "LexiPro!234"
    });
    if (res?.token) setAuthToken(String(res.token));
    if (res?.workspaceId) setWorkspaceId(String(res.workspaceId));
  } catch {
    // fall through; refreshSession will confirm auth state
  }
  await refreshSession().catch(() => null);
};

const runDemoPost = async (path: string) => {
  if (isMockDemo()) return {};
  const tryRequest = async () => {
    const workspaceId = getWorkspaceId();
    const approvalToken = String(import.meta.env.VITE_APPROVAL_TOKEN || "").trim();
    const headers: Record<string, string> = {
      ...getCsrfHeader()
    };
    if (workspaceId) headers["x-workspace-id"] = workspaceId;
    if (approvalToken) headers["x-approval-token"] = approvalToken;
    const base = getApiBase();
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers,
      credentials: "include"
    });
    return res;
  };

  let res = await tryRequest();
  if (res.status === 401) {
    await ensureDemoSession();
    res = await tryRequest();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Walkthrough action failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
};

export class AutoDemoEngine {
  private stages: AutoDemoStage[];
  private paused = false;
  private stopped = false;
  private running = false;

  constructor(stages: AutoDemoStage[] = DEMO_STAGES) {
    this.stages = stages;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  stop() {
    this.stopped = true;
    this.paused = false;
    this.running = false;
  }

  private async waitWhilePaused() {
    while (this.paused && !this.stopped) {
      await sleep(250);
    }
  }

  private async narrate(context: string, stageId?: string) {
    const scripted: Record<string, string> = {
      INGEST: "Evidence ingress is sealed. Hash lineage established. Bates anchors queued.",
      INTEL: "Grounded assistant active. Citations verified against anchored evidence.",
      SABOTAGE: "Release gate engaged. Ungrounded claims withheld for admissibility safety.",
      SOVEREIGN: "Proof packet compiled. Hash manifest and audit ledger finalized."
    };
    if (stageId && scripted[stageId]) return scripted[stageId];
    return context;
  }

  async start(handlers: AutoDemoHandlers = {}) {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    this.paused = false;
    await ensureDemoSession();
    const mockMode = isMockDemo();
    const stepMs = mockMode ? 600 : 2500;

    for (const stage of this.stages) {
      if (this.stopped) break;
      await this.waitWhilePaused();
      handlers.onStage?.(stage);
      handlers.onTrace?.("action", `STAGE ${stage.id}: ${stage.label}`);

      if (stage.route && handlers.onNavigate) {
        handlers.onNavigate(mockMode ? "/assistant" : stage.route);
      }

      if (stage.id === "INGEST") {
        emitDiagnostic(">> INITIALIZING SEMANTIC GRAPH FOR CASE_ID: LEX-2026");
        handlers.onTrace?.("thought", "Locking bits to immutable ledger nodes.");
        if (!mockMode) {
          await runDemoPost("/demo/seed");
        } else {
          handlers.onTrace?.("observation", "Mock exhibit loaded: Contract Dispute Exhibit A.");
        }
        handlers.onTrace?.("observation", "Evidence sealed and Bates-anchored.");
        if (!mockMode) {
          handlers.onNavigate?.("/intake");
          dispatchDemoAction({ type: "intake:triage" });
        }
      }

      if (stage.id === "INTEL") {
        handlers.onTrace?.("thought", "Cross-node scan: depo vs. evidence.");
        emitDiagnostic(">> CROSS-NODE SCAN: DEPOSITION VS EXHIBIT SET");
        handlers.onNavigate?.("/assistant");
        dispatchDemoAction({ type: "assistant:teleport" });
      }

      if (stage.id === "SABOTAGE") {
        handlers.onTrace?.("thought", "Triggering deterministic heartbeat sabotage.");
        if (!mockMode) {
          await runDemoPost("/demo/sabotage");
        }
        handlers.onTrace?.("observation", "Heartbeat desync detected. Inference halted.");
        handlers.onNavigate?.("/assistant");
        dispatchDemoAction({ type: "assistant:withheld" });
      }

      if (stage.id === "SOVEREIGN") {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("lexipro_diag_mode", "1");
          window.dispatchEvent(new CustomEvent("lexipro:diag-mode", { detail: { enabled: true } }));
        }
        handlers.onTrace?.("thought", "Entering sovereignty hub. Publishing corporate facts.");
        handlers.onNavigate?.("/");
        dispatchDemoAction({ type: "export:packet" });
        await sleep(2500);
        handlers.onNavigate?.("/security");
        dispatchDemoAction({ type: "security:view" });
      }

      const narration = await this.narrate(stage.label, stage.id);
      handlers.onNarrate?.(narration);

      const duration = mockMode ? Math.min(stage.duration, 3000) : stage.duration;
      const totalTicks = Math.max(1, Math.floor(duration / stepMs));
      for (let tick = 0; tick <= totalTicks; tick += 1) {
        if (this.stopped) break;
        await this.waitWhilePaused();
        const progress = Math.min(100, Math.round((tick / totalTicks) * 100));
        handlers.onProgress?.(progress);
        handlers.onStageProgress?.(progress);
        await sleep(stepMs);
      }
    }

    handlers.onTrace?.("final", "Walkthrough sequence complete. Ledger sealed.");
    handlers.onDone?.();
    this.running = false;
  }
}
