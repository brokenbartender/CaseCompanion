import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";

const SETTINGS_KEY = "case_companion_settings_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";
const DAMAGES_KEY = "case_companion_damages_v1";
const DYNAMIC_EVIDENCE_KEY = "case_companion_dynamic_evidence_v1";

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
};

type TimelineEvent = { date: string; title: string; note: string };

type DamageEntry = { category: string; amount: string; evidence: string };

type DynamicEvidenceItem = {
  path: string;
  name: string;
  type: string;
  category: string;
  source: string;
  addedAt: string;
};

export default function ClientPrintPack() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Oakland County, MI"
  });
  const timeline = readJson<TimelineEvent[]>(TIMELINE_KEY, []);
  const damages = readJson<DamageEntry[]>(DAMAGES_KEY, []);
  const dynamicEvidence = readJson<DynamicEvidenceItem[]>(DYNAMIC_EVIDENCE_KEY, []);
  const evidence = [...dynamicEvidence, ...EVIDENCE_INDEX];

  return (
    <Page title="Print Pack" subtitle="Client-facing summary for quick printing.">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          Print Pack
        </button>
      </div>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Case</CardSubtitle>
            <CardTitle>Case Summary</CardTitle>
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
            <CardSubtitle>Timeline</CardSubtitle>
            <CardTitle>Key Events</CardTitle>
          </CardHeader>
          <CardBody>
            {timeline.length === 0 ? (
              <div className="text-sm text-slate-400">No timeline events yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {timeline.map((event, idx) => (
                  <li key={`${event.title}-${idx}`}>
                    {event.date || "TBD"} - {event.title}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Damages</CardSubtitle>
            <CardTitle>Claim Summary</CardTitle>
          </CardHeader>
          <CardBody>
            {damages.length === 0 ? (
              <div className="text-sm text-slate-400">No damages entries yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {damages.map((entry, idx) => (
                  <li key={`${entry.category}-${idx}`}>
                    {entry.category}: ${entry.amount || "0"}
                    {entry.evidence ? ` (Evidence: ${entry.evidence})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Evidence</CardSubtitle>
            <CardTitle>Exhibit List</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {evidence.map((item) => (
                <li key={`${item.path}-${item.name}`}>{item.name || item.path}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
