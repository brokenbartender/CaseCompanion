import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Activity, CheckCircle2 } from "lucide-react";

const LEVELS = ["Underdeveloped", "Emerging", "Developing", "Leading"];

export default function MaturityDashboard() {
  return (
    <ModuleLayout
      title="Maturity Curve"
      subtitle="Lifecycle view of legal ops technology maturity"
      kpis={[
        { label: "Level", value: "Developing", tone: "warn" },
        { label: "Pillars", value: "6", tone: "neutral" },
        { label: "Next", value: "Provenance", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-amber-400" /> Maturity Assessment
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              Current Position: <strong className="text-amber-300">Developing</strong>
            </div>
            <div className="flex items-center gap-2">
              {LEVELS.map((lvl) => (
                <div key={lvl} className={`flex-1 rounded-lg border border-slate-800 p-3 text-xs text-center ${
                  lvl === "Developing" ? "bg-amber-500/10 text-amber-200" : "bg-slate-950/40 text-slate-400"
                }`}>
                  {lvl}
                </div>
              ))}
            </div>
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Next step: integrate data provenance + audit trails across all modules.
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evidence of Maturity</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Integrated suite UI</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Audit logs enabled</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Governance center live</div>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
