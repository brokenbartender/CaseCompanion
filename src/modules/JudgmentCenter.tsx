import React, { useMemo, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { readJson, writeJson } from "../utils/localStore";

const JUDGMENT_KEY = "case_companion_judgment_v1";

type JudgmentState = {
  judgmentDate: string;
  judgmentAmount: string;
  interestRate: string;
  collectionPlanReady: boolean;
  garnishmentReady: boolean;
  seizureReady: boolean;
  renewalReminder: boolean;
  notes: string;
};

function addDays(date: string, days: number) {
  if (!date) return "";
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function JudgmentCenter() {
  const [state, setState] = useState<JudgmentState>(() =>
    readJson(JUDGMENT_KEY, {
      judgmentDate: "",
      judgmentAmount: "",
      interestRate: "",
      collectionPlanReady: false,
      garnishmentReady: false,
      seizureReady: false,
      renewalReminder: false,
      notes: ""
    })
  );

  const stayEnds = useMemo(() => addDays(state.judgmentDate, 21), [state.judgmentDate]);

  function update<K extends keyof JudgmentState>(key: K, value: JudgmentState[K]) {
    const next = { ...state, [key]: value } as JudgmentState;
    setState(next);
    writeJson(JUDGMENT_KEY, next);
  }

  function exportCollectionPlan() {
    const lines = [
      "Judgment + Collection Snapshot",
      "",
      `Judgment Date: ${state.judgmentDate || "Not set"}`,
      `Stay Ends (21 days): ${stayEnds || "Not set"}`,
      `Judgment Amount: ${state.judgmentAmount || "Not set"}`,
      `Interest Rate: ${state.interestRate || "Not set"}`,
      `Collection Plan Ready: ${state.collectionPlanReady ? "Yes" : "No"}`,
      `Garnishment Ready: ${state.garnishmentReady ? "Yes" : "No"}`,
      `Seizure Ready: ${state.seizureReady ? "Yes" : "No"}`,
      `Renewal Reminder Set: ${state.renewalReminder ? "Yes" : "No"}`,
      "",
      "Notes:",
      state.notes || ""
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "judgment_collection_snapshot.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleLayout
      title="Judgment & Collection"
      subtitle="Post-judgment controls with 21-day stay enforcement and collection tools."
      kpis={[
        { label: "Stay", value: stayEnds ? `Ends ${stayEnds}` : "21 Days", tone: "warn" },
        { label: "Garnishment", value: "MC 12 / MC 13", tone: "neutral" },
        { label: "Renewal", value: "10 Years", tone: "neutral" }
      ]}
      lastUpdated="Feb 8, 2026"
      right={<Button variant="primary" size="sm" onClick={exportCollectionPlan}>Export Collection Plan</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Judgment Details</CardSubtitle>
            <CardTitle>Entry + Stay</CardTitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-200 space-y-3">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Judgment Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.judgmentDate}
                onChange={(e) => update("judgmentDate", e.target.value)}
              />
            </label>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Stay ends: {stayEnds || "Set judgment date"}
            </div>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Judgment Amount</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Amount awarded"
                value={state.judgmentAmount}
                onChange={(e) => update("judgmentAmount", e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Interest Rate</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Court interest rate"
                value={state.interestRate}
                onChange={(e) => update("interestRate", e.target.value)}
              />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Collection Paths</CardSubtitle>
            <CardTitle>Garnishment + Seizure</CardTitle>
          </CardHeader>
          <CardBody className="text-sm text-slate-200 space-y-3">
            {[
              { key: "collectionPlanReady", label: "Collection plan drafted" },
              { key: "garnishmentReady", label: "Garnishment paperwork ready (MC 12/13)" },
              { key: "seizureReady", label: "Seizure plan ready (MC 19)" },
              { key: "renewalReminder", label: "10-year renewal reminder set" }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state[item.key as keyof JudgmentState] as boolean}
                  onChange={(e) => update(item.key as keyof JudgmentState, e.target.checked as any)}
                />
                <span>{item.label}</span>
              </label>
            ))}
            <div className="text-xs text-slate-400">
              Verify stay expiration and local court rules before filing collection actions.
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Notes</CardSubtitle>
            <CardTitle>Collection Notes</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="min-h-[200px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Track collection targets, payment plans, and enforcement notes."
              value={state.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
