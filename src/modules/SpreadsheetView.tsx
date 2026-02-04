import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card } from "../components/ui/Card";

export default function SpreadsheetView() {
  const [tab, setTab] = useState<"grid" | "map">("grid");
  const [provenance, setProvenance] = useState<{
    x: number;
    y: number;
    fact: string;
    source: string;
  } | null>(null);

  const showProvenance = (event: React.MouseEvent, fact: string, source: string) => {
    event.preventDefault();
    setProvenance({ x: event.clientX, y: event.clientY, fact, source });
  };

  return (
    <ModuleLayout
      title="CaseMap Grid"
      subtitle="Structured fact, issue, and entity relationship mapping"
      kpis={[
        { label: "Facts", value: "128", tone: "neutral" },
        { label: "Issues", value: "12", tone: "good" },
        { label: "Disputed", value: "7", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("grid")}
          className={`rounded-full px-3 py-1 text-xs ${
            tab === "grid" ? "bg-slate-800 text-white" : "border border-slate-800 text-slate-400"
          }`}
        >
          Grid
        </button>
        <button
          type="button"
          onClick={() => setTab("map")}
          className={`rounded-full px-3 py-1 text-xs ${
            tab === "map" ? "bg-slate-800 text-white" : "border border-slate-800 text-slate-400"
          }`}
        >
          Issue Map
        </button>
      </div>
      {tab === "map" ? (
        <Card className="p-4 text-sm text-slate-300">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Issue Map</div>
          <div className="mt-4 space-y-3">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-slate-200">Issue: Negligence</div>
              <div className="mt-2 text-slate-400">Fact: Speeding through intersection</div>
              <div className="mt-1 text-blue-300 text-xs">Evidence: Dashcam_Footage_Front.mp4</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-slate-200">Issue: Identification</div>
              <div className="mt-2 text-slate-400">Fact: Vehicle color observed as red sedan</div>
              <div className="mt-1 text-blue-300 text-xs">Evidence: Witness_Statement_Jones.pdf</div>
            </div>
          </div>
        </Card>
      ) : (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 text-slate-200 font-medium border-b border-slate-700">
              <tr>
                <th className="p-4 w-32">Date</th>
                <th className="p-4 w-24">Time</th>
                <th className="p-4">Fact / Event</th>
                <th className="p-4 w-48">Source</th>
                <th className="p-4 w-40">Issue Tags</th>
                <th className="p-4 w-32">Disputed?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr
                className="hover:bg-slate-900/50"
                onContextMenu={(e) =>
                  showProvenance(
                    e,
                    "Defendant vehicle seen leaving the intersection at high speed.",
                    "Witness Statement (Jones)"
                  )
                }
              >
                <td className="p-4 font-mono">2023-11-01</td>
                <td className="p-4 font-mono">21:45</td>
                <td className="p-4 text-slate-200">
                  Defendant vehicle seen leaving the intersection at high speed.
                </td>
                <td className="p-4 text-blue-400 cursor-pointer hover:underline">Wit. Statement (Jones)</td>
                <td className="p-4">
                  <span className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs">Negligence</span>
                </td>
                <td className="p-4 text-amber-400">Yes (Defense)</td>
              </tr>
              <tr
                className="hover:bg-slate-900/50"
                onContextMenu={(e) => showProvenance(e, "911 Call placed by bystander.", "Police Report p.2")}
              >
                <td className="p-4 font-mono">2023-11-01</td>
                <td className="p-4 font-mono">21:50</td>
                <td className="p-4 text-slate-200">911 Call placed by bystander.</td>
                <td className="p-4 text-blue-400 cursor-pointer hover:underline">Police Report p.2</td>
                <td className="p-4">
                  <span className="bg-slate-800 px-2 py-1 rounded text-xs">Timeline</span>
                </td>
                <td className="p-4 text-emerald-500">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      )}
      {provenance ? (
        <div
          className="fixed z-50 w-72 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 shadow-xl"
          style={{ left: provenance.x + 12, top: provenance.y + 12 }}
          onMouseLeave={() => setProvenance(null)}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Provenance</div>
          <div className="mt-2 text-slate-100 font-medium">{provenance.fact}</div>
          <div className="mt-2 text-slate-400">Final Fact</div>
          <div className="mt-2 rounded border border-slate-800 bg-slate-900/60 p-2">
            Extracted from {provenance.source}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Uploaded by User X on 2026-01-12
          </div>
        </div>
      ) : null}
    </ModuleLayout>
  );
}
