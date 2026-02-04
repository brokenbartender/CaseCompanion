import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FileText, Globe, Gavel, TrendingUp, Bell } from "lucide-react";

export default function CompetitiveIntelligence() {
  const [turnaround, setTurnaround] = useState("1-2 days");
  const [ready, setReady] = useState(false);

  return (
    <ModuleLayout
      title="Company Intelligence Report"
      subtitle="Company • News/Developments • Legal"
      kpis={[
        { label: "Sources", value: "4", tone: "neutral" },
        { label: "Alerts", value: "2", tone: "warn" },
        { label: "Turnaround", value: turnaround, tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" /> Report Builder
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">Company</div>
                <div className="mt-1 text-slate-200">Financials, management, strategy</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">News/Developments</div>
                <div className="mt-1 text-slate-200">Press, industry updates</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase text-slate-500">Legal</div>
                <div className="mt-1 text-slate-200">Litigation, IP, contracts</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Turnaround</div>
              <div className="flex flex-wrap gap-2">
                {["1-2 days", "5-7 days", "2 weeks"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setTurnaround(option)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      turnaround === option
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-500" onClick={() => setReady(true)}>
              Generate Report
            </Button>
            {ready ? (
              <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
                Report draft ready. Export templates available.
              </div>
            ) : null}
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Sources
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2"><Globe size={14} className="text-slate-400" /> Financial data</div>
              <div className="flex items-center gap-2"><Gavel size={14} className="text-slate-400" /> Litigation analytics</div>
              <div className="flex items-center gap-2"><TrendingUp size={14} className="text-slate-400" /> Transactions</div>
              <div className="flex items-center gap-2"><FileText size={14} className="text-slate-400" /> Government contracts</div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={18} className="text-amber-400" /> Alerts
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-2">New litigation filed (2)</div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-2">M&A activity detected</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
