import React from "react";
import Badge from "./ui/Badge";

type IntegrityPanelProps = {
  title?: string;
  status?: "VERIFIED" | "PENDING" | "REVOKED";
  anchors?: number;
  verificationPct?: number;
  outputType?: "RETRIEVAL" | "REASONED" | "SPECULATIVE";
  basis?: {
    sources?: string;
    model?: string;
    assumptions?: string;
  };
  policyResult?: string;
  provenance?: string;
};

const statusTone = (status: IntegrityPanelProps["status"]) => {
  if (status === "VERIFIED") return "green";
  if (status === "REVOKED") return "red";
  return "yellow";
};

export default function IntegrityPanel({
  title = "AI Output Integrity",
  status = "PENDING",
  anchors = 0,
  verificationPct = 0,
  outputType = "RETRIEVAL",
  basis = {
    sources: "Anchors + evidence library",
    model: "System-2 verifier",
    assumptions: "No unstated assumptions"
  },
  policyResult = "Policy checks pending",
  provenance = "Model: default / Policy: v1"
}: IntegrityPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</div>
        <Badge tone={statusTone(status)}>{status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Anchors</div>
          <div className="mt-1 text-sm text-white">{anchors}</div>
        </div>
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Verified</div>
          <div className="mt-1 text-sm text-white">{verificationPct}%</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3 text-[11px] text-slate-300">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Output type</div>
        <div className="mt-1 text-sm text-white">{outputType}</div>
      </div>

      <div className="text-[11px] text-slate-400 space-y-1">
        <div><span className="font-semibold text-slate-300">Sources:</span> {basis.sources}</div>
        <div><span className="font-semibold text-slate-300">Model:</span> {basis.model}</div>
        <div><span className="font-semibold text-slate-300">Assumptions:</span> {basis.assumptions}</div>
      </div>

      <div className="text-xs text-slate-400">
        <div className="font-semibold text-slate-300">Policy status</div>
        <div>{policyResult}</div>
      </div>

      <div className="text-[11px] text-slate-500">
        {provenance}
      </div>
    </div>
  );
}
