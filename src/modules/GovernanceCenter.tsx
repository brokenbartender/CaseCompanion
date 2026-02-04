import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Users, CheckCircle2, FileText } from "lucide-react";

const DECISIONS = [
  { id: "DEC-014", title: "Adopt Evidence Hash Standard v2", owner: "GC", date: "2026-02-01" },
  { id: "DEC-015", title: "Prioritize CI Module for BD", owner: "BD Lead", date: "2026-02-03" }
];

export default function GovernanceCenter() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <ModuleLayout
      title="Governance Center"
      subtitle="Stakeholder input, prioritization, and decision history"
      kpis={[
        { label: "Decisions", value: "2", tone: "neutral" },
        { label: "Inputs", value: "6", tone: "good" },
        { label: "Next Review", value: "2026-03-15", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-emerald-400" /> Steering Committee
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              Quarterly prioritization review. Inputs from Ops, IT, Finance, and Practice Leads.
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-500 uppercase">Priority Queue</div>
                <div className="mt-1 text-slate-200">CI Builder • Data Integrity • SLA Monitor</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-500 uppercase">Next Review</div>
                <div className="mt-1 text-slate-200">2026-03-15</div>
              </div>
            </div>
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => setSubmitted(true)}>
              Submit Stakeholder Input
            </Button>
            {submitted ? (
              <div className="text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={14} /> Submission recorded in decision log.
              </div>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" /> Decision History
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            {DECISIONS.map((d) => (
              <div key={d.id} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-slate-200 font-medium">{d.title}</div>
                <div className="text-xs text-slate-500">{d.id} • {d.owner} • {d.date}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
