import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const ROADMAP = [
  { area: "Evidence Locker", status: "Active", owner: "Ops", eta: "Live", kpi: "Intake time < 2 min" },
  { area: "Admissibility Audit", status: "Active", owner: "Compliance", eta: "Live", kpi: "100% rule checks" },
  { area: "Competitive Intelligence", status: "In Progress", owner: "BD", eta: "Q2", kpi: "3-section report" },
  { area: "Governance Center", status: "In Progress", owner: "Ops", eta: "Q2", kpi: "Steering log" },
  { area: "TCO Planner", status: "Planned", owner: "Finance", eta: "Q3", kpi: "Cost model" }
];

export default function RoadmapHub() {
  return (
    <ModuleLayout
      title="Roadmap Hub"
      subtitle="Living roadmap with status, ownership, and KPI alignment"
      kpis={[
        { label: "Active", value: "2", tone: "good" },
        { label: "In Progress", value: "2", tone: "warn" },
        { label: "Planned", value: "1", tone: "neutral" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Program Roadmap</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {ROADMAP.map((item) => (
              <div key={item.area} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <div className="text-slate-200 font-medium">{item.area}</div>
                  <div className="text-xs text-slate-500 mt-1">Owner: {item.owner} • KPI: {item.kpi}</div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  {item.status === "Active" ? (
                    <CheckCircle2 className="text-emerald-400" size={14} />
                  ) : item.status === "In Progress" ? (
                    <Clock className="text-amber-400" size={14} />
                  ) : (
                    <AlertTriangle className="text-slate-400" size={14} />
                  )}
                  {item.status} • {item.eta}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Finalize CI report template.</div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Approve steering committee charter.</div>
            <Button variant="primary" className="w-full">Update Roadmap</Button>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
