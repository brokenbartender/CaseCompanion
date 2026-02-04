import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

export default function AgentDevPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 24, y: 24 });
  const [log, setLog] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusLine, setStatusLine] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [activity, setActivity] = useState<string[]>([]);
  const [traceOn, setTraceOn] = useState(true);
  const [role, setRole] = useState("Builder");
  const [memoryScope, setMemoryScope] = useState("general");
  const [memoryNotes, setMemoryNotes] = useState<Record<string, string[]>>({ general: [] });
  const [qaReport, setQaReport] = useState<any | null>(null);
  const [qaImages, setQaImages] = useState<string[]>([]);
  const [autoFix, setAutoFix] = useState(false);
  const [pillarScores, setPillarScores] = useState<Record<string, number>>({
    Determinism: 7,
    Admissibility: 7,
    Auditability: 7,
    Integrity: 7,
    Usability: 7,
    Sellability: 7,
  });
  const [autoEnforcePillars, setAutoEnforcePillars] = useState(true);
  const autoImproveAtRef = useRef<number>(0);
  const statusTimerRef = useRef<number | null>(null);
  const codexJobRef = useRef<string | null>(null);
  const builderAbortRef = useRef<AbortController | null>(null);
  const codexUrl = String(import.meta.env.VITE_CODEX_BRIDGE_URL || "http://localhost:8790/codex/exec");
  const psUrl = String(import.meta.env.VITE_PS_BRIDGE_URL || "http://127.0.0.1:8791");
  const wsScheme = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = String(import.meta.env.VITE_AGENT_WS_URL || `${wsScheme}://${window.location.hostname}:8789`);
  const socketRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const psJobRef = useRef<string | null>(null);
  const hasConnected = useRef(false);
  const autostart = String(import.meta.env.VITE_AGENT_AUTOSTART || "") === "1";
  const autostartCommand = String(import.meta.env.VITE_AGENT_AUTOSTART_COMMAND || "").trim();
  const hasAutostarted = useRef(false);
  const logLines = useMemo(() => log.slice(-16), [log]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const knownCommands = useMemo(() => [
    "help",
    "goto",
    "click",
    "type",
    "press",
    "wait",
    "screenshot",
    "expect",
    "buttons",
    "demo",
    "memory",
    "code",
    "knowledge",
    "remember",
    "know",
    "trace",
    "cancel",
    "stop",
  ], []);
  const roleOptions = useMemo(() => ["Builder", "QA", "UX", "Security", "Performance", "Coordinator"], []);
  const scopeOptions = useMemo(() => ["general", "login", "evidence", "security", "roi", "ux", "qa"], []);

  const appendLog = (entry: string) => {
    setLog((prev) => [...prev, entry].slice(-200));
  };

  const pushActivity = (entry: string) => {
    setActivity((prev) => [...prev, entry].slice(-6));
    setLastAction(entry);
  };

  const memoryKey = "lexipro_agent_memory_v2";
  const roleKey = "lexipro_agent_role_v1";
  const traceKey = "lexipro_agent_trace_v1";
  const scopeKey = "lexipro_agent_scope_v1";
  const pillarKey = "lexipro_agent_pillar_scores_v1";
  const pillarEnforceKey = "lexipro_agent_pillar_enforce_v1";
  const panelPosKey = "lexipro_agent_panel_pos_v1";
  const panelCollapsedKey = "lexipro_agent_panel_collapsed_v1";
  const pillarMin = 7;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(panelPosKey);
    const savedCollapsed = window.localStorage.getItem(panelCollapsedKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { x?: number; y?: number };
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPanelPos({ x: parsed.x, y: parsed.y });
        }
      } catch {
        // ignore
      }
    } else {
      const fallbackX = Math.max(24, window.innerWidth - 420);
      const fallbackY = Math.max(24, window.innerHeight - 560);
      setPanelPos({ x: fallbackX, y: fallbackY });
    }
    if (savedCollapsed === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(panelPosKey, JSON.stringify(panelPos));
  }, [panelPos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(panelCollapsedKey, collapsed ? "1" : "0");
  }, [collapsed]);

  const getScopedNotes = (scope: string) => memoryNotes[scope] || [];
  const getMemorySummary = () => getScopedNotes(memoryScope).slice(-6).join(" | ");

  const rememberNote = (note: string) => {
    if (!note) return;
    const nextScope = [...getScopedNotes(memoryScope), note].slice(-50);
    setMemoryNotes((prev) => ({ ...prev, [memoryScope]: nextScope }));
    appendLog(`memory: saved "${note}"`);
  };

  const clearMemory = () => {
    setMemoryNotes((prev) => ({ ...prev, [memoryScope]: [] }));
    appendLog("memory: cleared");
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    dragRef.current.dragging = true;
    dragRef.current.offsetX = event.clientX - panelPos.x;
    dragRef.current.offsetY = event.clientY - panelPos.y;
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const rect = panelRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 360;
      const height = rect?.height ?? (collapsed ? 76 : 560);
      const nextX = event.clientX - dragRef.current.offsetX;
      const nextY = event.clientY - dragRef.current.offsetY;
      const maxX = Math.max(12, window.innerWidth - width - 12);
      const maxY = Math.max(12, window.innerHeight - height - 12);
      const clampedX = Math.min(Math.max(12, nextX), maxX);
      const clampedY = Math.min(Math.max(12, nextY), maxY);
      setPanelPos({ x: clampedX, y: clampedY });
    };

    const handleUp = () => {
      dragRef.current.dragging = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [collapsed, panelPos.x, panelPos.y]);

  const startStatusTimer = (label: string) => {
    if (statusTimerRef.current) window.clearInterval(statusTimerRef.current);
    const started = Date.now();
    setStatusLine(label);
    statusTimerRef.current = window.setInterval(() => {
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      setStatusLine(`${label} (${seconds}s)`);
    }, 1000);
  };

  const stopStatusTimer = () => {
    if (statusTimerRef.current) {
      window.clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatusLine("");
  };

  const cancelAll = async (reason = "Cancelled") => {
    pushActivity(`Interrupt: ${reason}`);
    setIsThinking(false);
    stopStatusTimer();
    if (wsReady) {
      sendAgent("cancel", []);
    }
    if (codexJobRef.current) {
      try {
        await fetch(codexUrl.replace(/\/codex\/exec$/, "/codex/cancel"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: codexJobRef.current }),
        });
        appendLog("codex: cancelled");
      } catch {
        appendLog("codex: cancel failed");
      } finally {
        codexJobRef.current = null;
      }
    }
    if (builderAbortRef.current) {
      builderAbortRef.current.abort();
      builderAbortRef.current = null;
      appendLog("builder: cancelled");
    }
    await cancelPs();
    setIsRunning(false);
  };

  const connectAgent = () => {
    if (socketRef.current) return;
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      socket.onopen = () => {
        setWsReady(true);
        if (!hasConnected.current) {
          appendLog("agent: connected");
          hasConnected.current = true;
        }
        if (traceOn) {
          sendAgent("trace", ["on"]);
        }
      };
      socket.onclose = () => {
        setWsReady(false);
        socketRef.current = null;
        appendLog("agent: disconnected");
      };
      socket.onerror = () => {
        setWsReady(false);
      };
      socket.onmessage = (event) => {
        const raw = String(event.data);
        try {
        const parsed = JSON.parse(raw);
        if (parsed?.type === "status" && parsed?.message === "connected") {
          if (!hasConnected.current) {
            appendLog("agent: connected");
            hasConnected.current = true;
          }
          return;
        }
        if (parsed?.type === "event" && typeof parsed?.message === "string") {
          appendLog(`agent: ${parsed.message}`);
          pushActivity(parsed.message);
          setStatusLine(parsed.message);
          return;
        }
        if (parsed?.type === "result" && typeof parsed?.result === "string") {
          if (parsed.result.startsWith("Commands:")) {
            appendLog("agent: ready");
            return;
          }
          appendLog(parsed.result);
          if (parsed.result.startsWith("Memory Snapshot")) {
            rememberNote(parsed.result.replace(/^Memory Snapshot:\s*/i, "").trim());
          }
          setIsRunning(false);
          stopStatusTimer();
          return;
        }
        } catch {
          // fall through
        }
      appendLog(raw);
    };
  } catch {
    setWsReady(false);
  }
};

  const sendAgent = (command: string, args: string[] = []) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      appendLog("agent: not connected");
      return false;
    }
    appendLog(`agent> ${command} ${args.join(" ")}`.trim());
    socket.send(JSON.stringify({ command, args }));
    return true;
  };

  const runCodex = async (text: string) => {
    if (!text) return;
    if (isRunning) {
      appendLog("busy: command already running");
      return;
    }
    appendLog(`codex> ${text}`);
    setIsRunning(true);
    setActiveTask("Running Codex");
    pushActivity("Codex started");
    try {
      const res = await fetch(codexUrl.replace(/\/codex\/exec$/, "/codex/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        appendLog(`codex error: ${payload?.error || res.statusText}`);
        return;
      }
      const id = String(payload?.id || "");
      if (!id) {
        appendLog("codex error: no job id");
        return;
      }
      codexJobRef.current = id;
      const streamUrl = codexUrl.replace(/\/codex\/exec$/, `/codex/stream?id=${encodeURIComponent(id)}`);
      const stream = new EventSource(streamUrl);
      stream.onmessage = (event) => {
        try {
          const chunk = JSON.parse(event.data);
          if (chunk) appendLog(String(chunk).trimEnd());
        } catch {
          appendLog(String(event.data));
        }
      };
      stream.addEventListener("done", () => {
        stream.close();
        codexJobRef.current = null;
        setIsRunning(false);
        setActiveTask("");
      });
      stream.onerror = () => {
        stream.close();
        codexJobRef.current = null;
        setIsRunning(false);
        setActiveTask("");
        appendLog("codex: stream closed");
      };
    } catch (err: any) {
      appendLog(`codex error: ${err?.message || "failed"}`);
    }
  };

  const cancelPs = async () => {
    if (!psJobRef.current) return;
    try {
      await fetch(`${psUrl}/ps/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: psJobRef.current }),
      });
      appendLog("powershell: cancelled");
    } catch {
      appendLog("powershell: cancel failed");
    } finally {
      psJobRef.current = null;
      setIsRunning(false);
    }
  };

  const runPowerShell = async (text: string) => {
    if (!text) return;
    if (isRunning) {
      appendLog("busy: command already running");
      return;
    }
    setIsRunning(true);
    appendLog(`ps> ${text}`);
    setActiveTask("Running PowerShell");
    pushActivity("PowerShell started");
    try {
      const startRes = await fetch(`${psUrl}/ps/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text }),
      });
      const startPayload = await startRes.json().catch(() => ({}));
      if (!startRes.ok || !startPayload?.id) {
        appendLog(`powershell error: ${startPayload?.error || startRes.statusText}`);
        setIsRunning(false);
        return;
      }
      const id = String(startPayload.id);
      psJobRef.current = id;
      const stream = new EventSource(`${psUrl}/ps/stream?id=${encodeURIComponent(id)}`);
      stream.onmessage = (event) => {
        try {
          const chunk = JSON.parse(event.data);
          if (chunk) appendLog(String(chunk).trimEnd());
        } catch {
          appendLog(String(event.data));
        }
      };
      stream.addEventListener("done", () => {
        stream.close();
        psJobRef.current = null;
        setIsRunning(false);
        setActiveTask("");
      });
      stream.onerror = () => {
        stream.close();
        psJobRef.current = null;
        setIsRunning(false);
        setActiveTask("");
        appendLog("powershell: stream closed");
      };
    } catch (err: any) {
      appendLog(`powershell error: ${err?.message || "failed"}`);
      setIsRunning(false);
    }
  };

  const runBuilder = async (goal: string) => {
    if (!goal) return;
    if (isRunning) {
      appendLog("busy: command already running");
      return;
    }
    appendLog(`builder> ${goal}`);
    setIsRunning(true);
    setActiveTask("Builder: planning");
    startStatusTimer("Builder planning...");
    pushActivity("Builder started");
    const memory = getMemorySummary();
    const controller = new AbortController();
    builderAbortRef.current = controller;
    appendLog("plan: 1) Inspect relevant files");
    appendLog("plan: 2) Implement the change");
    appendLog("plan: 3) Verify and report");
    try {
      const res = await api.post("/ai/builder", { goal, role, memory }, { signal: controller.signal });
      const trace = Array.isArray(res?.trace) ? res.trace : [];
      trace.forEach((step: any) => {
        if (!step?.content) return;
        appendLog(`builder: ${step.content}`);
      });
      if (res?.report) {
        appendLog(`builder: ${res.report}`);
        rememberNote(`Builder report: ${res.report}`.slice(0, 240));
        const nextScores: Record<string, number> = { ...pillarScores };
        res.report
          .split(/\r?\n/)
          .forEach((line: string) => {
            const match = line.match(/(Determinism|Admissibility|Auditability|Integrity|Usability|Sellability)\s*:?\\s*(\\d+)/i);
            if (match) {
              const key = match[1].charAt(0).toUpperCase() + match[1].slice(1);
              nextScores[key] = Math.min(10, Math.max(1, Number(match[2])));
            }
          });
        setPillarScores(nextScores);
        if (autoEnforcePillars) {
          const low = Object.entries(nextScores).filter(([, v]) => v < pillarMin);
          const now = Date.now();
          if (low.length && now - autoImproveAtRef.current > 60_000) {
            autoImproveAtRef.current = now;
            const focus = low.map(([k, v]) => `${k}=${v}`).join(", ");
            appendLog(`pillar: auto-improve triggered (${focus})`);
            await runBuilder(`Raise pillar scores to >= ${pillarMin}. Focus on: ${focus}. Prioritize usability + sellability while preserving determinism and admissibility.`);
          }
        }
      }
    } catch (err: any) {
      appendLog(`builder error: ${err?.message || "failed"}`);
    } finally {
      builderAbortRef.current = null;
      setIsRunning(false);
      setActiveTask("");
      stopStatusTimer();
    }
  };

  const classifyIntent = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.startsWith("/codex ")) return "codex";
    if (lower.startsWith("/ps ")) return "ps";
    if (lower.startsWith("/builder ") || lower.startsWith("builder:")) return "builder";
    const builderHints = ["fix", "change", "edit", "implement", "refactor", "code", "repo", "commit", "push", "add", "remove", "update", "improve"];
    if (builderHints.some((hint) => lower.includes(hint))) return "builder";
    return "browser";
  };

  const runInput = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isRunning || isThinking) {
      await cancelAll("Interrupted by new request");
    }
    setInput("");
    appendLog(`you> ${trimmed}`);
    let dispatchedToAgent = false;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("remember ")) {
      rememberNote(trimmed.slice(9).trim());
      return;
    }
    if (lower === "memory") {
      appendLog(`memory: ${getMemorySummary() || "empty"}`);
      return;
    }
    if (lower === "clear memory") {
      clearMemory();
      return;
    }
    if (lower.startsWith("score pillars")) {
      await scorePillars();
      return;
    }
    const isGreeting =
      ["hello", "hi", "hey", "yo", "sup", "help"].includes(lower) ||
      lower.startsWith("hello ") ||
      lower.startsWith("hi ") ||
      lower.startsWith("hey ");
    if (isGreeting) {
      // Let the controller LLM handle greetings so responses are never scripted.
      setIsThinking(true);
      startStatusTimer("Thinking...");
      try {
        const control = await api.post("/ai/controller", {
          input: trimmed,
          availableCommands: knownCommands,
          role,
          memory: getMemorySummary(),
        });
        if (control?.reply) appendLog(`agent: ${control.reply}`);
      } catch (err: any) {
        appendLog(`agent: controller unavailable (${err?.message || "error"})`);
      }
      setIsThinking(false);
      stopStatusTimer();
      return;
    }
    if (trimmed.toLowerCase() === "stop" || trimmed.toLowerCase() === "cancel") {
      await cancelAll("User requested cancel");
      return;
    }
    const intent = classifyIntent(trimmed);
    if (lower.includes("run full qa") || lower.includes("full qa") || lower.includes("qa suite")) {
      await runQaSuite();
      return;
    }
    if (intent === "codex") {
      await runCodex(trimmed.slice(7).trim());
      return;
    }
    if (intent === "ps") {
      await runPowerShell(trimmed.slice(4).trim());
      return;
    }
    if (intent === "builder") {
      const goal = trimmed.startsWith("builder:") ? trimmed.slice(8).trim() : trimmed.replace(/^\/builder\s+/i, "").trim();
      if (!goal) {
        appendLog("builder: missing goal. Example: builder: add tests for login flow");
        return;
      }
      await runBuilder(goal);
      return;
    }
    if (!wsReady) {
      appendLog("agent: browser agent offline. Falling back to builder.");
      await runBuilder(trimmed);
      return;
    }
    try {
      startStatusTimer("Thinking...");
      setIsThinking(true);
      setActiveTask("Controller: reasoning");
      let control: any = null;
      try {
        control = await api.post("/ai/controller", {
          input: trimmed,
          availableCommands: knownCommands,
          role,
          memory: getMemorySummary(),
        });
      } catch (err: any) {
        appendLog(`agent: controller unavailable (${err?.message || "error"})`);
        control = null;
      }
      if (control?.reply) appendLog(`agent: ${control.reply}`);
      const mode = String(control?.mode || "answer").toLowerCase();
      if (mode === "builder") {
        await runBuilder(trimmed);
        return;
      }
      if (mode === "browser" && Array.isArray(control?.commands) && control.commands.length) {
        stopStatusTimer();
        setActiveTask("Browser agent: executing");
        setIsRunning(true);
        for (const cmd of control.commands.slice(0, 4)) {
          if (!cmd?.command) continue;
          startStatusTimer(`Executing: ${cmd.command}`);
          sendAgent(cmd.command, cmd.args || []);
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        dispatchedToAgent = true;
        setIsRunning(false);
        return;
      }
      const lowerText = trimmed.toLowerCase();
      if (lowerText.includes("audit") || lowerText.includes("ui/ux") || lowerText.includes("entire app")) {
        appendLog("agent: running full QA audit (controller fallback).");
        await runQaSuite();
        return;
      }
    } catch (err: any) {
      appendLog(`agent: ${err?.message || "controller failed"}`);
    } finally {
      setIsThinking(false);
      if (!dispatchedToAgent) stopStatusTimer();
    }
  };

  useEffect(() => {
    connectAgent();
    if (!autostart || hasAutostarted.current || !autostartCommand) return;
    hasAutostarted.current = true;
    setTimeout(() => {
      runCodex(autostartCommand);
    }, 400);
  }, [autostart, autostartCommand]);

  useEffect(() => {
    const stored = localStorage.getItem(memoryKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") setMemoryNotes(parsed);
      } catch {
        // ignore
      }
    }
    const storedRole = localStorage.getItem(roleKey);
    if (storedRole) setRole(storedRole);
    const storedTrace = localStorage.getItem(traceKey);
    if (storedTrace) setTraceOn(storedTrace === "1");
    const storedScope = localStorage.getItem(scopeKey);
    if (storedScope) setMemoryScope(storedScope);
    const storedPillars = localStorage.getItem(pillarKey);
    if (storedPillars) {
      try {
        const parsed = JSON.parse(storedPillars);
        if (parsed && typeof parsed === "object") setPillarScores(parsed);
      } catch {
        // ignore
      }
    }
    const storedEnforce = localStorage.getItem(pillarEnforceKey);
    if (storedEnforce) setAutoEnforcePillars(storedEnforce === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(memoryKey, JSON.stringify(memoryNotes));
  }, [memoryNotes]);

  useEffect(() => {
    localStorage.setItem(roleKey, role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem(scopeKey, memoryScope);
  }, [memoryScope]);

  useEffect(() => {
    localStorage.setItem(pillarKey, JSON.stringify(pillarScores));
  }, [pillarScores]);

  useEffect(() => {
    localStorage.setItem(pillarEnforceKey, autoEnforcePillars ? "1" : "0");
  }, [autoEnforcePillars]);

  useEffect(() => {
    localStorage.setItem(traceKey, traceOn ? "1" : "0");
    if (wsReady) {
      sendAgent("trace", [traceOn ? "on" : "off"]);
    }
  }, [traceOn, wsReady]);

  const fetchLatestQa = async () => {
    try {
      const res = await api.get("/qa/latest");
      const report = res?.report || null;
      setQaReport(report);
      const images = Array.isArray(report?.screenshots)
        ? report.screenshots.map((file: string) => `/api/qa/screenshot?path=${encodeURIComponent(file.replace(/\\\\/g, "/"))}`)
        : [];
      setQaImages(images);
    } catch {
      setQaReport(null);
      setQaImages([]);
    }
  };

  const runQaSuite = async () => {
    if (!wsReady) {
      appendLog("agent: browser agent offline. Start QA agent first.");
      return;
    }
    appendLog("qa: starting full suite");
    setActiveTask("QA Suite");
    startStatusTimer("QA running...");
    setIsRunning(true);
    sendAgent("trace", ["on"]);
    sendAgent("demo", []);
    sendAgent("screenshot", ["qa-complete"]);
    setTimeout(async () => {
      setIsRunning(false);
      stopStatusTimer();
      await fetchLatestQa();
      appendLog("qa: suite complete");
      if (autoFix) {
        appendLog("qa: auto-fix enabled, sending builder task");
        await runBuilder("Fix issues discovered in the latest QA run. Focus on any console errors or missing UI interactions.");
      }
    }, 2500);
  };

  const scorePillars = async () => {
    await runBuilder("Review current app state and return Pillar Scorecard (Determinism, Admissibility, Auditability, Integrity, Usability, Sellability) plus top 3 improvement actions.");
  };

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const renderLine = (line: string, index: number) => {
    const trimmed = line.trim();
    const isUser = trimmed.startsWith("you>");
    const isAgent = trimmed.startsWith("agent:");
    const isTool = trimmed.startsWith("codex>") || trimmed.startsWith("ps>") || trimmed.startsWith("codex:") || trimmed.startsWith("powershell");
    const isPlan = trimmed.startsWith("plan:");
    const bubbleBase = "max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed";
    if (isUser) {
      return (
        <div key={`${line}-${index}`} className="flex justify-end">
          <div className={`${bubbleBase} bg-emerald-500/15 text-emerald-100 border border-emerald-400/30`}>
            {trimmed.replace(/^you>\\s*/i, "")}
          </div>
        </div>
      );
    }
    if (isAgent) {
      return (
        <div key={`${line}-${index}`} className="flex justify-start">
          <div className={`${bubbleBase} bg-white/5 text-slate-100 border border-white/10`}>
            {trimmed.replace(/^agent:\\s*/i, "")}
          </div>
        </div>
      );
    }
    if (isPlan) {
      return (
        <div key={`${line}-${index}`} className="flex justify-start">
          <div className={`${bubbleBase} bg-indigo-500/10 text-indigo-100 border border-indigo-400/30`}>
            {trimmed.replace(/^plan:\\s*/i, "Plan: ")}
          </div>
        </div>
      );
    }
    if (isTool) {
      return (
        <div key={`${line}-${index}`} className="flex justify-start">
          <div className={`${bubbleBase} bg-slate-900/70 text-slate-300 border border-slate-700/60 font-mono`}>
            {trimmed}
          </div>
        </div>
      );
    }
    return (
      <div key={`${line}-${index}`} className="flex justify-start">
        <div className={`${bubbleBase} bg-slate-800/60 text-slate-300 border border-slate-700/40`}>
          {trimmed}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-[95] w-[420px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B0F14] via-[#0C141C] to-[#0B0F14] shadow-2xl"
      style={{ left: panelPos.x, top: panelPos.y }}
    >
      <div
        className="flex items-center justify-between border-b border-white/10 px-4 py-3 cursor-move select-none"
        onMouseDown={startDrag}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">LexiPro Agent</div>
          <div className="text-[10px] text-slate-500">Auto mode | Browser + Builder | Natural language</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className={`h-2 w-2 rounded-full ${wsReady ? "bg-emerald-400" : "bg-rose-400"}`} />
          {isRunning || isThinking ? "working" : "idle"}
          <button
            onClick={() => setTraceOn((prev) => !prev)}
            className={`ml-2 rounded-full border px-2 py-1 text-[10px] ${traceOn ? "border-emerald-400/60 text-emerald-200" : "border-slate-500/40 text-slate-400"}`}
          >
            Trace {traceOn ? "On" : "Off"}
          </button>
          <button
            onClick={() => cancelAll("Stop pressed")}
            className="ml-2 rounded-full border border-rose-400/40 px-2 py-1 text-[10px] text-rose-200 hover:border-rose-300/70"
          >
            Stop
          </button>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="ml-2 rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-200 hover:border-white/30"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      {collapsed ? null : (
      <>
      <div className="border-b border-white/10 px-4 py-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Role:</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-100"
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span>Scope:</span>
          <select
            value={memoryScope}
            onChange={(event) => setMemoryScope(event.target.value)}
            className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-100"
          >
            {scopeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            onClick={() => setAutoFix((prev) => !prev)}
            className={`rounded-full border px-2 py-1 text-[10px] ${autoFix ? "border-emerald-400/60 text-emerald-200" : "border-slate-500/40 text-slate-400"}`}
          >
            Auto-fix {autoFix ? "On" : "Off"}
          </button>
          <button
            onClick={() => setAutoEnforcePillars((prev) => !prev)}
            className={`rounded-full border px-2 py-1 text-[10px] ${autoEnforcePillars ? "border-indigo-400/60 text-indigo-200" : "border-slate-500/40 text-slate-400"}`}
          >
            Pillars {autoEnforcePillars ? "On" : "Off"}
          </button>
          <button
            onClick={() => runQaSuite()}
            className="rounded-full border border-slate-500/40 px-2 py-1 text-[10px] text-slate-200 hover:border-slate-300/60"
          >
            Run QA
          </button>
        </div>
        <div>Active: {activeTask || "none"}</div>
        <div>Last action: {lastAction || "waiting"}</div>
        <div>Memory: {getMemorySummary() || "empty"}</div>
        <div>Memory scope: {memoryScope}</div>
        {activity.length ? <div className="mt-1 text-slate-500">Recent: {activity.join(" | ")}</div> : null}
      </div>

      <div ref={logRef} className="h-56 space-y-2 overflow-auto px-4 py-3">
        {logLines.length ? logLines.map(renderLine) : (
          <div className="text-[11px] text-slate-500">Ask anything about the app, e.g. "Test the evidence locker" or "Fix the login flow".</div>
        )}
        {isRunning || isThinking ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {statusLine || "Agent is working..."}
          </div>
        ) : null}
      </div>

      {qaImages.length ? (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">QA Replay</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {qaImages.slice(-6).map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt={`qa-trace-${index}`}
                className="h-16 w-full rounded-lg border border-white/10 object-cover"
              />
            ))}
          </div>
          {qaReport?.updatedAt ? (
            <div className="mt-2 text-[10px] text-slate-500">Last QA: {qaReport.updatedAt}</div>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-slate-100">
          <span className="text-emerald-400">&gt;</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runInput();
            }}
            placeholder="Tell me what to test or improve..."
            className="flex-1 bg-transparent outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
      </>
      )}
    </div>
  );
}
