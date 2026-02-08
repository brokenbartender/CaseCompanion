import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Map } from "lucide-react";

const STATES = ["Federal", "CA", "NY", "TX", "FL", "IL", "MI", "WA"];

export default function JurisdictionCompare() {
  const [selected, setSelected] = useState<string[]>(["Federal", "CA", "NY"]);
  const [ready, setReady] = useState(false);

  const toggle = (state: string) => {
    setSelected((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  return (
    <ModuleLayout
      title="Jurisdiction Comparison"
      subtitle="50-state survey with row-level citations"
      kpis={[
        { label: "Selected", value: String(selected.length), tone: "neutral" },
        { label: "Rows", value: ready ? "3" : "0", tone: ready ? "good" : "warn" },
        { label: "Mode", value: "Survey", tone: "neutral" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map size={18} className="text-blue-400" />
              Multi-Jurisdiction Matrix
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selected.includes(s)
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => setReady(true)}>
              Run Comparison
            </Button>
            {ready ? (
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2">Jurisdiction</th>
                      <th className="pb-2">Rule Summary</th>
                      <th className="pb-2">Citation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="py-2">Federal</td>
                      <td>Notice required within 30 days.</td>
                      <td>FRCP 26(f)</td>
                    </tr>
                    <tr>
                      <td className="py-2">CA</td>
                      <td>Special pleading standard applies.</td>
                      <td>Cal. Civ. Code 3294</td>
                    </tr>
                    <tr>
                      <td className="py-2">NY</td>
                      <td>Good faith standard for sanctions.</td>
                      <td>CPLR 8303-a</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authority Context</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">TLDR</div>
              <div className="mt-2 text-slate-200">Notice requirements vary by jurisdiction; CA has higher pleading thresholds.</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Rule</div>
              <div className="mt-2">FRCP 26(f) requires a discovery plan within 30 days.</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Exceptions</div>
              <div className="mt-2">Local rules may shorten or extend the window.</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Statute Hierarchy</div>
              <div className="mt-2 text-slate-200">Federal Code &gt; Title 28 &gt; Chapter 13 &gt; Section 2072</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Normalized View</div>
              <ul className="mt-2 space-y-1 text-slate-200">
                <li>1. Parties must confer within 30 days.</li>
                <li>2. Conference must produce a discovery plan.</li>
                <li>3. Plan must be filed with the court.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Ambiguity Explorer</div>
              <div className="mt-2 text-slate-200">
                Reading A: 30-day clock runs from initial conference.
              </div>
              <div className="mt-1 text-slate-200">
                Reading B: 30-day clock runs from service of complaint.
              </div>
              <div className="mt-2 text-xs text-amber-300">Selected: Reading A (audited)</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Definitions</div>
              <div className="mt-2">“Discovery plan” = agreed schedule for disclosures and discovery.</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Source Text</div>
              <div className="mt-2 text-slate-400">
                “...the parties must confer and develop a proposed discovery plan...” (FRCP 26(f)).
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
