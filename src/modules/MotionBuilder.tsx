import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { MOTION_BUILDER } from "../data/motionsChecklist";
import { readJson, writeJson } from "../utils/localStore";
import { logAuditEvent } from "../utils/auditLog";

const MOTION_PACKET_KEY = "case_companion_motion_packet_v1";

type MotionPacketState = {
  motionType: string;
  hearingDate: string;
  responseDeadline: string;
  noticeReady: boolean;
  briefReady: boolean;
  exhibitsReady: boolean;
  proposedOrderReady: boolean;
  serviceReady: boolean;
  notes: string;
};

const OUTLINE_TEMPLATES: Record<string, string[]> = {
  "Summary Disposition": [
    "Caption + Case Info",
    "Relief Requested",
    "Statement of Facts (with citations)",
    "Standard of Review",
    "Argument (elements and undisputed facts)",
    "Conclusion + Proposed Order"
  ],
  "Motion to Compel": [
    "Caption + Case Info",
    "Relief Requested",
    "Discovery Background",
    "Good Faith / Conferral Statement",
    "Argument (rules + relevance)",
    "Conclusion + Proposed Order"
  ],
  "Motion in Limine": [
    "Caption + Case Info",
    "Relief Requested",
    "Facts/Context",
    "Legal Standard",
    "Argument (exclude specific evidence)",
    "Conclusion + Proposed Order"
  ]
};

export default function MotionBuilder() {
  const [state, setState] = useState<MotionPacketState>(() =>
    readJson(MOTION_PACKET_KEY, {
      motionType: "",
      hearingDate: "",
      responseDeadline: "",
      noticeReady: false,
      briefReady: false,
      exhibitsReady: false,
      proposedOrderReady: false,
      serviceReady: false,
      notes: ""
    })
  );
  const [exportStatus, setExportStatus] = useState("");
  const [outline, setOutline] = useState("");

  function update<K extends keyof MotionPacketState>(key: K, value: MotionPacketState[K]) {
    const next = { ...state, [key]: value } as MotionPacketState;
    setState(next);
    writeJson(MOTION_PACKET_KEY, next);
  }

  function exportMotionPacket() {
    const lines = [
      "Motion Packet Snapshot",
      "",
      `Motion Type: ${state.motionType || "Not set"}`,
      `Hearing Date: ${state.hearingDate || "Not set"}`,
      `Response Deadline: ${state.responseDeadline || "Not set"}`,
      `Notice Ready: ${state.noticeReady ? "Yes" : "No"}`,
      `Brief Ready: ${state.briefReady ? "Yes" : "No"}`,
      `Exhibits Ready: ${state.exhibitsReady ? "Yes" : "No"}`,
      `Proposed Order Ready: ${state.proposedOrderReady ? "Yes" : "No"}`,
      `Service Plan Ready: ${state.serviceReady ? "Yes" : "No"}`,
      "",
      "Notes:",
      state.notes || ""
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motion_packet_snapshot.txt";
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus("Motion packet exported.");
    setTimeout(() => setExportStatus(""), 2000);
    logAuditEvent("Motion packet exported", { motionType: state.motionType });
  }

  function generateOutline() {
    const type = state.motionType.trim();
    const template = OUTLINE_TEMPLATES[type] || [
      "Caption + Case Info",
      "Relief Requested",
      "Statement of Facts (with citations)",
      "Legal Standard",
      "Argument",
      "Conclusion + Proposed Order"
    ];
    const lines = [
      `Motion Outline: ${type || "General Motion"}`,
      "",
      ...template.map((item, idx) => `${idx + 1}. ${item}`)
    ];
    setOutline(lines.join("\n"));
    logAuditEvent("Motion outline generated", { motionType: type || "General Motion" });
  }

  return (
    <Page title="Motion Builder" subtitle="Structure motions and summary disposition packets.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Packet Tracker</CardSubtitle>
            <CardTitle>Motion Readiness</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Motion Type</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Summary Disposition, Motion to Compel, etc."
                value={state.motionType}
                onChange={(e) => update("motionType", e.target.value)}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 block">
                <span className="text-xs text-slate-400">Hearing Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={state.hearingDate}
                  onChange={(e) => update("hearingDate", e.target.value)}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-slate-400">Response Deadline</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={state.responseDeadline}
                  onChange={(e) => update("responseDeadline", e.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-2">
              {[
                { key: "noticeReady", label: "Notice of hearing/brief ready" },
                { key: "briefReady", label: "Motion brief drafted" },
                { key: "exhibitsReady", label: "Exhibits tabbed + indexed" },
                { key: "proposedOrderReady", label: "Proposed order drafted" },
                { key: "serviceReady", label: "Service plan confirmed" }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state[item.key as keyof MotionPacketState] as boolean}
                    onChange={(e) => update(item.key as keyof MotionPacketState, e.target.checked as any)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={exportMotionPacket}
              className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Export Motion Packet Snapshot
            </button>
            {exportStatus ? <div className="text-xs text-emerald-200">{exportStatus}</div> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Notes</CardSubtitle>
            <CardTitle>Strategy + Scheduling</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="min-h-[220px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Track motion strategy, relief requested, and scheduling details."
              value={state.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {MOTION_BUILDER.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardSubtitle>Checklist</CardSubtitle>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                {section.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Card className="mb-6">
          <CardHeader>
            <CardSubtitle>Drafting Assistant</CardSubtitle>
            <CardTitle>Motion Outline</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateOutline}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Generate Outline
              </button>
            </div>
            <textarea
              className="mt-3 min-h-[180px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Click Generate Outline to create a drafting scaffold."
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Praecipe</CardSubtitle>
            <CardTitle>ePraecipe Quick Start</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Confirm whether your motion requires a praecipe.</li>
              <li>Use the county ePraecipe system if required.</li>
              <li>Attach the praecipe confirmation to your filing notes.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
