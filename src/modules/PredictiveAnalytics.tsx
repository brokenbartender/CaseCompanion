import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { TrendingUp, BarChart3, AlertTriangle } from "lucide-react";

export default function PredictiveAnalytics() {
  const [simulating, setSimulating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [winRate, setWinRate] = useState(0);

  const facts = [
    { text: "Plaintiff had prior complaints documented", leaning: "defense" },
    { text: "Camera shows delayed response", leaning: "plaintiff" },
    { text: "No warning signage posted", leaning: "plaintiff" }
  ];

  const calculateWinRate = () => {
    const proPlaintiff = facts.filter((f) => f.leaning === "plaintiff").length;
    const proDefense = facts.filter((f) => f.leaning === "defense").length;
    const total = proPlaintiff + proDefense || 1;
    return Math.round((proPlaintiff / total) * 100);
  };

  const runSimulation = () => {
    setSimulating(true);
    setHasResult(false);
    setTimeout(() => {
      setSimulating(false);
      setHasResult(true);
      setWinRate(calculateWinRate());
    }, 2000);
  };

  return (
    <ModuleLayout
      title="Predictive Analytics"
      subtitle="Verdict forecasting, venue signals, and risk modeling"
      kpis={[
        { label: "Win", value: "71%", tone: "good" },
        { label: "Range", value: "$650k-$1.1M", tone: "neutral" },
        { label: "Risk", value: "High", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-100">
                <TrendingUp size={18} />
                Forecast Dashboard
              </CardTitle>
              <CardSubtitle className="text-emerald-200/60">
                Model expected verdict range and settlement pressure.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-4 text-sm text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Median Verdict</div>
                  <div className="mt-1 text-slate-200 font-medium">$1.3M</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Settlement Range</div>
                  <div className="mt-1 text-slate-200 font-medium">$650k - $1.1M</div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Venue Lean</div>
                  <div className="mt-1 text-slate-200 font-medium">Plaintiff</div>
                </div>
              </div>
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500" onClick={runSimulation}>
                Run Simulation
              </Button>
              {simulating ? <div className="text-xs text-emerald-200">Thinking... computing win probability.</div> : null}
              {hasResult ? (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4">
                  Win Probability: <strong>{winRate}%</strong> (plaintiff). Recommended settle floor: <strong>$820k</strong>.
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-400" />
                Comparative Verdicts
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Product defect cases: median $1.7M (n=28).
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Employment retaliation: median $620k (n=19).
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Risk Signals
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Prior verdicts show high punitive damages in venue.
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Defense experts underperform on comparable matters.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-400" />
                Lead Attribution
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Referral: 48% of high-value wins
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Organic search: 32% of matters
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                AI Prioritization
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
                Auto-rank: 3 urgent tasks flagged for this matter.
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
                Next best action: schedule 30(b)(6) deposition.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Export Forecast Report
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white" onClick={() => setHasResult(false)}>
                Reset Forecast
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
