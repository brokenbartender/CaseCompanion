import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { getStatute } from "../services/legalAuthority";

const STATES = ["CA", "NY", "TX", "FL", "IL", "MI", "WA", "CO", "AZ", "GA"];

export default function StateSurveyView() {
  const [issue, setIssue] = useState("Non-compete enforceability");
  const [selected, setSelected] = useState("CA");
  const [statute, setStatute] = useState(getStatute("CA", issue));

  return (
    <ModuleLayout
      title="50-State Survey"
      subtitle="Click a state to retrieve the governing statute"
      kpis={[
        { label: "Issue", value: "Non-compete", tone: "neutral" },
        { label: "States", value: "50", tone: "good" },
        { label: "Mode", value: "Survey", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>US State Map (Select)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="flex flex-wrap gap-2">
              {STATES.map((state) => (
                <button
                  key={state}
                  onClick={() => {
                    setSelected(state);
                    setStatute(getStatute(state, issue));
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selected === state
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Issue</div>
              <div className="text-slate-200 font-medium">{issue}</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Statutory Network</div>
              <svg viewBox="0 0 320 140" className="mt-2 h-32 w-full">
                <circle cx="40" cy="70" r="16" fill="#22c55e" />
                <circle cx="160" cy="20" r="14" fill="#38bdf8" />
                <circle cx="160" cy="120" r="14" fill="#38bdf8" />
                <circle cx="280" cy="70" r="16" fill="#f59e0b" />
                <line x1="56" y1="70" x2="146" y2="30" stroke="#94a3b8" strokeWidth="2" />
                <line x1="56" y1="70" x2="146" y2="110" stroke="#94a3b8" strokeWidth="2" />
                <line x1="174" y1="20" x2="264" y2="70" stroke="#94a3b8" strokeWidth="2" />
                <line x1="174" y1="120" x2="264" y2="70" stroke="#94a3b8" strokeWidth="2" />
                <text x="40" y="74" textAnchor="middle" fill="#0f172a" fontSize="10">Actor</text>
                <text x="160" y="24" textAnchor="middle" fill="#0f172a" fontSize="9">Duty</text>
                <text x="160" y="124" textAnchor="middle" fill="#0f172a" fontSize="9">Notice</text>
                <text x="280" y="74" textAnchor="middle" fill="#0f172a" fontSize="10">Agency</text>
              </svg>
              <div className="mt-2 text-xs text-slate-400">Compare actor/duty relationships across jurisdictions.</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statute</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Selected</div>
              <div className="text-slate-200 font-medium">{selected}</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              {statute}
            </div>
            <Button variant="secondary">Export Survey</Button>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
