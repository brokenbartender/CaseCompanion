import React from "react";
import Page from "./Page";

type KPI = { label: string; value: string; tone?: "good" | "warn" | "neutral" };

export default function ModuleLayout({
  title,
  subtitle,
  kpis,
  lastUpdated,
  right,
  children
}: {
  title: string;
  subtitle?: string;
  kpis?: KPI[];
  lastUpdated?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Page title={title} subtitle={subtitle} right={right}>
      {(kpis?.length || lastUpdated) ? (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {kpis?.map((kpi) => (
              <div
                key={kpi.label}
                className={`rounded-full border px-3 py-1 ${
                  kpi.tone === "good"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : kpi.tone === "warn"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                <span className="mr-2 uppercase tracking-[0.2em]">{kpi.label}</span>
                <span className="font-mono">{kpi.value}</span>
              </div>
            ))}
            {lastUpdated ? (
              <div className="ml-auto text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Last Updated: {lastUpdated}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </Page>
  );
}
