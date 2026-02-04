import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { FileSearch, AlertTriangle, CheckCircle2, BadgeCheck, Scale } from "lucide-react";
import { MODULE_PROMPTS } from "../services/modulePrompts";
import { useModuleAI } from "../hooks/useModuleAI";
import { logForensicEvent } from "../services/forensicLogger";

const CHARGES = [
  { code: "MCL 750.82", label: "Felonious Assault", status: "High" },
  { code: "MCL 750.84", label: "Assault with Intent", status: "Medium" },
  { code: "MCL 750.81", label: "Simple Assault", status: "Low" }
];

export default function ChargeAnalysis() {
  const [hasReview, setHasReview] = useState(false);
  const { run, loading, output, error } = useModuleAI(MODULE_PROMPTS.charge_analysis.key);

  return (
    <ModuleLayout
      title="Charge Analysis"
      subtitle="Charge exposure modeling and defense strategy alignment"
      kpis={[
        { label: "Charges", value: "3", tone: "neutral" },
        { label: "Exposure", value: "High", tone: "warn" },
        { label: "Mitigation", value: "Ready", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-100">
                <Scale size={18} />
                Charge Exposure Review
              </CardTitle>
              <CardSubtitle className="text-indigo-200/60">
                Compare statute elements with available evidence.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-5 text-sm text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Max Exposure</div>
                  <div className="mt-1 text-slate-200 font-medium">10 Years</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Enhancements</div>
                  <div className="mt-1 text-slate-200 font-medium">Weapon Allegation</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Prior Record</div>
                  <div className="mt-1 text-slate-200 font-medium">None</div>
                </div>
              </div>

              <Button
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={async () => {
                  setHasReview(true);
                  await logForensicEvent("charge.analysis.run", { scope: "charge" });
                  await run(MODULE_PROMPTS.charge_analysis.defaultPrompt);
                }}
              >
                Analyze Elements
              </Button>

              {hasReview ? (
                <div className="rounded border border-indigo-500/30 bg-indigo-500/10 p-4">
                  Evidence gaps detected on intent element. Recommend lesser‑included strategy.
                </div>
              ) : null}
              {loading ? <div className="text-xs text-indigo-200">Generating charge analysis...</div> : null}
              {error ? (
                <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                  {error}
                </div>
              ) : null}
              {output ? (
                <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-300 whitespace-pre-wrap">
                  {output}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck size={18} className="text-emerald-400" />
                Statute Matrix
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              {CHARGES.map((charge) => (
                <div key={charge.code} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div>
                    <div className="text-slate-200 font-medium">{charge.label}</div>
                    <div className="text-xs text-slate-500">{charge.code}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      charge.status === "High"
                        ? "bg-rose-500/20 text-rose-200"
                        : charge.status === "Medium"
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {charge.status}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3">
                Eyewitness statements conflict on weapon presence.
              </div>
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3">
                Surveillance footage missing from critical timeframe.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch size={18} className="text-amber-400" />
                Next Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => logForensicEvent("charge.export.summary", { scope: "charge" })}
              >
                Export Charge Summary
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
                onClick={() => setHasReview(false)}
              >
                Reset Analysis
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
