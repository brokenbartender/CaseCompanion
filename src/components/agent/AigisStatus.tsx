import React from "react";

type AigisPulse = "idle" | "intent" | "provenance" | "consensus" | "redacted";

const toneByPulse: Record<AigisPulse, string> = {
  idle: "border-white/10 bg-white/5 text-slate-400",
  intent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  provenance: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  consensus: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  redacted: "border-red-500/40 bg-red-500/10 text-red-200"
};

const labelByPulse: Record<AigisPulse, string> = {
  idle: "AIGIS Idle",
  intent: "Intent Validated",
  provenance: "Provenance Verified",
  consensus: "Consensus Pending",
  redacted: "Output Redacted"
};

export default function AigisStatus({ pulse }: { pulse: AigisPulse }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.25em] ${toneByPulse[pulse]}`}>
      <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
      <span>{labelByPulse[pulse]}</span>
      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] tracking-[0.3em]">
        AIGIS
      </span>
    </div>
  );
}
