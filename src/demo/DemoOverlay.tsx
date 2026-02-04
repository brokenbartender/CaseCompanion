import React from "react";
import { Cpu } from "lucide-react";
import { useAutoDemo } from "./useAutoDemo";

export default function DemoOverlay() {
  const demo = useAutoDemo();

  if (!demo.active || !demo.stage?.narrative) return null;

  return (
    <div className="fixed bottom-10 left-0 right-0 z-[70] flex justify-center pointer-events-none">
      <div className="mx-4 flex w-full max-w-3xl items-center gap-4 rounded-2xl border border-emerald-500/30 bg-slate-950/90 px-6 py-4 text-slate-100 shadow-2xl backdrop-blur">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-sm" />
          <div className="relative z-10 rounded-full border border-emerald-500/50 bg-slate-900 p-3">
            <Cpu className="h-6 w-6 text-emerald-300" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-300">LexiPro Autopilot</div>
          <div className="mt-2 font-mono text-sm text-slate-100">{demo.stage.narrative}</div>
        </div>
      </div>
    </div>
  );
}
