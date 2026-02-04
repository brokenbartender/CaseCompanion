import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const factors = [
  { id: "F1", label: "Confidential information accessed", weight: 3 },
  { id: "F2", label: "Customer list proprietary", weight: 2 },
  { id: "F3", label: "Employee signed NDA", weight: 1 },
  { id: "F4", label: "Publicly known methods", weight: -2 }
];

const cases = [
  { id: "CASE-101", name: "ABC v. Smith", outcome: "Pro-Plaintiff", factors: ["F1", "F2", "F3"] },
  { id: "CASE-204", name: "Northwind v. Lee", outcome: "Pro-Defendant", factors: ["F4"] }
];

export default function CaseBasedReasoning() {
  const [selectedFactors, setSelectedFactors] = useState<string[]>(["F1", "F2"]);

  const toggleFactor = (id: string) => {
    setSelectedFactors((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <Page title="Case-Based Reasoning" subtitle="Factors, dimensions, and similarity search">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Factor Library</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            {factors.map((factor) => (
              <label key={factor.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFactors.includes(factor.id)}
                  onChange={() => toggleFactor(factor.id)}
                />
                <span>{factor.label}</span>
              </label>
            ))}
            <Button className="w-full">Run Similarity</Button>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Analogous Cases</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            {cases.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-slate-100 font-semibold">{c.name}</div>
                  <span className="text-xs text-emerald-300">{c.outcome}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Matched Factors: {c.factors.join(", ")}</div>
              </div>
            ))}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Purpose Tags</div>
              <div className="mt-2">Fairness • Notice • Reliance • Consumer Protection</div>
              <div className="mt-2 text-slate-400">Used to explain analogies and interpretation choices.</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
