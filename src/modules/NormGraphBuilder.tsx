import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const seedNodes = [
  { id: "N1", type: "concept", label: "Legality" },
  { id: "N2", type: "condition", label: "Valid Consent" },
  { id: "N3", type: "question", label: "Was consent documented?" },
  { id: "N4", type: "exception", label: "Emergency exception" }
];

const seedEdges = [
  { from: "N1", to: "N2", label: "depends-on" },
  { from: "N2", to: "N3", label: "requires" },
  { from: "N2", to: "N4", label: "overridden-by" }
];

export default function NormGraphBuilder() {
  const [nodes, setNodes] = useState(seedNodes);
  const [edges] = useState(seedEdges);
  const [newLabel, setNewLabel] = useState("");

  return (
    <Page title="Norm Graph Builder" subtitle="Requirements graphs for legal reasoning">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Graph Canvas</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Nodes</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {nodes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{n.type}</div>
                    <div className="text-slate-100 text-sm">{n.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Edges</div>
              <div className="mt-2 space-y-2">
                {edges.map((e, idx) => (
                  <div key={idx} className="text-xs text-slate-300">{e.from} → {e.to} ({e.label})</div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Build & Export</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Add Node</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="New requirement or exception"
              />
              <Button
                className="mt-2 w-full"
                onClick={() => {
                  if (!newLabel.trim()) return;
                  setNodes((prev) => [...prev, { id: `N${prev.length + 1}`, type: "condition", label: newLabel.trim() }]);
                  setNewLabel("");
                }}
              >
                Add Node
              </Button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Checklist Output</div>
              <div className="mt-2">1. Validate consent documentation</div>
              <div>2. Confirm emergency exception does not apply</div>
              <div>3. Review related statutory obligations</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
