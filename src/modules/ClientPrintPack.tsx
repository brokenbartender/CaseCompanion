import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { computeRuleDeadlines, CaseProfile } from "../services/workflowEngine";

const SETTINGS_KEY = "case_companion_settings_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";
const DAMAGES_KEY = "case_companion_damages_v1";
const DYNAMIC_EVIDENCE_KEY = "case_companion_dynamic_evidence_v1";
const PROFILE_KEY = "case_companion_case_profile_v1";
const HOLIDAYS_KEY = "case_companion_holidays_v1";
const PACKET_LAYOUT_KEY = "case_companion_packet_layout_v1";
const PACKET_OUTPUTS_KEY = "case_companion_packet_outputs_v1";
const PREFILE_AUDIT_KEY = "case_companion_prefile_audit_v1";

const PACKET_SECTIONS = [
  { id: "incident", label: "Incident Documentation" },
  { id: "medical", label: "Medical Evidence" },
  { id: "negligence", label: "Employer Negligence Evidence" },
  { id: "retaliation", label: "Retaliation Evidence" },
  { id: "wage-theft", label: "Wage Theft Evidence" },
  { id: "workers-comp", label: "Workers’ Comp Evidence" },
  { id: "misconduct", label: "Additional Misconduct Evidence" }
];

const PACKET_OUTPUTS = [
  { id: "evidence-index", label: "Evidence Index" },
  { id: "case-summary", label: "Case Summary" },
  { id: "master-timeline", label: "Master Timeline" },
  { id: "retaliation-timeline", label: "Retaliation Timeline" },
  { id: "termination-summary", label: "Termination Summary" },
  { id: "wc-summary", label: "Workers’ Comp Violation Summary" },
  { id: "damages-summary", label: "Damages Summary" },
  { id: "wage-loss-summary", label: "Wage Loss Summary" },
  { id: "medical-summary", label: "Medical Records Summary" },
  { id: "key-facts", label: "Key Facts One‑Pager" },
  { id: "case-value", label: "Why This Case Has Value" },
  { id: "counsel-needs", label: "What I Need From Counsel" },
  { id: "questions", label: "Questions for Attorneys" }
];

const PREFILE_AUDIT = [
  { id: "scao", label: "SCAO formatting check" },
  { id: "signature", label: "Signature blocks verified" },
  { id: "pii", label: "PII redacted + MC 97 completed" },
  { id: "deadlines", label: "Deadlines verified" },
  { id: "service", label: "Service method confirmed" },
  { id: "exhibit-index", label: "Exhibit index linked" },
  { id: "packet-layout", label: "Packet layout sections complete" },
  { id: "attachments", label: "Required attachments included" }
];

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
    jurisdiction: "Michigan (County TBD)"
  });
  const timeline = readJson<TimelineEvent[]>(TIMELINE_KEY, []);
  const damages = readJson<DamageEntry[]>(DAMAGES_KEY, []);
  const dynamicEvidence = readJson<DynamicEvidenceItem[]>(DYNAMIC_EVIDENCE_KEY, []);
  const evidence = [...dynamicEvidence, ...EVIDENCE_INDEX];
  const packetLayout = readJson<Record<string, boolean>>(PACKET_LAYOUT_KEY, {});
  const packetOutputs = readJson<Record<string, boolean>>(PACKET_OUTPUTS_KEY, {});
  const preFileAudit = readJson<Record<string, boolean>>(PREFILE_AUDIT_KEY, {});
  const profile = readJson<CaseProfile>(PROFILE_KEY, {
    jurisdictionId: "mi",
    courtLevel: "district",
    county: "Unknown",
    filingDate: "",
    serviceDate: "",
    answerDate: ""
  });
  const holidays = readJson<string[]>(HOLIDAYS_KEY, []);
  const ruleDeadlines = computeRuleDeadlines(profile, holidays);
  const layoutMissing = PACKET_SECTIONS.filter((item) => !packetLayout[item.id]);
  const outputsMissing = PACKET_OUTPUTS.filter((item) => !packetOutputs[item.id]);
  const auditMissing = PREFILE_AUDIT.filter((item) => !preFileAudit[item.id]);

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
            <CardSubtitle>Rule Deadlines</CardSubtitle>
            <CardTitle>Procedural Timeline</CardTitle>
          </CardHeader>
          <CardBody>
            {ruleDeadlines.length === 0 ? (
              <div className="text-sm text-slate-400">No rule-based deadlines yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {ruleDeadlines.map((item) => (
                  <li key={item.id}>
                    {(item.dueDate || "Manual")} - {item.label} ({item.rule.source.citation})
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

        <Card>
          <CardHeader>
            <CardSubtitle>Packet Readiness</CardSubtitle>
            <CardTitle>Export Gate Status</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2 text-sm text-slate-300">
              <div>Layout complete: {PACKET_SECTIONS.length - layoutMissing.length}/{PACKET_SECTIONS.length}</div>
              <div>Outputs complete: {PACKET_OUTPUTS.length - outputsMissing.length}/{PACKET_OUTPUTS.length}</div>
              <div>Pre‑file audit complete: {PREFILE_AUDIT.length - auditMissing.length}/{PREFILE_AUDIT.length}</div>
            </div>
            {(layoutMissing.length || outputsMissing.length || auditMissing.length) ? (
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                {layoutMissing.length ? (
                  <div>Missing sections: {layoutMissing.map((item) => item.label).join(", ")}</div>
                ) : null}
                {outputsMissing.length ? (
                  <div>Missing outputs: {outputsMissing.map((item) => item.label).join(", ")}</div>
                ) : null}
                {auditMissing.length ? (
                  <div>Audit items remaining: {auditMissing.map((item) => item.label).join(", ")}</div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 text-xs text-emerald-200">Packet ready for export.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
