import React from "react";
import CitationCard from "./CitationCard";

type SourceItem = {
  id: string;
  label: string;
  detail: string;
  status?: "verified" | "pending" | "flagged";
};

type SourcesPanelProps = {
  title?: string;
  sources: SourceItem[];
};

export default function SourcesPanel({ title = "Sources", sources }: SourcesPanelProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{title}</div>
      <div className="mt-3 space-y-2">
        {sources.map((source) => (
          <CitationCard
            key={source.id}
            title={source.label}
            detail={source.detail}
            status={source.status}
          />
        ))}
      </div>
    </div>
  );
}
