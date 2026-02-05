import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { CaseProfile } from "../services/workflowEngine";

const STORAGE_KEY = "case_companion_doc_pack_v1";
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

export default function DocumentPackBuilder() {
  const [state, setState] = useState<PackState>(() => readJson(STORAGE_KEY, {}));
  const [notes, setNotes] = useState(() => readJson(`${STORAGE_KEY}_notes`, ""));
  const profile = readJson<CaseProfile>(PROFILE_KEY, {
    jurisdictionId: "mi",
    courtLevel: "district",
    county: "Oakland",
    filingDate: "",
    serviceDate: "",
    answerDate: "",
    discoveryServedDate: "",
    motionServedDate: "",
    pretrialDate: "",
    claimAmount: undefined,
    venueBasis: "",
    venueCounty: "Oakland"
  });

  const amountKnown = typeof profile.claimAmount === "number" && profile.claimAmount > 0;
  const amountSuggestsCircuit = amountKnown && profile.claimAmount > 25000;
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

  function saveNotes(value: string) {
    setNotes(value);
    writeJson(`${STORAGE_KEY}_notes`, value);
  }

  const completed = PACK_ITEMS.filter((item) => state[item.id]).length;
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
