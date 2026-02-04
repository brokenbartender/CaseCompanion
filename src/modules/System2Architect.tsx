import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { Code2, ShieldCheck, Wrench, Sparkles } from "lucide-react";

const CANDIDATES = [
  { id: "A", status: "pass", note: "All tests passed. Complexity O(n)." },
  { id: "B", status: "fail", note: "Unit test failed on edge case: empty input." },
  { id: "C", status: "pass", note: "All tests passed with minor style warnings." }
];

export default function System2Architect() {
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  const runVerifier = () => {
    setRunning(true);
    setReady(false);
    setTimeout(() => {
      setRunning(false);
      setReady(true);
    }, 2000);
  };

  return (
    <ModuleLayout
      title="System-2 Architect"
      subtitle="Multi-candidate verification and self-correcting loop"
      kpis={[
        { label: "Candidates", value: "3", tone: "neutral" },
        { label: "Pass", value: "2", tone: "good" },
        { label: "Fail", value: "1", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-purple-500/20 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-100">
              <Sparkles size={18} />
              Verifier Harness
            </CardTitle>
            <CardSubtitle className="text-purple-200/60">
              Generate 3 candidates, execute tests, select best.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              Prompt: "Draft a motion to compel with citations and verify against exhibit index."
            </div>
            <Button variant="primary" className="bg-purple-600 hover:bg-purple-500" onClick={runVerifier}>
              Run System-2 Loop
            </Button>
            {running ? <div className="text-xs text-purple-200">Executing candidate tests...</div> : null}
            {ready ? (
              <div className="rounded border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-100">
                Candidate A selected. Confidence 0.89. Audit log stored.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 size={18} className="text-purple-400" />
                Candidate Runs
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              {CANDIDATES.map((item) => (
                <div key={item.id} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Candidate {item.id}</div>
                  <div className={`mt-1 text-sm ${item.status === "pass" ? "text-emerald-300" : "text-rose-300"}`}>
                    {item.status === "pass" ? "PASS" : "FAIL"} · {item.note}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench size={18} className="text-amber-400" />
                Controls
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Export Audit JSON
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Reset Loop
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
