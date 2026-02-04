import React from "react";

export type ThoughtTraceStep = {
  id: string;
  type: "thought" | "action" | "observation" | "final";
  content: string;
};

const toneForType: Record<ThoughtTraceStep["type"], string> = {
  thought: "border-blue-500/30 bg-blue-500/10 text-blue-100",
  action: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  observation: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  final: "border-purple-500/30 bg-purple-500/10 text-purple-100"
};

const parseObservationSnippet = (content: string) => {
  const sourceMatch = content.match(/SOURCE:\s*(.+)/i);
  const snippetIndex = content.indexOf("SNIPPET:");
  if (!sourceMatch || snippetIndex === -1) return null;
  const snippet = content.slice(snippetIndex + "SNIPPET:".length).trim();
  return {
    source: sourceMatch[1].trim(),
    snippet
  };
};

export default function ThoughtTrace({ steps }: { steps: ThoughtTraceStep[] }) {
  if (!steps.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        No agent trace available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const snippet = step.type === "observation" ? parseObservationSnippet(step.content) : null;
        return (
          <div
            key={step.id}
            className={`rounded-2xl border px-4 py-3 text-xs font-mono ${toneForType[step.type]}`}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
              {step.type}
            </div>
            {snippet ? (
              <div className="mt-2 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
                  Evidence Snippet
                </div>
                <div className="text-[11px] text-emerald-100">
                  <span className="text-emerald-300">Source:</span> {snippet.source}
                </div>
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-emerald-50">
                  <span className="bg-emerald-400/20 px-1 py-0.5 rounded">{snippet.snippet}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 whitespace-pre-wrap">{step.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
