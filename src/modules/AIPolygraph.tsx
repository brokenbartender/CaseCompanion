import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { ShieldAlert, Brain, AlertTriangle } from "lucide-react";

export default function AIPolygraph() {
  const [flagged, setFlagged] = useState(false);

  return (
    <ModuleLayout
      title="AI Polygraph"
      subtitle="Mechanistic interpretability & deception signals"
      kpis={[
        { label: "Truth", value: "0.61", tone: "neutral" },
        { label: "Deception", value: "0.77", tone: "warn" },
        { label: "Probe", value: "Active", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-rose-500/20 bg-rose-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-100">
              <ShieldAlert size={18} />
              Truthfulness Monitor
            </CardTitle>
            <CardSubtitle className="text-rose-200/60">
              Detects uncertainty spikes and deception activation vectors.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
              Statement: "The defendant was not present at the scene."
            </div>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-500"
              onClick={() => setFlagged((prev) => !prev)}
            >
              Run Polygraph Scan
            </Button>
            {flagged ? (
              <div className="rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                Deception signal detected. Confidence 0.77. Requires corroboration.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={18} className="text-purple-400" />
                Probe Metrics
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Truth probe: 0.61</div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">Deception probe: 0.77</div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Action
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Export Probe Report
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Reset Scan
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
