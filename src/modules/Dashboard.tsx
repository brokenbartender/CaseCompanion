import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { PROCEDURE_STEPS } from "../data/procedureSteps";
import { readJson } from "../utils/localStore";

const CHECKLIST_KEY = "case_companion_checklist_v1";
const SETTINGS_KEY = "case_companion_settings_v1";
const DEADLINES_KEY = "case_companion_deadlines_v1";

type ChecklistState = Record<string, Record<string, boolean>>;

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
};

type Deadline = { date: string; title: string; note: string };

function computeProgress(state: ChecklistState) {
  let done = 0;
  let total = 0;
  for (const step of PROCEDURE_STEPS) {
    for (const task of step.checklist) {
      total += 1;
      if (state?.[step.id]?.[task]) done += 1;
    }
  }
  return { done, total };
}

export default function Dashboard() {
  const checklistState = readJson<Record<string, Record<string, boolean>>>(CHECKLIST_KEY, {});
  const progress = computeProgress(checklistState);
  const focusIndex = Math.max(
    0,
    PROCEDURE_STEPS.findIndex((step) =>
      step.checklist.some((task) => !checklistState?.[step.id]?.[task])
    )
  );
  const focusStep = PROCEDURE_STEPS[focusIndex] || PROCEDURE_STEPS[0];
  const nextTask = focusStep?.checklist.find((task) => !checklistState?.[focusStep.id]?.[task]);
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Michigan (County TBD)"
  });
  const reconnectState = readJson<Record<string, boolean>>("case_companion_mifile_reconnect_v1", {});
  const reconnectDone = Object.values(reconnectState).filter(Boolean).length >= 4;
  const reconnectCompletedAt = readJson<string>("case_companion_mifile_reconnect_status_v1", "");
  const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []).slice(0, 3);
  const todayTask = nextTask || "Complete case setup in Case Settings.";

  return (
    <Page
      title="Dashboard"
      subtitle="Your civil procedure hub with rule-linked guidance, tasks, and evidence."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3 border border-amber-400/30 bg-amber-500/10">
          <CardHeader>
            <CardSubtitle>Locked Focus</CardSubtitle>
            <CardTitle>Today’s Task</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-200">{todayTask}</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/guided-start"
                className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                Continue Guided Start
              </a>
              <a
                href="/checklist"
                className="rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
              >
                Open Checklist
              </a>
            </div>
          </CardBody>
        </Card>
        {(!settings.caseName || !settings.court) ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardSubtitle>Setup</CardSubtitle>
              <CardTitle>Complete setup</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">
                Add your case info in Case Settings to personalize the dashboard.
              </div>
              <a href="/settings" className="mt-3 inline-flex text-sm text-amber-300">Go to Case Settings</a>
            </CardBody>
          </Card>
        ) : null}

        {!reconnectDone && !reconnectCompletedAt ? (
          <Card className="lg:col-span-3 border border-amber-400/30 bg-amber-500/10">
            <CardHeader>
              <CardSubtitle>MiFILE Notice</CardSubtitle>
              <CardTitle>Reconnect Reminder</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-200">
                If you stop receiving e‑service notices, run the MiFILE Reconnect checklist.
              </div>
              <a
                href="/mifile-reconnect"
                className="mt-3 inline-flex rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                Open MiFILE Reconnect
              </a>
            </CardBody>
          </Card>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Current Stage</CardSubtitle>
            <CardTitle>Procedural Roadmap</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {PROCEDURE_STEPS.map((step, index) => (
                <Badge key={step.id} tone={index === focusIndex ? "amber" : "slate"}>{step.title}</Badge>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-300">
              Focus stage: {focusStep.title}. {focusStep.summary}
            </div>
            {nextTask ? (
              <div className="mt-2 text-xs text-amber-200">
                Next action: {nextTask}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Progress</CardSubtitle>
            <CardTitle>Checklist Status</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Completed {progress.done} of {progress.total} tasks.
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Case</CardSubtitle>
            <CardTitle>Case Settings</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300 space-y-1">
              <div>Case: {settings.caseName || "Not set"}</div>
              <div>Court: {settings.court || "Not set"}</div>
              <div>Judge: {settings.judge || "Not set"}</div>
              <div>Case #: {settings.caseNumber || "Not set"}</div>
              <div>Jurisdiction: {settings.jurisdiction || "Not set"}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Next Actions</CardSubtitle>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-sm text-slate-300">
              {focusStep.checklist.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
            <a
              href="/guided-start"
              className="mt-4 inline-flex rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Open Guided Start
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Deadlines</CardSubtitle>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardBody>
            {deadlines.length === 0 ? (
              <div className="text-sm text-slate-400">No deadlines yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {deadlines.map((d, idx) => (
                  <li key={`${d.title}-${idx}`}>{d.date || "TBD"} - {d.title}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Evidence</CardSubtitle>
            <CardTitle>Vault Status</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Evidence vault is ready. Link exhibits to timeline events and procedural steps.
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Rules Sources</CardSubtitle>
            <CardTitle>Reference Library</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>MCR Chapter 2 (Civil Procedure)</li>
              <li>Michigan Civil Proceedings Benchbook</li>
              <li>Civil Process Handbook (Service of Process)</li>
              <li>Service of Process Table</li>
              <li>Summary Disposition Table</li>
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Disclaimers</CardSubtitle>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-300">
              This app organizes information and links to rules. It does not provide legal advice.
              Use official court rules and court guidance for authoritative instructions.
            </p>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
