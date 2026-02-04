import React, { useMemo, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { CalendarDays, CheckCircle2, ClipboardList, AlertTriangle } from "lucide-react";
import { logForensicEvent } from "../services/forensicLogger";

const MILESTONES = [
  { step: "Intake Complete", date: "2026-01-08", status: "done" },
  { step: "Discovery Plan", date: "2026-01-22", status: "in-progress" },
  { step: "Expert Reports", date: "2026-02-15", status: "pending" },
  { step: "Mediation", date: "2026-03-10", status: "pending" }
];

export default function LifecycleAgent() {
  const [goal, setGoal] = useState("Plan discovery for a slip and fall.");
  const [planSteps, setPlanSteps] = useState<string[]>([]);
  const [executedSteps, setExecutedSteps] = useState<Record<number, string>>({});
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [pendingStepIdx, setPendingStepIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; summary: string; snapshot: Record<number, string> }>>([]);

  const canExecute = planSteps.length > 0;

  const generatePlan = () => {
    const steps = [
      "Request Security Footage",
      "Depose Store Manager",
      "Inspect Incident Scene",
      "Collect Maintenance Logs",
      "Draft Request for Production"
    ];
    setPlanSteps(steps);
    logForensicEvent("planner.plan.generated", { goal, steps });
  };

  const executeStep = (idx: number) => {
    setPendingStepIdx(idx);
    setVerifierOpen(true);
  };

  const confirmExecute = () => {
    if (pendingStepIdx === null) return;
    const doc = `Request for Production - ${planSteps[pendingStepIdx]}\n\nPlease produce all responsive records relevant to ${planSteps[pendingStepIdx].toLowerCase()}.`;
    setExecutedSteps((prev) => {
      const next = { ...prev, [pendingStepIdx]: doc };
      setHistory((hist) => [
        {
          id: `h-${Date.now()}`,
          summary: `Executed: ${planSteps[pendingStepIdx]}`,
          snapshot: next
        },
        ...hist
      ].slice(0, 6));
      return next;
    });
    logForensicEvent("planner.step.executed", { step: planSteps[pendingStepIdx], index: pendingStepIdx });
    setVerifierOpen(false);
    setPendingStepIdx(null);
  };

  const rollback = (snapshot: Record<number, string>) => {
    setExecutedSteps(snapshot);
    logForensicEvent("planner.rollback", { snapshotKeys: Object.keys(snapshot) });
  };

  const verifierConfidence = useMemo(() => 85 + Math.round(Math.random() * 7), [pendingStepIdx]);
  return (
    <ModuleLayout
      title="Lifecycle Agent"
      subtitle="Matter milestones, task automation, and deadline monitoring"
      kpis={[
        { label: "Milestones", value: "4", tone: "neutral" },
        { label: "At-Risk", value: "1", tone: "warn" },
        { label: "On Track", value: "75%", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-slate-500/20 bg-slate-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <CalendarDays size={18} />
                Matter Timeline
              </CardTitle>
              <CardSubtitle className="text-slate-200/60">
                Auto-generated from case plan and scheduling orders.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {MILESTONES.map((item) => (
                <div key={item.step} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div>
                    <div className="text-slate-200 font-medium">{item.step}</div>
                    <div className="text-xs text-slate-500">{item.date}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      item.status === "done"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : item.status === "in-progress"
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" />
                Automated Tasks
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Draft discovery status report due in 3 days.
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Schedule deposition of key witness by 02/05.
              </div>
            </CardBody>
          </Card>

          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-100">
                Planner & Executor
              </CardTitle>
              <CardSubtitle className="text-indigo-200/60">
                Generate a plan and execute steps with verification and rollback.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="flex-1 rounded border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200"
                />
                <Button variant="primary" onClick={generatePlan}>
                  Generate Plan
                </Button>
              </div>
              {planSteps.length > 0 && (
                <div className="space-y-3">
                  {planSteps.map((step, idx) => (
                    <div key={step} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-200 font-medium">Step {idx + 1}: {step}</div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => executeStep(idx)}
                          disabled={!canExecute}
                        >
                          Execute Step
                        </Button>
                      </div>
                      {executedSteps[idx] ? (
                        <div className="mt-3 rounded bg-slate-900/60 p-3 text-xs text-slate-300 whitespace-pre-wrap">
                          {executedSteps[idx]}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                At-Risk Deadlines
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Expert disclosures due in 12 days.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Export Case Plan
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Refresh Timeline
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-slate-300" />
                History & Rollback
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              {history.length === 0 ? (
                <div className="text-slate-500">No actions executed yet.</div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-3">
                    <span>{entry.summary}</span>
                    <Button size="sm" variant="secondary" onClick={() => rollback(entry.snapshot)}>
                      Rollback
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {verifierOpen && pendingStepIdx !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Verifier</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-100">Confidence {verifierConfidence}%</h3>
            <p className="mt-2 text-sm text-slate-400">
              Proceed with executing: {planSteps[pendingStepIdx]}?
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setVerifierOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={confirmExecute}>
                Proceed
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ModuleLayout>
  );
}
