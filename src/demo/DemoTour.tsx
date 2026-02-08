import { useEffect, useMemo, useRef, useState } from "react";
import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { getWorkspaceId } from "../services/authStorage";
import { fetchWorkspacePrefs, setWorkspacePref, TOUR_PREF_KEY } from "../services/workspacePrefs";
import { isAutoDemoEnabled, useAutoDemo } from "./useAutoDemo";
import DemoWelcome from "./DemoWelcome";

const STORY_EVENT = "lexipro:story-mode";

const waitForSelector = async (selector: string, attempts = 40, delayMs = 250) => {
  for (let i = 0; i < attempts; i += 1) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }
  return null;
};

const navigateTo = (path: string) => {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export default function DemoTour() {
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const demo = useAutoDemo();
  const demoEnabled = isAutoDemoEnabled();
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);
  const [prefsError, setPrefsError] = useState(false);
  const [prefsDismissed, setPrefsDismissed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourRequested, setTourRequested] = useState(false);
  const tourFinishedRef = useRef(false);
  const autoRunRequested = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoplay") === "1" || params.get("demo") === "1") return true;
    return sessionStorage.getItem("lexipro_demo_director") === "1";
  }, []);

  const fallbackNarration: Record<string, string> = {
    "Welcome to LexiPro Forensic OS":
      "This is not a research tool. It is a Truth Engine. This tour will show you how we guarantee evidence integrity.",
    "The Integrity Meter":
      "The integrity meter is a real-time cryptographic pulse. If evidence changes, the shield flips and workflows lock.",
    "Evidence Ingestion":
      "Drag discovery here to hash, seal, and Bates-anchor evidence with deterministic audit logs.",
    "Ready to Launch?":
      "Initiate the Green Run to let the system auto-navigate, ingest, and export a signed Proof Packet.",
    "The Integrity Core":
      "This badge is a real-time cryptographic proof. If a single byte of evidence is tampered with, the shield turns red and locks the system.",
    "Evidence Locker":
      "Secure storage for high-value assets. Files here are verified against their original pixels.",
    "Meet Aigis":
      "Aigis prevents ungrounded output by locking answers to source pixels.",
    "Red Team Console":
      "Verify the chain of custody and detect sabotage or spoliation instantly.",
    "The \"Iron Grip\" (Legal Hold)":
      "Once legal hold is active, evidence cannot be deleted or altered.",
    "Admissibility Export":
      "Export a court-ready admissibility packet that works offline.",
    "LexiPro Proof Walkthrough: Evidence-Grounded AI":
      "Proof walkthrough showing how evidence grounding protects high-stakes workflows.",
    "Integrity Core":
      "Integrity monitoring runs continuously to detect tampering.",
    "Open the LOI":
      "Aigis reads by verifying coordinates, not guessing.",
    "The Iron Grip":
      "Litigation hold enforces immutability across the record.",
    "The Proof Packet":
      "Generate a self-authenticating manifest for court delivery."
  };

  const applyNarration = (title: string) => {
    const popover = document.querySelector(".driver-popover-description");
    if (!popover) return;
    popover.textContent = fallbackNarration[title] || "Narration unavailable.";
  };

  useEffect(() => {
    let active = true;
    fetchWorkspacePrefs(workspaceId).then((prefs) => {
      if (!active) return;
      setPrefsError(false);
      setTourCompleted(prefs[TOUR_PREF_KEY] === "true");
    }).catch(() => {
      if (!active) return;
      setPrefsError(true);
      setTourCompleted(true);
      console.info("[DemoTour] Workspace prefs unavailable. Tour auto-start suppressed.");
    });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const markTourCompleted = () => {
    setTourCompleted(true);
    void setWorkspacePref(TOUR_PREF_KEY, "true", workspaceId);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tourCompleted !== false) return;
    if (autoRunRequested) return;
    if (demoEnabled && !tourRequested) return;

    tourFinishedRef.current = false;
    navigateTo("/");

    const steps = (demoEnabled
      ? [
          {
            element: "#integrity-meter",
            popover: {
              title: "The Integrity Meter",
              description: fallbackNarration["The Integrity Meter"] || "Narration unavailable.",
              side: "bottom",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("The Integrity Meter")
          },
          {
            element: "#upload-dropzone",
            popover: {
              title: "Evidence Ingestion",
              description: fallbackNarration["Evidence Ingestion"] || "Narration unavailable.",
              side: "right",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("Evidence Ingestion")
          },
          {
            element: "#demo-trigger-btn",
            popover: {
              title: "Ready to Launch?",
              description: fallbackNarration["Ready to Launch?"] || "Narration unavailable.",
              side: "bottom",
              align: "end",
              onNextClick: (_el: unknown, _step: unknown, opts: { driver: { destroy: () => void } }) => {
                tourFinishedRef.current = true;
                opts.driver.destroy();
              }
            },
            onHighlightStarted: () => applyNarration("Ready to Launch?")
          }
        ]
      : [
          {
            element: "body",
            popover: {
              title: "Welcome to LexiPro Forensic OS",
              description: fallbackNarration["Welcome to LexiPro Forensic OS"] || "Narration unavailable.",
              side: "over",
              align: "center"
            },
            onHighlightStarted: () => applyNarration("Welcome to LexiPro Forensic OS")
          },
          {
            element: "#integrity-meter",
            popover: {
              title: "The Integrity Meter",
              description: fallbackNarration["The Integrity Meter"] || "Narration unavailable.",
              side: "bottom",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("The Integrity Meter")
          },
          {
            element: "#upload-dropzone",
            popover: {
              title: "Evidence Ingestion",
              description: fallbackNarration["Evidence Ingestion"] || "Narration unavailable.",
              side: "right",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("Evidence Ingestion")
          },
          {
            element: "#btn-export-packet",
            popover: {
              title: "The Proof Packet",
              description: fallbackNarration["The Proof Packet"] || "Narration unavailable.",
              side: "bottom",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("The Proof Packet")
          }
        ]) as DriveStep[];

    const tour = driver({
      showProgress: true,
      allowClose: true,
      onDestroyed: () => {
        markTourCompleted();
        if (demoEnabled && tourFinishedRef.current) {
          demo.start();
        }
      },
      steps
    });

    const requiredSelectors = demoEnabled
      ? ["#integrity-meter", "#upload-dropzone", "#demo-trigger-btn"]
      : ["#integrity-meter", "#upload-dropzone", "#btn-export-packet"];

    const canStart = () => requiredSelectors.every((selector) => document.querySelector(selector));

    let attempts = 0;
    const maxAttempts = 30;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (canStart()) {
        window.clearInterval(interval);
        tour.drive();
        return;
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(interval);
      }
    }, 250);

    return () => {
      window.clearInterval(interval);
      tour.destroy();
    };
  }, [demoEnabled, tourCompleted, tourRequested]);

  useEffect(() => {
    if (!demoEnabled) {
      setShowWelcome(false);
      return;
    }
    if (autoRunRequested) {
      setShowWelcome(false);
      setTourCompleted(true);
      return;
    }
    if (tourCompleted === false && !prefsError) {
      setShowWelcome(true);
    }
  }, [demoEnabled, tourCompleted, prefsError, autoRunRequested]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const startStoryMode = () => {
      navigateTo("/");
      const storyTour = driver({
        showProgress: true,
        allowClose: true,
        onDestroyed: () => {
          markTourCompleted();
        },
        steps: [
          {
            element: "body",
            popover: {
              title: "LexiPro Proof Walkthrough: Evidence-Grounded AI",
              description: fallbackNarration["LexiPro Proof Walkthrough: Evidence-Grounded AI"] || "Narration unavailable.",
              side: "over",
              align: "center"
            },
            onHighlightStarted: () => applyNarration("LexiPro Proof Walkthrough: Evidence-Grounded AI")
          },
          {
            element: "#integrity-meter",
            popover: {
              title: "Integrity Core",
              description: fallbackNarration["Integrity Core"] || "Narration unavailable.",
              side: "bottom",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("Integrity Core")
          },
          {
            element: "#nav-evidence",
            popover: {
              title: "Evidence Locker",
              description: fallbackNarration["Evidence Locker"] || "Narration unavailable.",
              side: "right",
              align: "start",
              onNextClick: async (_el, _step, opts) => {
                const nav = document.querySelector("#nav-evidence") as HTMLElement | null;
                nav?.click();
                navigateTo("/matters");
                await waitForSelector(".loi-row");
                opts.driver.moveNext();
              }
            },
            onHighlightStarted: () => applyNarration("Evidence Locker")
          },
          {
            element: ".loi-row",
            popover: {
              title: "Open the LOI",
              description: fallbackNarration["Open the LOI"] || "Narration unavailable.",
              side: "left",
              align: "start",
              onNextClick: async (el, _step, opts) => {
                (el as HTMLElement | undefined)?.click?.();
                await waitForSelector("#hold-toggle");
                opts.driver.moveNext();
              }
            },
            onHighlightStarted: () => applyNarration("Open the LOI")
          },
          {
            element: "#hold-toggle",
            popover: {
              title: "The Iron Grip",
              description: fallbackNarration["The Iron Grip"] || "Narration unavailable.",
              side: "bottom",
              align: "start",
              onNextClick: async (_el, _step, opts) => {
                await waitForSelector("#btn-export-packet");
                opts.driver.moveNext();
              }
            },
            onHighlightStarted: () => applyNarration("The Iron Grip")
          },
          {
            element: "#btn-export-packet",
            popover: {
              title: "The Proof Packet",
              description: fallbackNarration["The Proof Packet"] || "Narration unavailable.",
              side: "bottom",
              align: "start"
            },
            onHighlightStarted: () => applyNarration("The Proof Packet")
          }
        ]
      });

      waitForSelector("#integrity-meter", 40, 250).then((el) => {
        if (!el) return;
        storyTour.drive();
      });
    };

    const handler = () => startStoryMode();
    window.addEventListener(STORY_EVENT, handler);
    (window as any).startStoryMode = startStoryMode;

    return () => {
      window.removeEventListener(STORY_EVENT, handler);
      if ((window as any).startStoryMode === startStoryMode) {
        delete (window as any).startStoryMode;
      }
    };
  }, []);

  if (prefsError && !prefsDismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-xs text-amber-100 shadow-lg">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 mb-1">
          Tour Preferences Offline
        </div>
        <div className="text-amber-100/90">
          Guided tour will not auto-run until workspace preferences are reachable.
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-amber-400/50 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100 hover:bg-amber-500/20"
            onClick={() => setPrefsDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <DemoWelcome
        onStart={() => {
          setShowWelcome(false);
          setTourRequested(true);
        }}
        onSkip={() => {
          setShowWelcome(false);
          markTourCompleted();
        }}
      />
    );
  }

  return null;
}
