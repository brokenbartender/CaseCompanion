import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { computeRuleDeadlines, CaseProfile } from "../services/workflowEngine";
import { APP_DISCLAIMER } from "../config/branding";

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
      jurisdictionId: "mi",
      courtLevel: "district",
      county: "Unknown",
      filingDate: "",
      serviceDate: "",
      answerDate: "",
      discoveryServedDate: "",
      motionServedDate: "",
      pretrialDate: ""
    })
  );

  const deadlines = useMemo(() => computeRuleDeadlines(profile, []), [profile]);
  const upcoming = useMemo(() => deadlines.filter((d) => d.dueDate), [deadlines]);
  const nextActions = upcoming.slice(0, 5);

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
                    writeJson(PROFILE_KEY, next);
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
                    writeJson(PROFILE_KEY, next);
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
                      writeJson(PROFILE_KEY, next);
                    }}
                  />
                </label>
              ))}
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
      </div>
    </Page>
  );
}
