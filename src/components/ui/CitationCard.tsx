import React from "react";

type CitationCardProps = {
  title: string;
  detail: string;
  status?: "verified" | "pending" | "flagged";
};

const statusStyles: Record<string, string> = {
  verified: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  flagged: "border-rose-500/40 bg-rose-500/10 text-rose-200"
};

export default function CitationCard({ title, detail, status = "verified" }: CitationCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-100">{title}</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusStyles[status]}`}>
          {status}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400">{detail}</div>
    </div>
  );
}
