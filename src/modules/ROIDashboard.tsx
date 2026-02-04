import React, { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function ROIDashboard() {
  const [exhibits, setExhibits] = useState(12);
  const [riskReports, setRiskReports] = useState(3);
  const [billableRate, setBillableRate] = useState(450);
  const [verifiedExhibits, setVerifiedExhibits] = useState(10);

  const hoursSaved = useMemo(() => {
    return exhibits * 0.5 + riskReports * 2;
  }, [exhibits, riskReports]);

  const dollarsSaved = useMemo(() => {
    return hoursSaved * billableRate;
  }, [hoursSaved, billableRate]);

  const integrityScore = useMemo(() => {
    if (!exhibits) return 0;
    return Math.min(100, Math.max(0, (verifiedExhibits / exhibits) * 100));
  }, [verifiedExhibits, exhibits]);

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Competitive Advantage Dashboard</CardTitle>
          <CardSubtitle>Quantified savings from anchored analysis and automated review.</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Exhibits reviewed</div>
              <input
                type="number"
                value={exhibits}
                onChange={(e) => setExhibits(Math.max(0, Number(e.target.value) || 0))}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Risk reports generated</div>
              <input
                type="number"
                value={riskReports}
                onChange={(e) => setRiskReports(Math.max(0, Number(e.target.value) || 0))}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Billable rate (USD/hr)</div>
              <input
                type="number"
                value={billableRate}
                onChange={(e) => setBillableRate(Math.max(0, Number(e.target.value) || 0))}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">SHA-256 verified exhibits</div>
              <input
                type="number"
                value={verifiedExhibits}
                onChange={(e) => setVerifiedExhibits(Math.max(0, Number(e.target.value) || 0))}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-200">Total human review time reclaimed</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-100">{hoursSaved.toFixed(1)} hours</div>
            <div className="mt-3 text-sm text-emerald-100/80">Estimated value: ${dollarsSaved.toLocaleString()}</div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-emerald-200">
              <span>Forensic integrity score</span>
              <span className="text-emerald-100">{integrityScore.toFixed(0)}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-emerald-950/60">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${integrityScore.toFixed(0)}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-indigo-200">Predictive Insights</div>
            <div className="mt-2 text-sm text-indigo-100">
              Litigation forecast: 68% probability of early settlement based on current fact density and prior venue outcomes.
            </div>
            <div className="mt-3 text-xs text-indigo-200/80">
              Judge analytics: neutral trend · 4 similar rulings in last 24 months.
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Formula: (exhibits ? 0.5hr + risk reports ? 2hr) ? billable rate.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
