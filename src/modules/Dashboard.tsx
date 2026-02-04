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
  const focusIndex = 1;
  const focusStep = PROCEDURE_STEPS[focusIndex];
  const progress = computeProgress(readJson(CHECKLIST_KEY, {}));
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Oakland County, MI"
  });
  const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []).slice(0, 3);

  return (
    <Page
      title="Dashboard"
      subtitle="Your civil procedure hub with rule-linked guidance, tasks, and evidence."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
