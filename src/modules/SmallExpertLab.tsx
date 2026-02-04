import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { Cpu, Database, Download, Sparkles } from "lucide-react";

export default function SmallExpertLab() {
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  const runPipeline = () => {
    setRunning(true);
    setReady(false);
    setTimeout(() => {
      setRunning(false);
      setReady(true);
    }, 1800);
  };

  return (
    <ModuleLayout
      title="Small Expert Lab"
      subtitle="Hyper-specialized offline model pipeline"
      kpis={[
        { label: "Dataset", value: "12.5k", tone: "neutral" },
        { label: "Quality", value: "High", tone: "good" },
        { label: "GPU", value: "4090", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-100">
              <Sparkles size={18} />
              Synthetic Data Builder
            </CardTitle>
            <CardSubtitle className="text-emerald-200/60">
              Generate textbook-quality Q/A pairs for a narrow legal domain.
            </CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Domain</div>
                <div className="mt-1 text-slate-200 font-medium">Michigan Auto Negligence</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Target Model</div>
                <div className="mt-1 text-slate-200 font-medium">Phi-3 / Mistral 7B</div>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Data Volume</div>
                <div className="mt-1 text-slate-200 font-medium">12,500 Q/A</div>
              </div>
            </div>
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500" onClick={runPipeline}>
              Build Training Set
            </Button>
            {running ? <div className="text-xs text-emerald-200">Synthesizing textbook data...</div> : null}
            {ready ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                Dataset ready. Export to QLoRA fine-tuning pipeline.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={18} className="text-emerald-400" />
                Local Runtime
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Offline mode: enabled (no network calls).
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Target device: RTX 4090 / M3 Max.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={18} className="text-blue-400" />
                Export
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                <Download size={16} /> Export JSONL
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Launch QLoRA Job
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
