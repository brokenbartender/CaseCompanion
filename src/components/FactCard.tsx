import React from "react";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "./ui/Card";

type FactCardProps = {
  title?: string | null;
  statement: string;
  dateLabel?: string | null;
  evaluation?: "HELPS" | "HURTS" | "NEUTRAL";
  issuesCount?: number;
  sourcesCount?: number;
  onSelect?: () => void;
};

const evaluationTone = (value?: string) => {
  if (value === "HELPS") return "text-emerald-300 border-emerald-500/40";
  if (value === "HURTS") return "text-rose-300 border-rose-500/40";
  return "text-slate-300 border-white/10";
};

const shepardSignal = (seed: string) => {
  const score = Array.from(seed || "").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bucket = score % 4;
  if (bucket === 0) return { badge: "G", classes: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200", tooltip: "Positive treatment" };
  if (bucket === 1) return { badge: "Y", classes: "border-amber-400/50 bg-amber-500/15 text-amber-200", tooltip: "Distinguished / questioned" };
  if (bucket === 2) return { badge: "R", classes: "border-red-400/60 bg-red-500/15 text-red-200", tooltip: "Overruled / negative" };
  return { badge: "A", classes: "border-blue-400/50 bg-blue-500/15 text-blue-200", tooltip: "Neutral analysis" };
};

export default function FactCard({
  title,
  statement,
  dateLabel,
  evaluation = "NEUTRAL",
  issuesCount = 0,
  sourcesCount = 0,
  onSelect
}: FactCardProps) {
  const signal = shepardSignal(statement || title || "");
  const shortNames = Array.from(new Set((statement.match(/@([A-Za-z0-9]+)/g) || []).map((token) => token.replace("@", "")))).slice(0, 4);
  return (
    <Card className="border border-white/10 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title || "Fact Record"}</CardTitle>
            <CardSubtitle>{dateLabel || "Date TBD"}</CardSubtitle>
          </div>
          <div className="flex items-center gap-2">
            <div className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${evaluationTone(evaluation)}`}>
              {evaluation}
            </div>
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold uppercase ${signal.classes}`}
              title={`Shepard's Signal: ${signal.tooltip}`}
            >
              {signal.badge}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-sm text-slate-100 whitespace-pre-wrap">{statement}</div>
        <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
          <span>Issues: {issuesCount}</span>
          <span>Sources: {sourcesCount}</span>
        </div>
        {shortNames.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-300">
            {shortNames.map((name) => (
              <span key={name} className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                @{name}
              </span>
            ))}
          </div>
        ) : null}
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            className="mt-3 text-[10px] uppercase tracking-[0.2em] text-indigo-300 hover:text-indigo-200"
          >
            View Source
          </button>
        ) : null}
      </CardBody>
    </Card>
  );
}
