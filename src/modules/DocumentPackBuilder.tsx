import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { CaseProfile } from "../services/workflowEngine";
import { api } from "../services/api";
import { getWorkspaceId, getMatterId } from "../services/authStorage";

const STORAGE_KEY = "case_companion_doc_pack_v1";
const PACKET_LAYOUT_KEY = "case_companion_packet_layout_v1";
const PACKET_OUTPUTS_KEY = "case_companion_packet_outputs_v1";
const PREFILE_AUDIT_KEY = "case_companion_prefile_audit_v1";
const PROFILE_KEY = "case_companion_case_profile_v1";

type PackState = Record<string, boolean>;

const PACK_ITEMS = [
  { id: "mc01", label: "Summons (MC 01) prepared as PDF" },
  { id: "mc01a", label: "Complaint (MC 01a or custom complaint) as PDF" },
  { id: "mc20", label: "Fee waiver request (MC 20) if needed" },
  { id: "mc97", label: "Protected PII form (MC 97) if needed" },
  { id: "labels", label: "Each file labeled correctly in MiFILE" },
  { id: "separate", label: "Each document is a separate PDF (no bundling)" }
];

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
  { id: "scao", label: "SCAO formatting check (margins, font, caption)" },
  { id: "signature", label: "Signature blocks verified" },
  { id: "pii", label: "PII redacted + MC 97 completed if needed" },
  { id: "deadlines", label: "Deadlines verified against court calendar" },
  { id: "service", label: "Service method confirmed + proof plan ready" },
  { id: "exhibit-index", label: "Exhibit index linked to evidence" },
  { id: "packet-layout", label: "Packet layout sections complete" },
  { id: "attachments", label: "All required attachments included" }
];

export default function DocumentPackBuilder() {
  const [state, setState] = useState<PackState>(() => readJson(STORAGE_KEY, {}));
  const [packetLayout, setPacketLayout] = useState<PackState>(() => readJson(PACKET_LAYOUT_KEY, {}));
  const [packetOutputs, setPacketOutputs] = useState<PackState>(() => readJson(PACKET_OUTPUTS_KEY, {}));
  const [preFileAudit, setPreFileAudit] = useState<PackState>(() => readJson(PREFILE_AUDIT_KEY, {}));
  const [notes, setNotes] = useState(() => readJson(`${STORAGE_KEY}_notes`, ""));
  const profile = readJson<CaseProfile>(PROFILE_KEY, {
    jurisdictionId: "mi",
    courtLevel: "district",
    county: "Unknown",
    filingDate: "",
    serviceDate: "",
    answerDate: "",
    discoveryServedDate: "",
    motionServedDate: "",
    pretrialDate: "",
    claimAmount: undefined,
    venueBasis: "",
    venueCounty: "Unknown"
  });

  const claimAmount = profile.claimAmount ?? 0;
  const amountKnown = claimAmount > 0;
  const amountSuggestsCircuit = amountKnown && claimAmount > 25000;
  const courtMismatch =
    (amountSuggestsCircuit && profile.courtLevel === "district") ||
    (!amountSuggestsCircuit && amountKnown && profile.courtLevel === "circuit");
  const missingVenue = !profile.venueBasis || !profile.venueCounty;
  const blockExport = courtMismatch || missingVenue;

  function toggle(id: string) {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    writeJson(STORAGE_KEY, next);
  }

  function togglePacketLayout(id: string) {
    const next = { ...packetLayout, [id]: !packetLayout[id] };
    setPacketLayout(next);
    writeJson(PACKET_LAYOUT_KEY, next);
  }

  function togglePacketOutput(id: string) {
    const next = { ...packetOutputs, [id]: !packetOutputs[id] };
    setPacketOutputs(next);
    writeJson(PACKET_OUTPUTS_KEY, next);
  }

  function togglePreFileAudit(id: string) {
    const next = { ...preFileAudit, [id]: !preFileAudit[id] };
    setPreFileAudit(next);
    writeJson(PREFILE_AUDIT_KEY, next);
  }

  function saveNotes(value: string) {
    setNotes(value);
    writeJson(`${STORAGE_KEY}_notes`, value);
  }

  const completed = PACK_ITEMS.filter((item) => state[item.id]).length;
  const layoutCompleted = PACKET_SECTIONS.filter((item) => packetLayout[item.id]).length;
  const outputsCompleted = PACKET_OUTPUTS.filter((item) => packetOutputs[item.id]).length;
  const preFileCompleted = PREFILE_AUDIT.filter((item) => preFileAudit[item.id]).length;
  const preFileReady = preFileCompleted === PREFILE_AUDIT.length;
  const exportLines = [
    "CaseCompanion Filing Packet Checklist",
    "",
    ...PACK_ITEMS.map((item) => `- [${state[item.id] ? "x" : " "}] ${item.label}`),
    "",
    "Notes:",
    notes || ""
  ];

  function exportPacket() {
    const blob = new Blob([exportLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filing_packet_checklist.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportEvidencePacketLayout() {
    const payload = {
      title: "Evidence Packet Layout",
      updatedAt: new Date().toISOString(),
      sections: PACKET_SECTIONS.map((item) => ({
        id: item.id,
        label: item.label,
        complete: Boolean(packetLayout[item.id])
      })),
      outputs: PACKET_OUTPUTS.map((item) => ({
        id: item.id,
        label: item.label,
        complete: Boolean(packetOutputs[item.id])
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evidence_packet_layout.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const [exportStatus, setExportStatus] = useState("");
  const workspaceId = getWorkspaceId();
  const matterId = getMatterId();
  const exportDisabled = !workspaceId || !matterId || !preFileReady;

  async function downloadPacket(path: string, filename: string) {
    try {
      const url = await api.downloadBlobUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("Packet downloaded.");
    } catch (err: any) {
      setExportStatus(err?.message || "Packet download failed.");
    }
  }

  return (
    <Page title="A-to-Z Document Pack" subtitle="Build your filing packet step-by-step.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Status</CardSubtitle>
            <CardTitle>Pack Progress</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Completed {completed} of {PACK_ITEMS.length} items.
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Use this checklist to keep documents separate and court-ready.
            </div>
            <button
              type="button"
              onClick={exportPacket}
              disabled={blockExport}
              className={`mt-4 w-full rounded-md px-3 py-2 text-sm font-semibold ${
                blockExport ? "bg-slate-700 text-slate-400" : "bg-amber-500 text-slate-900"
              }`}
            >
              Export Packet Checklist
            </button>
            {blockExport ? (
              <div className="mt-3 text-xs text-amber-200">
                Complete venue and court checks in Filing Flow before exporting.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Checklist</CardSubtitle>
            <CardTitle>Document Pack Items</CardTitle>
          </CardHeader>
          <CardBody>
            {courtMismatch || missingVenue ? (
              <div className="mb-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Guardrail active: fix court level or venue basis in Filing Flow to proceed with complaint/service packet.
                <div className="mt-2">
                  <a href="/filing-flow" className="text-amber-200 underline">Open Filing Flow</a>
                </div>
              </div>
            ) : null}
            <ul className="space-y-2 text-sm text-slate-300">
              {PACK_ITEMS.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-400"
                    checked={Boolean(state[item.id])}
                    onChange={() => toggle(item.id)}
                  />
                  <span className={state[item.id] ? "text-slate-400 line-through" : ""}>{item.label}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Exports</CardSubtitle>
            <CardTitle>Packet Downloads</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 text-sm text-slate-300">
              <button
                type="button"
                onClick={() => downloadPacket(`/workspaces/${workspaceId}/matters/${matterId}/filing-packet`, "filing_packet.zip")}
                disabled={exportDisabled}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  exportDisabled ? "bg-slate-700 text-slate-400" : "bg-amber-500 text-slate-900"
                }`}
              >
                Download Filing Packet
              </button>
              <button
                type="button"
                onClick={() => downloadPacket(`/workspaces/${workspaceId}/matters/${matterId}/service-packet`, "service_packet.zip")}
                disabled={exportDisabled}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  exportDisabled ? "bg-slate-700 text-slate-400" : "border border-amber-400/60 text-amber-200"
                }`}
              >
                Download Service Packet
              </button>
              <button
                type="button"
                onClick={() => downloadPacket(`/workspaces/${workspaceId}/matters/${matterId}/trial-binder`, "trial_binder.zip")}
                disabled={exportDisabled}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  exportDisabled ? "bg-slate-700 text-slate-400" : "border border-amber-400/60 text-amber-200"
                }`}
              >
                Download Trial Binder
              </button>
              {exportDisabled ? (
                <div className="text-xs text-amber-200">
                  Set workspace + matter in Case Settings and complete the pre-file audit to enable downloads.
                </div>
              ) : null}
              {exportStatus ? <div className="text-xs text-amber-200">{exportStatus}</div> : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Court Compliance Gate</CardSubtitle>
            <CardTitle>Pre‑File Audit</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Completed {preFileCompleted} of {PREFILE_AUDIT.length} items.
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {PREFILE_AUDIT.map((item) => (
                <label key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    checked={Boolean(preFileAudit[item.id])}
                    onChange={() => togglePreFileAudit(item.id)}
                  />
                  <span className={preFileAudit[item.id] ? "text-slate-400 line-through" : ""}>{item.label}</span>
                </label>
              ))}
            </div>
            {!preFileReady ? (
              <div className="mt-3 text-xs text-amber-200">
                Pre-file audit must be complete before downloads are enabled.
              </div>
            ) : (
              <div className="mt-3 text-xs text-emerald-200">Pre-file audit complete.</div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Evidence Packet</CardSubtitle>
            <CardTitle>Layout Progress</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Sections complete {layoutCompleted} of {PACKET_SECTIONS.length}.
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Outputs complete {outputsCompleted} of {PACKET_OUTPUTS.length}.
            </div>
            <div className="mt-3 text-xs text-slate-400">
              These are the court‑ready packet sections derived from the Evidence Index.
            </div>
            <button
              type="button"
              onClick={exportEvidencePacketLayout}
              className="mt-4 w-full rounded-md bg-emerald-400/90 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Export Packet Layout
            </button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Layout Sections</CardSubtitle>
            <CardTitle>Evidence Packet Sections</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {PACKET_SECTIONS.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    checked={Boolean(packetLayout[item.id])}
                    onChange={() => togglePacketLayout(item.id)}
                  />
                  <span className={packetLayout[item.id] ? "text-slate-400 line-through" : ""}>{item.label}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Packet Outputs</CardSubtitle>
            <CardTitle>Required Documents</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {PACKET_OUTPUTS.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    checked={Boolean(packetOutputs[item.id])}
                    onChange={() => togglePacketOutput(item.id)}
                  />
                  <span className={packetOutputs[item.id] ? "text-slate-400 line-through" : ""}>{item.label}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>File Naming</CardSubtitle>
            <CardTitle>Suggested Labels</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Summons - MC 01</li>
              <li>Complaint - MC 01a</li>
              <li>Fee Waiver - MC 20 (if used)</li>
              <li>Protected PII - MC 97 (if used)</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Notes</CardSubtitle>
            <CardTitle>Clerk Requirements</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={6}
              placeholder="Add notes about local clerk requirements or formatting."
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
            />
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
