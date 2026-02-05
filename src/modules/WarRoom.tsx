import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { PROCEDURE_STEPS } from "../data/procedureSteps";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson } from "../utils/localStore";

const CHECKLIST_KEY = "case_companion_checklist_v1";
const DEADLINES_KEY = "case_companion_deadlines_v1";
const SETTINGS_KEY = "case_companion_settings_v1";
const DYNAMIC_EVIDENCE_KEY = "case_companion_dynamic_evidence_v1";

type ChecklistState = Record<string, Record<string, boolean>>;

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
};

type Deadline = { date: string; title: string; note: string };

type DynamicEvidenceItem = {
  path: string;
  name: string;
  type: string;
  category: string;
  source: string;
  addedAt: string;
};

export default function WarRoom() {
  const checklistState = readJson<ChecklistState>(CHECKLIST_KEY, {});
  const focusIndex = Math.max(
    0,
    PROCEDURE_STEPS.findIndex((step) => step.checklist.some((task) => !checklistState?.[step.id]?.[task]))
  );
  const focusStep = PROCEDURE_STEPS[focusIndex] || PROCEDURE_STEPS[0];
  const nextTask = focusStep?.checklist.find((task) => !checklistState?.[focusStep.id]?.[task]);
  const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []).slice(0, 5);
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Oakland County, MI"
  });
  const dynamicEvidence = readJson<DynamicEvidenceItem[]>(DYNAMIC_EVIDENCE_KEY, []);
  const evidenceList = [...dynamicEvidence, ...EVIDENCE_INDEX].slice(0, 6);

  return (
    <Page title="War Room" subtitle="Single-screen focus for filings, evidence, and trial readiness.">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border border-amber-400/30 bg-amber-500/10">
            <CardHeader>
              <CardSubtitle>Locked Focus</CardSubtitle>
              <CardTitle>Today's Task</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-200">{nextTask || "Complete Case Settings."}</div>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="/checklist"
                  className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
                >
                  Open Checklist
                </a>
                <a
                  href="/timeline"
                  className="rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
                >
                  Open Timeline
                </a>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Case</CardSubtitle>
              <CardTitle>Current Snapshot</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2 text-sm text-slate-300">
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
              <CardSubtitle>Stage</CardSubtitle>
              <CardTitle>Procedural Roadmap</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {PROCEDURE_STEPS.map((step, index) => (
                  <Badge key={step.id} tone={index === focusIndex ? "amber" : "slate"}>
                    {step.title}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Focus stage: {focusStep.title}. {focusStep.summary}
              </div>
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
              <a href="/deadlines" className="mt-3 inline-flex text-xs text-amber-200">Open Deadlines</a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Evidence</CardSubtitle>
              <CardTitle>Top Exhibits</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                {evidenceList.map((item) => (
                  <li key={`${item.path}-${item.name}`}>{item.name || item.path}</li>
                ))}
              </ul>
              <a href="/evidence" className="mt-3 inline-flex text-xs text-amber-200">Open Evidence Vault</a>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Quick Reference</CardSubtitle>
              <CardTitle>Rules Sidebar</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>MCR Chapter 2 (Civil Procedure)</li>
                <li>Michigan Civil Benchbook</li>
                <li>Service of Process Table</li>
                <li>Summary Disposition Table</li>
                <li>Evidence Standards (video, authenticity)</li>
              </ul>
              <a href="/rules" className="mt-3 inline-flex text-xs text-amber-200">Open Rules Library</a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Trial Tools</CardSubtitle>
              <CardTitle>Fast Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2">
                <a href="/trial-mode" className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900">
                  Enter Trial Mode
                </a>
                <a href="/video-sync" className="rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200">
                  Open Video Sync
                </a>
                <a href="/print-pack" className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-100">
                  Generate Print Pack
                </a>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
