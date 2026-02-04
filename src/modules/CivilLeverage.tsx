import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { TrendingUp, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { MODULE_PROMPTS } from "../services/modulePrompts";
import { useModuleAI } from "../hooks/useModuleAI";
import { logForensicEvent } from "../services/forensicLogger";

export default function CivilLeverage() {
  const [hasScore, setHasScore] = useState(false);
  const { run, loading, output, error } = useModuleAI(MODULE_PROMPTS.civil_leverage.key);

  return (
    <ModuleLayout
      title="Civil Leverage"
      subtitle="Exposure scoring, settlement leverage, and liability posture"
      kpis={[
        { label: "Liability", value: "Strong", tone: "good" },
        { label: "Damages", value: "$1.8M", tone: "warn" },
        { label: "Venue", value: "Lean P", tone: "neutral" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-100">
                <TrendingUp size={18} />
                Leverage Scorecard
              </CardTitle>
              <CardSubtitle className="text-emerald-200/60">
                Combine liability strength with damages exposure.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-5 text-sm text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Liability</div>
                  <div className="mt-1 text-slate-200 font-medium">Strong</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Damages</div>
                  <div className="mt-1 text-slate-200 font-medium">$1.8M</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Venue</div>
                  <div className="mt-1 text-slate-200 font-medium">Plaintiff‑lean</div>
                </div>
              </div>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={async () => {
                  setHasScore(true);
                  await logForensicEvent("civil.leverage.run", { scope: "civil" });
                  await run(MODULE_PROMPTS.civil_leverage.defaultPrompt);
                }}
              >
                Scan Pressure Points
              </Button>
              {hasScore ? (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4">
                  Reputation Risk: <strong>High</strong> • Regulatory Risk: <strong>Moderate</strong>. Pressure points detected.
                </div>
              ) : null}
              {loading ? <div className="text-xs text-emerald-200">Generating leverage insights...</div> : null}
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
                <FileText size={18} className="text-blue-400" />
                Negotiation Notes
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Adjust anchor using recent verdicts in Oakland County.
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Stress comparative negligence risks for counter‑offer.
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Strength Drivers
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
                Strong causation chain with minimal treatment gaps.
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
                Video evidence supports liability narrative.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Weakness Alerts
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Two inconsistent witness accounts may reduce leverage.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => logForensicEvent("civil.export.brief", { scope: "civil" })}
              >
                Export Leverage Brief
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Reset Score
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
