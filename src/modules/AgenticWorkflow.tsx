import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { ListChecks, CheckCircle2, AlertTriangle, ClipboardList } from "lucide-react";

const STEPS = [
  "Parse NDA obligations",
  "Extract termination clauses",
  "Identify unilateral liability",
  "Compare against firm playbook",
  "Draft redlines + memo"
];

export default function AgenticWorkflow() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [safetyMode, setSafetyMode] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const run = () => {
    setRunning(true);
    setDone(false);
    setTimeout(() => {
      setRunning(false);
      setDone(true);
      setHistory((prev) => [
        `Run ${prev.length + 1}: ${new Date().toLocaleTimeString()} • Safety ${safetyMode ? "ON" : "OFF"}`,
        ...prev
      ]);
    }, 2000);
  };

  return (
    <ModuleLayout
      title="Agentic Workflow Automation"
      subtitle="Goal-driven multi-step execution with audit trail"
      kpis={[
        { label: "Steps", value: "5", tone: "neutral" },
        { label: "Auto", value: "Yes", tone: "good" },
        { label: "Risk", value: "2", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-slate-500/20 bg-slate-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <ListChecks size={18} />
              Workflow Plan
            </CardTitle>
            <CardSubtitle className="text-slate-200/60">
              Goal: “Conduct a risk assessment on this NDA.”
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-3 text-xs">
              <span>Safety mode (guardrails + citation checks)</span>
              <button
                type="button"
                onClick={() => setSafetyMode((v) => !v)}
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                  safetyMode ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"
                }`}
              >
                {safetyMode ? "ON" : "OFF"}
              </button>
            </div>
            {STEPS.map((step, idx) => (
              <div key={step} className="rounded border border-slate-800 bg-slate-950/40 p-3 flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">Step {idx + 1}</span>
                <span>{step}</span>
              </div>
            ))}
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-500" onClick={run}>
              Run Workflow
            </Button>
            {running ? <div className="text-xs text-blue-200">Executing steps…</div> : null}
            {done ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                Workflow complete. 2 risks flagged. Draft + redlines ready.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                Outputs
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Risk memo (draft)</div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Redlines (.docx)</div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Findings
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Termination rights are unilateral.
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Liability cap missing for IP claims.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" />
                Run History
              </CardTitle>
            </CardHeader>
            <CardBody className="text-xs text-slate-300 space-y-2">
              {history.length === 0 ? (
                <div className="rounded border border-dashed border-slate-700 p-2 text-slate-400">
                  No runs yet. Execute a workflow to populate history.
                </div>
              ) : (
                history.map((item) => (
                  <div key={item} className="rounded border border-slate-800 bg-slate-950/40 p-2">
                    {item}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
