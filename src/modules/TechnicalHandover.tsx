import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Globe, Shield, Database, ArrowRight } from "lucide-react";

type SyncStatus = "IDLE" | "LOCAL_HASH_READING" | "BRIDGE_QUEUE_SYNC" | "CLOUD_ANCHOR_VERIFIED" | "COMPLETED";

export default function TechnicalHandover() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("IDLE");

  const startBridgeSim = () => {
    setSyncStatus("LOCAL_HASH_READING");
    setTimeout(() => setSyncStatus("BRIDGE_QUEUE_SYNC"), 1000);
    setTimeout(() => setSyncStatus("CLOUD_ANCHOR_VERIFIED"), 2500);
    setTimeout(() => setSyncStatus("COMPLETED"), 3500);
  };

  return (
    <Page title="IP Blueprint: Handover" subtitle="Sovereign Architecture & Cloud Bridge Protocols">
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-slate-950 border border-white/5 p-4 rounded-2xl shadow-inner">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LOCAL-ONLY MODE (SOVEREIGN)
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 grayscale">
            HYBRID READY
          </div>
          <div className="flex-1 text-right text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Last Network Egress: <span className="text-emerald-400">NONE (Past 24h)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
            <h4 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
              <Database size={18} className="text-blue-400" />
              Cloud Bridge Simulation
            </h4>
            <div className="mb-4 rounded-xl border border-white/5 bg-black/40 px-4 py-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
                <span>Outbound Traffic Monitor</span>
                <span className="font-mono text-emerald-300">0.00kb</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Air-gapped mode enforced during inference.
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="z-10 flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Local Ledger</span>
                  <span className="font-mono text-xs text-slate-200">L-2026-X4</span>
                </div>
                <ArrowRight className="text-slate-700" />
                <div className="z-10 flex flex-col text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">S3 Anchor</span>
                  <span className="font-mono text-xs text-slate-400">SYNC_PENDING</span>
                </div>
                {syncStatus !== "IDLE" ? (
                  <div className="absolute inset-0 bg-blue-500/5 animate-[pulse_1.5s_infinite]" />
                ) : null}
              </div>
              <button
                onClick={startBridgeSim}
                className="w-full py-3 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-100 text-xs font-bold hover:bg-blue-500/20 transition-all"
              >
                TEST CLOUD ANCHOR PROTOCOL
              </button>
            </div>

            <div className="mt-6 font-mono text-[10px] text-slate-500 bg-black/60 p-4 rounded-lg border border-white/5 min-h-[80px]">
              {syncStatus === "IDLE" ? "> System air-gapped. Standby." : null}
              {syncStatus !== "IDLE" ? `> [${new Date().toISOString()}] Initiating Handshake...` : null}
              {syncStatus === "COMPLETED" ? (
                <div className="text-emerald-400 mt-1">
                  {"> BRIDGE_SYNC_SUCCESS: Immutable log shipped to AWS WORM."}
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <h4 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
              <Globe size={18} className="text-indigo-400" />
              Egress Shielding
            </h4>
            <div className="flex items-center justify-center h-40">
              <div className="relative">
                <Shield className="w-24 h-24 text-slate-800" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center animate-pulse">
                    <span className="text-[10px] font-black text-emerald-400">L-O-C-A-L</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mt-4">
              Forensic Air-Gap Active. All inference occurring on local hardware.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
