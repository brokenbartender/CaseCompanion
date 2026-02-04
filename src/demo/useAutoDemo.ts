import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AutoDemoEngine, DEMO_STAGES, type AutoDemoStage } from "./AutoDemoEngine";
import type { ThoughtTraceStep } from "../components/agent/ThoughtTrace";
import { getWorkspaceRole } from "../services/authStorage";
import { isDemoModeEnabled } from "./demoMode";

const engine = new AutoDemoEngine();
const listeners = new Set<(state: DemoState) => void>();
const DEMO_PACK_KEY = "lexipro_demo_pack";
const DEMO_TRACE_KEY = "lexipro_demo_trace";

type DemoScenario = "contract_dispute";
type DemoPack = {
  exhibit: {
    id: string;
    title: string;
    filename: string;
    integrityHash: string;
    matterId: string;
    type: string;
  };
  anchors: Array<{
    id: string;
    exhibitId: string;
    pageNumber: number;
    lineNumber: number;
    text: string;
    bboxJson: [number, number, number, number];
  }>;
  qa: Array<{
    question: string;
    answer: string;
    anchorId: string;
  }>;
  trace: ThoughtTraceStep[];
};

type DemoState = {
  active: boolean;
  paused: boolean;
  narration: string;
  stage: AutoDemoStage;
  stageProgress: number;
  trace: ThoughtTraceStep[];
  progress: number;
};

let demoState: DemoState = {
  active: false,
  paused: false,
  narration: "",
  stage: DEMO_STAGES[0],
  stageProgress: 0,
  trace: [],
  progress: 0
};

const emit = (partial: Partial<DemoState>) => {
  demoState = { ...demoState, ...partial };
  listeners.forEach((listener) => listener(demoState));
};

const buildContractDisputePack = (): DemoPack => ({
  exhibit: {
    id: "demo-exhibit-a",
    title: "Exhibit A",
    filename: "Independent Contractor Agreement.pdf",
    integrityHash: "demo-hash-contract-2026-03-01",
    matterId: "contract-dispute-matter",
    type: "PDF"
  },
  anchors: [
    {
      id: "demo-anchor-1",
      exhibitId: "demo-exhibit-a",
      pageNumber: 1,
      lineNumber: 12,
      text: "Effective Date: March 1, 2025.",
      bboxJson: [110, 120, 220, 30]
    },
    {
      id: "demo-anchor-2",
      exhibitId: "demo-exhibit-a",
      pageNumber: 4,
      lineNumber: 18,
      text: "Non-Compete: Contractor agrees to a 12-month restriction following termination.",
      bboxJson: [98, 210, 360, 38]
    },
    {
      id: "demo-anchor-3",
      exhibitId: "demo-exhibit-a",
      pageNumber: 6,
      lineNumber: 4,
      text: "Governing Law: Delaware. Venue: Court of Chancery.",
      bboxJson: [96, 180, 380, 40]
    }
  ],
  qa: [
    {
      question: "Is there a non-compete clause?",
      answer: "Yes. Section 4 includes a 12-month non-compete obligation. [Exhibit A, p.4]",
      anchorId: "demo-anchor-2"
    },
    {
      question: "What is the contract start date?",
      answer: "The agreement becomes effective on March 1, 2025. [Exhibit A, p.1]",
      anchorId: "demo-anchor-1"
    },
    {
      question: "Which law governs the agreement and venue?",
      answer: "Delaware law governs, with venue in the Court of Chancery. [Exhibit A, p.6]",
      anchorId: "demo-anchor-3"
    }
  ],
  trace: [
    {
      id: "trace-semantic-1",
      type: "action",
      content: "Semantic Verification: Validating claim against Exhibit A text."
    },
    {
      id: "trace-semantic-2",
      type: "observation",
      content: "SOURCE: Exhibit A, p.4\nSNIPPET: Non-Compete: Contractor agrees to a 12-month restriction following termination."
    },
    {
      id: "trace-semantic-3",
      type: "final",
      content: "Result: Claim supported. Grounding approved."
    }
  ]
});

const buildScenarioPack = (scenario: DemoScenario): DemoPack => {
  switch (scenario) {
    case "contract_dispute":
    default:
      return buildContractDisputePack();
  }
};

const writeDemoPack = (pack: DemoPack) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DEMO_PACK_KEY, JSON.stringify(pack));
  sessionStorage.setItem(DEMO_TRACE_KEY, JSON.stringify(pack.trace));
};

const readDemoTrace = (): ThoughtTraceStep[] => {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(DEMO_TRACE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function isAutoDemoEnabled() {
  if (!isDemoModeEnabled()) return false;
  const demoEnvActive = typeof window !== "undefined" && sessionStorage.getItem("lexipro_demo_env") === "1";
  const directorActive = typeof window !== "undefined" && sessionStorage.getItem("lexipro_demo_director") === "1";
  if (import.meta.env.VITE_ENABLE_AUTODEMO !== "1" && !demoEnvActive && !directorActive) return false;
  if (typeof window === "undefined") return false;
  const role = String(getWorkspaceRole() || "").toLowerCase();
  if (!directorActive && role !== "admin" && role !== "owner") return false;
  return sessionStorage.getItem("lexipro_demo_mode") === "1";
}

export function useAutoDemo() {
  const navigate = useNavigate();
  const enabled = isAutoDemoEnabled();
  const [state, setState] = useState<DemoState>(() => (
    enabled
      ? demoState
      : {
          active: false,
          paused: false,
          narration: "",
          stage: DEMO_STAGES[0],
          stageProgress: 0,
          trace: [],
          progress: 0
        }
  ));

  const start = () => {
    if (!enabled) return;
    emit({
      active: true,
      paused: false,
      trace: [],
      progress: 0,
      stage: DEMO_STAGES[0],
      stageProgress: 0
    });
    void engine.start({
      onNavigate: (route) => navigate(route),
      onStage: (nextStage) => emit({ stage: nextStage, stageProgress: 0 }),
      onNarrate: (text) => emit({ narration: text }),
      onTrace: (type, content) => {
        emit({
          trace: [
            ...demoState.trace,
            { id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, content }
          ]
        });
      },
      onProgress: (value) => emit({ progress: value }),
      onStageProgress: (value) => emit({ stageProgress: value }),
      onDone: () => emit({ active: false })
    });
  };

  const pause = () => {
    if (!enabled) return;
    engine.pause();
    emit({ paused: true });
  };

  const resume = () => {
    if (!enabled) return;
    engine.resume();
    emit({ paused: false });
  };

  const stop = () => {
    if (!enabled) return;
    engine.stop();
    emit({ active: false, paused: false });
  };

  useEffect(() => {
    if (!enabled) {
      setState({
        active: false,
        paused: false,
        narration: "",
        stage: DEMO_STAGES[0],
        stageProgress: 0,
        trace: [],
        progress: 0
      });
      return;
    }
    const storedTrace = readDemoTrace();
    if (storedTrace.length) {
      emit({ trace: storedTrace });
    }
    if (typeof window !== "undefined" && sessionStorage.getItem("lexipro_demo_autostart") === "1") {
      sessionStorage.removeItem("lexipro_demo_autostart");
      start();
    }
    const onLaunch = () => start();
    const onStop = () => stop();
    window.addEventListener("lexipro:auto-demo", onLaunch as EventListener);
    window.addEventListener("lexipro:auto-demo-stop", onStop as EventListener);
    return () => {
      window.removeEventListener("lexipro:auto-demo", onLaunch as EventListener);
      window.removeEventListener("lexipro:auto-demo-stop", onStop as EventListener);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const listener = (next: DemoState) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [enabled]);

  return useMemo(() => ({
    ...state,
    start,
    startScenario: (scenario: DemoScenario) => {
      const pack = buildScenarioPack(scenario);
      writeDemoPack(pack);
      sessionStorage.setItem("lexipro_demo_env", "1");
      sessionStorage.setItem("lexipro_demo_mode", "1");
      sessionStorage.setItem("lexipro_demo_director", "1");
      sessionStorage.setItem("lexipro_demo_mock", "1");
      sessionStorage.setItem("lexipro_demo_autostart", "1");
      emit({ trace: pack.trace, active: false, paused: false });
      window.location.href = "/assistant?demo=1";
    },
    pause,
    resume,
    stop
  }), [state]);
}
