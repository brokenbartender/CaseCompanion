import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Activity, Layout } from "lucide-react";

export default function IntegrationPortal() {
  const [pluginView, setPluginView] = useState(false);
  const metrics = [
    { label: "OIDC SSO Auth", status: "READY", time: "200ms" },
    { label: "Lexis Portal Embed", status: "VERIFIED", time: "Ready" },
    { label: "API Global Latency", status: "STABLE", time: "42ms" }
  ];

  return (
    <Page title="Integration Ecosystem" subtitle="Shadow DOM & API Handover Protocols">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-4 rounded-2xl border border-white/5 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{metric.label}</div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm">{metric.status}</span>
                <span className="text-slate-400 font-mono text-[10px]">{metric.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
          <div className="bg-slate-800/80 px-4 py-2 flex items-center gap-4 text-xs">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
            </div>
            <div className="flex-1 bg-black/40 rounded px-3 py-1 font-mono text-slate-500 text-[10px]">
              https://lexis.com/research/portal/embed/lexipro_forensics
            </div>
          </div>

          <div className="h-[400px] flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] opacity-10 grayscale" />
            {pluginView ? (
              <div className="z-10 w-[90%] h-[85%] rounded-2xl border border-blue-500/40 bg-black/40 overflow-hidden">
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-blue-200 bg-blue-500/10 border-b border-blue-500/20">
                  Lexis+ Plugin View (iframe)
                </div>
                <iframe
                  title="Lexis+ Plugin Preview"
                  className="w-full h-full"
                  src="/embed-test.html"
                />
              </div>
            ) : (
              <div className="z-10 bg-slate-950/90 border border-blue-500/30 p-10 rounded-2xl text-center backdrop-blur-xl group-hover:border-blue-400 transition-all">
                <Layout className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h5 className="text-slate-100 font-bold">Enterprise Portal Embed</h5>
                <p className="text-slate-400 text-xs mt-2">LexiPro running inside Shadow DOM container.</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700 px-3 py-1 rounded">
                    No CSS Collision
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700 px-3 py-1 rounded">
                    Isolate JS Context
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 px-5 py-3">
          <div className="text-xs text-slate-400">
            Toggle the Shadow DOM embed wrapper used in Lexis+ plugin deployments.
          </div>
          <button
            type="button"
            onClick={() => setPluginView((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border ${
              pluginView
                ? "border-blue-400/60 text-blue-200 bg-blue-500/10"
                : "border-slate-700 text-slate-400 bg-black/30"
            }`}
          >
            View As Lexis+ Plugin
          </button>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 px-6 py-3 rounded-full">
            <Activity className="text-blue-400" size={16} />
            <span className="text-xs font-bold text-blue-200">
              TIME TO EMBED: 48 MINUTES (OIDC + Component Registration)
            </span>
          </div>
        </div>
      </div>
    </Page>
  );
}
