import React, { useMemo, useState, useEffect } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { computeRuleDeadlines, CaseProfile } from "../services/workflowEngine";
import { APP_DISCLAIMER } from "../config/branding";
import { FEATURE_FLAGS } from "../config/featureFlags";
import { CASE_PROFILE_SEED } from "../data/caseProfileSeed";
import { EVIDENCE_DATE_SCAN } from "../data/evidenceDateScan";
import { logAuditEvent } from "../utils/auditLog";
import {
  fetchProceduralStatus,
  updateCaseProfile,
  listCaseDocuments,
  createCaseDocument,
  updateCaseDocument,
  uploadCaseDocumentFile
} from "../services/caseApi";

const PROFILE_KEY = "case_companion_case_profile_v1";

function severityForDate(date: string) {
  const today = new Date();
  const due = new Date(date);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return { label: "CRITICAL", tone: "text-rose-200 bg-rose-500/10 border-rose-400/30" };
  if (diffDays <= 30) return { label: "WARNING", tone: "text-amber-200 bg-amber-500/10 border-amber-400/30" };
  return { label: "INFO", tone: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30" };
}

export default function CaseStatusDashboard() {
  const [profile, setProfile] = useState<CaseProfile>(() =>
    readJson(PROFILE_KEY, {
      ...CASE_PROFILE_SEED,
      county: CASE_PROFILE_SEED.county || "Unknown",
      venueCounty: CASE_PROFILE_SEED.venueCounty || "Unknown"
    })
  );
  const [serverDeadlines, setServerDeadlines] = useState<any[]>([]);
  const [serverGates, setServerGates] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [caseDocuments, setCaseDocuments] = useState<any[]>([]);
  const [docForm, setDocForm] = useState({ title: "", status: "DRAFT", signatureStatus: "MISSING" });

  const deadlines = useMemo(() => computeRuleDeadlines(profile, []), [profile]);
  const upcoming = useMemo(
    () => (serverDeadlines.length ? serverDeadlines : deadlines).filter((d) => d.dueDate),
    [deadlines, serverDeadlines]
  );
  const nextActions = upcoming.slice(0, 5);

  useEffect(() => {
    if (!FEATURE_FLAGS.useServerCaseProfile) return;
    fetchProceduralStatus()
      .then((data: any) => {
        if (data?.profile) {
          const next = { ...profile, ...data.profile };
          setProfile(next);
          writeJson(PROFILE_KEY, next);
        }
        if (Array.isArray(data?.deadlines)) setServerDeadlines(data.deadlines);
        if (Array.isArray(data?.gates?.gates)) setServerGates(data.gates.gates);
      })
      .catch(() => {
        setStatusMessage("Offline mode: showing locally saved dates.");
      });
    listCaseDocuments()
      .then((data: any) => setCaseDocuments(Array.isArray(data?.documents) ? data.documents : []))
      .catch(() => null);
  }, []);

  async function saveProfileToServer(next: CaseProfile) {
    writeJson(PROFILE_KEY, next);
    if (!FEATURE_FLAGS.useServerCaseProfile) return;
    try {
      await updateCaseProfile(next);
      const data: any = await fetchProceduralStatus();
      if (Array.isArray(data?.deadlines)) setServerDeadlines(data.deadlines);
      if (Array.isArray(data?.gates?.gates)) setServerGates(data.gates.gates);
      setStatusMessage("Saved to server.");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch {
      setStatusMessage("Unable to save to server. Local changes kept.");
    }
  }

  async function addDocument() {
    if (!docForm.title.trim()) return;
    try {
      const result: any = await createCaseDocument(docForm);
      setCaseDocuments([result.document, ...caseDocuments].filter(Boolean));
      setDocForm({ title: "", status: "DRAFT", signatureStatus: "MISSING" });
    } catch {
      setStatusMessage("Failed to add document.");
    }
  }

  async function updateDoc(id: string, updates: any) {
    try {
      const result: any = await updateCaseDocument(id, updates);
      setCaseDocuments(caseDocuments.map((doc) => (doc.id === id ? result.document : doc)));
    } catch {
      setStatusMessage("Failed to update document.");
    }
  }

  async function attachDocumentFile(id: string, file?: File | null) {
    if (!file) return;
    try {
      const result: any = await uploadCaseDocumentFile(id, file);
      setCaseDocuments(caseDocuments.map((doc) => (doc.id === id ? result.document : doc)));
    } catch {
      setStatusMessage("Failed to upload document.");
    }
  }

  function autoFillFromEvidence() {
    const next = { ...profile };
    if (!next.pretrialDate && EVIDENCE_DATE_SCAN.pretrialDate) {
      next.pretrialDate = EVIDENCE_DATE_SCAN.pretrialDate;
    }
    if (!next.filingDate && EVIDENCE_DATE_SCAN.demandDate) {
      next.filingDate = EVIDENCE_DATE_SCAN.demandDate;
    }
    setProfile(next);
    saveProfileToServer(next);
    setStatusMessage("Auto-filled dates from evidence scan. Verify for accuracy.");
    setTimeout(() => setStatusMessage(""), 3000);
    logAuditEvent("Case profile auto-filled from evidence scan", { pretrialDate: next.pretrialDate, filingDate: next.filingDate });
  }

  const complianceAlerts = [
    !profile.filingDate ? "Filing date missing" : "",
    !profile.serviceDate ? "Service date missing" : "",
    profile.serviceDate && !profile.answerDate ? "Answer date not recorded" : "",
    !profile.discoveryServedDate ? "Discovery served date missing" : "",
    !profile.motionServedDate ? "Motion served date missing" : "",
    !profile.pretrialDate ? "Pretrial/scheduling date missing" : ""
  ].filter(Boolean);

  return (
    <Page
      title="Case Status Dashboard"
      subtitle="Procedural posture, deadlines, and export readiness for Michigan pro se cases."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Case Profile</CardSubtitle>
            <CardTitle>Michigan Civil Workflow</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-300">
              <div>
                <div className="text-xs text-slate-400 mb-1">Jurisdiction</div>
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">Michigan (MI)</div>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Court Level</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={profile.courtLevel}
                  onChange={(e) => {
                    const next = { ...profile, courtLevel: e.target.value as CaseProfile["courtLevel"] };
                    setProfile(next);
                    saveProfileToServer(next);
                  }}
                >
                  <option value="district">District</option>
                  <option value="circuit">Circuit</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">County</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={profile.county}
                  onChange={(e) => {
                    const next = { ...profile, county: e.target.value };
                    setProfile(next);
                    saveProfileToServer(next);
                  }}
                />
              </label>
              {[
                { key: "filingDate", label: "Filing Date" },
                { key: "serviceDate", label: "Service Date" },
                { key: "answerDate", label: "Answer Date" },
                { key: "discoveryServedDate", label: "Discovery Served Date" },
                { key: "motionServedDate", label: "Motion Served Date" },
                { key: "pretrialDate", label: "Scheduling/Pretrial Date" }
              ].map((field) => (
                <label key={field.key} className="space-y-1">
                  <span className="text-xs text-slate-400">{field.label}</span>
                  <input
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    placeholder="YYYY-MM-DD"
                    value={(profile as any)[field.key] || ""}
                    onChange={(e) => {
                      const next = { ...profile, [field.key]: e.target.value };
                      setProfile(next);
                      saveProfileToServer(next);
                    }}
                  />
                </label>
              ))}
            </div>
            {statusMessage ? <div className="mt-3 text-xs text-amber-200">{statusMessage}</div> : null}
            <div className="mt-4">
              <button
                type="button"
                onClick={autoFillFromEvidence}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Auto-Fill Dates from Evidence Scan
              </button>
              <div className="mt-2 text-[11px] text-slate-500">
                Uses scanned evidence hints only. Confirm court-verified deadlines.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Disclaimer</CardSubtitle>
            <CardTitle>Important</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-amber-200">{APP_DISCLAIMER}</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Compliance</CardSubtitle>
            <CardTitle>Rule Check Alerts</CardTitle>
          </CardHeader>
          <CardBody>
            {complianceAlerts.length ? (
              <ul className="space-y-2 text-sm text-amber-200">
                {complianceAlerts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-emerald-200">No missing compliance triggers detected.</div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Next Actions</CardSubtitle>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              {nextActions.length ? nextActions.map((deadline) => {
                const severity = deadline.dueDate ? severityForDate(deadline.dueDate) : { label: "INFO", tone: "text-slate-200 bg-white/5 border-white/10" };
                return (
                  <div key={deadline.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">{deadline.label}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${severity.tone}`}>
                        {severity.label}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Due: {deadline.dueDate || "Set trigger date to calculate"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Source: {deadline.rule.source.citation}</div>
                  </div>
                );
              }) : (
                <div className="text-sm text-slate-400">Set filing or service dates to compute deadlines.</div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Documents</CardSubtitle>
            <CardTitle>Signature Readiness</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-300">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Document title"
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              />
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={docForm.status}
                onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}
              >
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
              </select>
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={docForm.signatureStatus}
                onChange={(e) => setDocForm({ ...docForm, signatureStatus: e.target.value })}
              >
                <option value="MISSING">Missing</option>
                <option value="PENDING">Pending</option>
                <option value="SIGNED">Signed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addDocument}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Add Document
            </button>
            {caseDocuments.length ? (
              <div className="mt-4 grid gap-2 text-xs text-slate-300">
                {caseDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-md border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center justify-between">
                      <div>{doc.title}</div>
                      <select
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                        value={doc.signatureStatus}
                        onChange={(e) => updateDoc(doc.id, { signatureStatus: e.target.value })}
                      >
                        <option value="MISSING">Missing</option>
                        <option value="PENDING">Pending</option>
                        <option value="SIGNED">Signed</option>
                      </select>
                    </div>
                    <label className="mt-2 block text-[10px] text-slate-400">
                      Attach file
                      <input
                        type="file"
                        onChange={(e) => attachDocumentFile(doc.id, e.target.files?.[0])}
                        className="mt-1 text-xs text-slate-300"
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400">No case documents added yet.</div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Export Gates</CardSubtitle>
            <CardTitle>Readiness Checks</CardTitle>
          </CardHeader>
          <CardBody>
            {serverGates.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {serverGates.map((gate) => (
                  <div key={gate.id} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-semibold">{gate.label}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        gate.status === "PASS" ? "text-emerald-200 border-emerald-400/30" : "text-rose-200 border-rose-400/30"
                      }`}>
                        {gate.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{gate.action}</div>
                    {gate.details ? <div className="mt-1 text-xs text-slate-500">{gate.details}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No gate data yet. Save your case profile to compute.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
