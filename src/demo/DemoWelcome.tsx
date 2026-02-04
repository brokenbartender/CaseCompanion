import React from "react";
import { Play, ShieldCheck } from "lucide-react";
import { useAutoDemo } from "./useAutoDemo";
import { APP_NAME, PRIMARY_COLOR } from "../config/branding";

export default function DemoWelcome({
  onStart,
  onSkip
}: {
  onStart: () => void;
  onSkip?: () => void;
}) {
  const demo = useAutoDemo();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <ShieldCheck className="h-7 w-7 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">{APP_NAME} OS</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Welcome to the Green Run</h2>
            <p className="mt-2 text-sm text-slate-300">
              This guided run demonstrates evidence ingestion, grounding enforcement, and a signed Proof Packet.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-emerald-200 font-semibold">Step 1:</span> Ingest a sealed exhibit and hash it.
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-emerald-200 font-semibold">Step 2:</span> Enforce grounding and refusal logic.
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-emerald-200 font-semibold">Step 3:</span> Export a signed, offline-verifiable Proof Packet.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="text-xs uppercase tracking-[0.3em] text-slate-400 hover:text-slate-200"
            onClick={onSkip}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg"
            style={{ backgroundColor: PRIMARY_COLOR, boxShadow: `0 12px 24px ${PRIMARY_COLOR}33` }}
            onClick={() => demo.startScenario("contract_dispute")}
          >
            Launch Live Evidence Demo
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25"
            onClick={onStart}
          >
            <Play className="h-4 w-4" />
            Initiate Live Green Run
          </button>
        </div>
      </div>
    </div>
  );
}
