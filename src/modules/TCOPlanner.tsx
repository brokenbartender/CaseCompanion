import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { DollarSign } from "lucide-react";

export default function TCOPlanner() {
  return (
    <ModuleLayout
      title="TCO Planner"
      subtitle="Cost, time, and resourcing estimates"
      kpis={[
        { label: "Year 1", value: "$420k", tone: "warn" },
        { label: "Year 3", value: "$220k", tone: "good" },
        { label: "FTE", value: "2.75", tone: "neutral" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Total Cost of Ownership
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">Year 1</div>
                <div className="mt-1 text-slate-200">$420k</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">Year 2</div>
                <div className="mt-1 text-slate-200">$260k</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">Year 3</div>
                <div className="mt-1 text-slate-200">$220k</div>
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              Resourcing: 2 FTE engineers, 0.5 FTE analyst, 0.25 FTE PM.
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Cloud hosting $5k/mo.</div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">LLM costs $2k/mo.</div>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
