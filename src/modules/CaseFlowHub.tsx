import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { readJson, writeJson } from "../utils/localStore";
import { CASE_CONTEXT } from "../config/caseContext";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";

const PROFILE_KEY = "case_companion_case_profile_v1";
const ANSWER_KEY = "case_companion_answer_default_v1";
const DOC_PACK_KEY = "case_companion_doc_pack_v1";
const PACKET_LAYOUT_KEY = "case_companion_packet_layout_v1";
const PACKET_OUTPUTS_KEY = "case_companion_packet_outputs_v1";
const PREFILE_AUDIT_KEY = "case_companion_prefile_audit_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";
const DAMAGES_KEY = "case_companion_damages_summary_v1";
const MOTION_KEY = "case_companion_motion_packet_v1";
const TRIAL_PREP_KEY = "case_companion_trial_prep_v1";
const JUDGMENT_KEY = "case_companion_judgment_v1";
const OVERRIDE_KEY = "case_companion_caseflow_overrides_v1";

const PACKET_SECTIONS = [
  "incident",
  "medical",
  "negligence",
  "retaliation",
  "wage-theft",
  "workers-comp",
  "misconduct"
];

const PACKET_OUTPUTS = [
  "evidence-index",
  "case-summary",
  "master-timeline",
  "retaliation-timeline",
  "termination-summary",
  "wc-summary",
  "damages-summary",
  "wage-loss-summary",
  "medical-summary",
  "key-facts",
  "case-value",
  "counsel-needs",
  "questions"
];

const PREFILE_AUDIT = [
  "scao",
  "signature",
  "pii",
  "deadlines",
  "service",
  "exhibit-index",
  "packet-layout",
  "attachments"
];

type StepRequirement = { label: string; done: boolean };

function countCompleted(map: Record<string, boolean>, ids: string[]) {
  return ids.filter((id) => map?.[id]).length;
}

function isComplete(map: Record<string, boolean>, ids: string[]) {
  return ids.every((id) => Boolean(map?.[id]));
}

function getStepTone(status: string) {
  if (status.includes("Complete")) return "good";
  if (status.includes("Blocked")) return "warn";
  if (status.includes("In Progress")) return "warn";
  return "neutral";
}

export default function CaseFlowHub() {
  const navigate = useNavigate();
  const profile = readJson<any>(PROFILE_KEY, {});
  const answer = readJson<any>(ANSWER_KEY, {});
  const docPack = readJson<Record<string, boolean>>(DOC_PACK_KEY, {});
  const packetLayout = readJson<Record<string, boolean>>(PACKET_LAYOUT_KEY, {});
  const packetOutputs = readJson<Record<string, boolean>>(PACKET_OUTPUTS_KEY, {});
  const preFileAudit = readJson<Record<string, boolean>>(PREFILE_AUDIT_KEY, {});
  const timeline = readJson<any[]>(TIMELINE_KEY, []);
  const damagesSummary = readJson<string>(DAMAGES_KEY, "");
  const motionPacket = readJson<any>(MOTION_KEY, {});
  const trialPrep = readJson<any>(TRIAL_PREP_KEY, {});
  const judgment = readJson<any>(JUDGMENT_KEY, {});
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => readJson(OVERRIDE_KEY, {}));

  const evidenceCount = EVIDENCE_INDEX.length + readJson<any[]>("case_companion_dynamic_evidence_v1", []).length;

  const steps = useMemo(() => {
    const intakeReqs: StepRequirement[] = [
      { label: "Jurisdiction + court level set", done: Boolean(profile.jurisdictionId && profile.courtLevel) },
      { label: "County selected", done: Boolean(profile.county) }
    ];

    const complaintReqs: StepRequirement[] = [
      { label: "Complaint drafted", done: Boolean(packetOutputs["case-summary"]) },
      { label: "Key facts prepared", done: Boolean(packetOutputs["key-facts"]) },
      { label: "Filing date set", done: Boolean(profile.filingDate) }
    ];

    const serviceReqs: StepRequirement[] = [
      { label: "Summons + complaint packet", done: Boolean(docPack.mc01) && Boolean(docPack.mc01a) },
      { label: "Service date set", done: Boolean(profile.serviceDate) }
    ];

    const answerReqs: StepRequirement[] = [
      { label: "Answer received", done: Boolean(answer.answerReceived) },
      { label: "Default request filed", done: Boolean(answer.defaultFiled) },
      { label: "Default judgment date (if applicable)", done: Boolean(answer.defaultJudgmentDate) }
    ];

    const discoveryReqs: StepRequirement[] = [
      { label: "Initial disclosures prepared", done: Boolean(packetOutputs["master-timeline"]) },
      { label: "Discovery served date", done: Boolean(profile.discoveryServedDate) }
    ];

    const motionReqs: StepRequirement[] = [
      { label: "Motion packet drafted", done: Boolean(motionPacket.noticeReady) && Boolean(motionPacket.briefReady) },
      { label: "Motion served date", done: Boolean(profile.motionServedDate) }
    ];

    const trialReqs: StepRequirement[] = [
      { label: "Trial notebook exported", done: Boolean(trialPrep?.notebookExported) },
      { label: "Witness list ready", done: Boolean(trialPrep?.witnessesReady) },
      { label: "Pretrial date set", done: Boolean(profile.pretrialDate) }
    ];

    const judgmentReqs: StepRequirement[] = [
      { label: "Judgment date set", done: Boolean(judgment?.judgmentDate) },
      { label: "Collection plan created", done: Boolean(judgment?.collectionPlanReady) }
    ];

    const exportReqs: StepRequirement[] = [
      { label: "Packet sections complete", done: isComplete(packetLayout, PACKET_SECTIONS) },
      { label: "Packet outputs complete", done: isComplete(packetOutputs, PACKET_OUTPUTS) },
      { label: "Prefile audit complete", done: isComplete(preFileAudit, PREFILE_AUDIT) }
    ];

    return [
      { key: "intake", label: "Intake & Routing", route: "/case-status", requirements: intakeReqs },
      { key: "pleading", label: "Claims & Complaint", route: "/filing-flow", requirements: complaintReqs },
      { key: "service", label: "Summons & Service", route: "/service", requirements: serviceReqs },
      { key: "answer", label: "Answer + Default", route: "/answer-default", requirements: answerReqs },
      { key: "discovery", label: "Initial Disclosures + Discovery", route: "/discovery", requirements: discoveryReqs },
      { key: "motions", label: "Motions", route: "/motion-builder", requirements: motionReqs },
      { key: "trialPrep", label: "Trial Prep", route: "/trial-prep", requirements: trialReqs },
      { key: "judgment", label: "Judgment & Collection", route: "/judgment", requirements: judgmentReqs },
      { key: "export", label: "Export Packets", route: "/doc-pack", requirements: exportReqs }
    ];
  }, [profile, packetOutputs, docPack, answer, packetLayout, preFileAudit, motionPacket, trialPrep, judgment]);

  const stepStatuses = useMemo(() => {
    const statuses: Record<string, { status: string; blocked: boolean; done: boolean }> = {};
    let priorComplete = true;
    for (const step of steps) {
      const manual = overrides[step.key];
      const allDone = step.requirements.every((req) => req.done);
      const done = manual || allDone;
      const blocked = !priorComplete;
      let status = "Not Started";
      if (manual) status = "Complete (Manual)";
      else if (done) status = "Complete";
      else if (blocked) status = "Blocked";
      else if (step.requirements.some((req) => req.done)) status = "In Progress";
      statuses[step.key] = { status, blocked, done };
      priorComplete = priorComplete && done;
    }
    return statuses;
  }, [steps, overrides]);

  const completedSteps = steps.filter((step) => stepStatuses[step.key]?.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const nextStep = steps.find((step) => stepStatuses[step.key]?.status === "Not Started")
    || steps.find((step) => stepStatuses[step.key]?.status === "In Progress");

  const missingProfileFields = [
    !profile.filingDate ? "Filing date" : null,
    !profile.serviceDate ? "Service date" : null,
    !answer.answerReceived && !answer.defaultFiled ? "Answer received or default filed" : null,
    !profile.discoveryServedDate ? "Discovery served date" : null,
    !profile.motionServedDate ? "Motion served date" : null,
    !profile.pretrialDate ? "Pretrial/scheduling date" : null,
    !judgment?.judgmentDate ? "Judgment date" : null
  ].filter(Boolean) as string[];

  function toggleOverride(stepKey: string) {
    const next = { ...overrides };
    if (next[stepKey]) {
      delete next[stepKey];
    } else {
      next[stepKey] = true;
    }
    setOverrides(next);
    writeJson(OVERRIDE_KEY, next);
  }

  return (
    <ModuleLayout
      title="Case Flow"
      subtitle="End-to-end procedural flow with gates, deadlines, and evidence anchors."
      kpis={[
        { label: "Case", value: CASE_CONTEXT.caseName },
        { label: "Venue", value: CASE_CONTEXT.venue },
        { label: "Evidence", value: `${evidenceCount} items` },
        { label: "Damages", value: damagesSummary ? "Summary ready" : "Pending" }
      ]}
      lastUpdated="Feb 8, 2026"
      right={
        <Button
          variant="primary"
          size="sm"
          data-feedback="Case flow synced. Next action queued."
        >
          Sync Case Flow
        </Button>
      }
    >
      <div className="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Start Here</div>
        <div className="mt-2 text-sm text-slate-200">
          Follow the gated steps below to keep pleadings, discovery, and trial prep in order.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/case-status")}>
            Open Case Status
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/evidence")}>
            Open Evidence Vault
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Case Profile</CardSubtitle>
            <CardTitle>{CASE_CONTEXT.caseName}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-200">
            <div><span className="text-slate-400">Defendant:</span> {CASE_CONTEXT.defendant}</div>
            <div><span className="text-slate-400">Location:</span> {CASE_CONTEXT.incidentLocation}</div>
            <div><span className="text-slate-400">Court Routing:</span> {CASE_CONTEXT.courtRouting}</div>
            <div><span className="text-slate-400">Criminal Ref:</span> {CASE_CONTEXT.criminalCaseRef}</div>
            <div><span className="text-slate-400">Claims:</span> {CASE_CONTEXT.primaryClaims.join(", ")}</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Next Required Action</CardSubtitle>
            <CardTitle>{nextStep ? nextStep.label : "All Steps Complete"}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            <div className="text-xs text-slate-400">
              Completed {completedSteps} of {steps.length} stages. Keep entries evidence-anchored.
            </div>
            <div className="rounded-full border border-white/10 bg-white/5">
              <div
                className="h-2 rounded-full bg-emerald-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(nextStep ? nextStep.route : "/doc-pack")}
              >
                {nextStep ? "Open Next Step" : "Open Lawyer Packet"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/doc-pack")}>
                Lawyer-Ready Packet
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => {
          const status = stepStatuses[step.key]?.status || "Not Started";
          const tone = getStepTone(status);
          return (
            <Card key={step.key}>
              <CardHeader>
                <CardSubtitle>Step {index + 1}</CardSubtitle>
                <CardTitle>{step.label}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="text-sm text-slate-200">
                  Status:{" "}
                  <span className={`ml-1 rounded-full border px-2 py-1 text-xs ${
                    tone === "good"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : tone === "warn"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}>
                    {status}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-400">
                  {step.requirements.map((req) => (
                    <li key={req.label} className="flex items-center gap-2">
                      <span className={`inline-flex h-2 w-2 rounded-full ${req.done ? "bg-emerald-400" : "bg-slate-600"}`} />
                      <span className={req.done ? "text-slate-300" : "text-slate-500"}>{req.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(step.route)}>
                    Open
                  </Button>
                  <Button
                    variant={overrides[step.key] ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => toggleOverride(step.key)}
                  >
                    {overrides[step.key] ? "Clear Override" : "Mark Complete"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardSubtitle>Packet Readiness</CardSubtitle>
            <CardTitle>Evidence Packet</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-200">
            <div>Sections complete: {countCompleted(packetLayout, PACKET_SECTIONS)} / {PACKET_SECTIONS.length}</div>
            <div>Outputs complete: {countCompleted(packetOutputs, PACKET_OUTPUTS)} / {PACKET_OUTPUTS.length}</div>
            <div>Prefile audit: {countCompleted(preFileAudit, PREFILE_AUDIT)} / {PREFILE_AUDIT.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Timeline Coverage</CardSubtitle>
            <CardTitle>Chronology</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-200">
            <div>Timeline events: {timeline.length}</div>
            <div>Damages summary: {damagesSummary ? "Ready" : "Pending"}</div>
            <div>Evidence indexed: {evidenceCount}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Next Gate</CardSubtitle>
            <CardTitle>Blocking Items</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-200">
            {steps.filter((step) => stepStatuses[step.key]?.status === "Blocked").length ? (
              steps
                .filter((step) => stepStatuses[step.key]?.status === "Blocked")
                .slice(0, 3)
                .map((step) => (
                  <div key={step.key} className="text-xs text-slate-400">
                    {step.label} is blocked by earlier steps.
                  </div>
                ))
            ) : (
              <div className="text-xs text-emerald-200">No blockers detected.</div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Missing Data</CardSubtitle>
            <CardTitle>Gatekeeper</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-200">
            {missingProfileFields.length ? (
              missingProfileFields.slice(0, 6).map((item) => (
                <div key={item} className="text-xs text-amber-200">
                  {item}
                </div>
              ))
            ) : (
              <div className="text-xs text-emerald-200">Core dates present.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
