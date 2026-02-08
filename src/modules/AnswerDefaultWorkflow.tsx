import React, { useMemo, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { readJson, writeJson } from "../utils/localStore";

const STORE_KEY = "case_companion_answer_default_v1";

type AnswerDefaultState = {
  serviceDate: string;
  answerDeadline: string;
  answerReceived: boolean;
  responsiveMotion: boolean;
  defaultDrafted: boolean;
  defaultFiled: boolean;
  defaultHearingDate: string;
  clerkEntryDate: string;
  defaultJudgmentDate: string;
  notes: string;
};

function addDays(date: string, days: number) {
  if (!date) return "";
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function daysUntil(date: string) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AnswerDefaultWorkflow() {
  const [state, setState] = useState<AnswerDefaultState>(() =>
    readJson(STORE_KEY, {
      serviceDate: "",
      answerDeadline: "",
      answerReceived: false,
      responsiveMotion: false,
      defaultDrafted: false,
      defaultFiled: false,
      defaultHearingDate: "",
      clerkEntryDate: "",
      defaultJudgmentDate: "",
      notes: ""
    })
  );

  const computedDeadline = useMemo(() => {
    if (state.answerDeadline) return state.answerDeadline;
    return addDays(state.serviceDate, 21);
  }, [state.answerDeadline, state.serviceDate]);

  const daysLeft = daysUntil(computedDeadline);
  const possibleDefaultEligible = !!computedDeadline && !state.answerReceived && daysLeft !== null && daysLeft < 0;

  function update<K extends keyof AnswerDefaultState>(key: K, value: AnswerDefaultState[K]) {
    const next = { ...state, [key]: value } as AnswerDefaultState;
    setState(next);
    writeJson(STORE_KEY, next);
  }

  function exportDefaultPacket() {
    const lines = [
      "Answer + Default Workflow Snapshot",
      "",
      `Service Date: ${state.serviceDate || "Not set"}`,
      `Answer Deadline (calculated if blank): ${computedDeadline || "Not set"}`,
      `Answer Filed: ${state.answerReceived ? "Yes" : "No"}`,
      `Responsive Motion Filed: ${state.responsiveMotion ? "Yes" : "No"}`,
      `Default Drafted: ${state.defaultDrafted ? "Yes" : "No"}`,
      `Default Filed: ${state.defaultFiled ? "Yes" : "No"}`,
      `Default Hearing Date: ${state.defaultHearingDate || "Not set"}`,
      `Clerk Entry Date: ${state.clerkEntryDate || "Not set"}`,
      `Default Judgment Date: ${state.defaultJudgmentDate || "Not set"}`,
      "",
      "Notes:",
      state.notes || ""
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "answer_default_workflow.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleLayout
      title="Answer + Default Workflow"
      subtitle="Track service, response deadlines, and default readiness. Verify all deadlines with the court rules."
      kpis={[
        { label: "Service Date", value: state.serviceDate || "TBD" },
        { label: "Answer Deadline", value: computedDeadline || "TBD", tone: daysLeft !== null && daysLeft <= 7 ? "warn" : "neutral" },
        { label: "Default Window", value: possibleDefaultEligible ? "Potentially Open" : "Not Yet", tone: possibleDefaultEligible ? "warn" : "neutral" }
      ]}
      lastUpdated="Feb 8, 2026"
      right={<Button variant="primary" size="sm" onClick={exportDefaultPacket}>Export Snapshot</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Service + Deadline</CardSubtitle>
            <CardTitle>Response Tracking</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Service Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.serviceDate}
                onChange={(e) => update("serviceDate", e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Answer Deadline (optional override)</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder={computedDeadline || "YYYY-MM-DD"}
                value={state.answerDeadline}
                onChange={(e) => update("answerDeadline", e.target.value)}
              />
            </label>
            <div className="text-xs text-slate-400">
              Calculated deadline uses 21 days from service if no override is provided. Confirm court rule timelines.
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              {daysLeft === null
                ? "Set a service date to calculate timeline."
                : daysLeft >= 0
                ? `${daysLeft} day(s) remaining to respond.`
                : `${Math.abs(daysLeft)} day(s) past the response deadline.`}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Answer Status</CardSubtitle>
            <CardTitle>Responsive Filings</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            {[
              { key: "answerReceived", label: "Answer filed/served" },
              { key: "responsiveMotion", label: "Responsive motion filed" },
              { key: "defaultDrafted", label: "Default request drafted" },
              { key: "defaultFiled", label: "Default request filed" }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state[item.key as keyof AnswerDefaultState] as boolean}
                  onChange={(e) => update(item.key as keyof AnswerDefaultState, e.target.checked as any)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Default Milestones</CardSubtitle>
            <CardTitle>Clerk + Judgment</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Default Hearing Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.defaultHearingDate}
                onChange={(e) => update("defaultHearingDate", e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Clerk Entry Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.clerkEntryDate}
                onChange={(e) => update("clerkEntryDate", e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Default Judgment Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.defaultJudgmentDate}
                onChange={(e) => update("defaultJudgmentDate", e.target.value)}
              />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Notes</CardSubtitle>
            <CardTitle>Follow-Ups</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="min-h-[200px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Track clerk communications, court confirmations, or service proof details."
              value={state.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
            {possibleDefaultEligible ? (
              <div className="mt-3 text-xs text-amber-200">
                Potential default window detected. Verify eligibility with local court rules before filing.
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
