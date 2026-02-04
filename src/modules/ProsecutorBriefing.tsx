import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { ShieldCheck, FileText, AlertTriangle, ClipboardList } from "lucide-react";
import { MODULE_PROMPTS } from "../services/modulePrompts";
import { useModuleAI } from "../hooks/useModuleAI";
import { logForensicEvent } from "../services/forensicLogger";

const KEY_POINTS = [
  "Primary witness timeline aligns with bodycam footage.",
  "Digital evidence confirms suspect presence at 22:41.",
  "Chain of custody verified for firearm and shell casing."
];

export default function ProsecutorBriefing() {
  const [packetReady, setPacketReady] = useState(false);
  const { run, loading, output, error } = useModuleAI(MODULE_PROMPTS.prosecutor_briefing.key);
  return (
    <ModuleLayout
      title="Prosecutor Briefing"
      subtitle="Evidence alignment, argument sequencing, and trial prep cues"
      kpis={[
        { label: "Packets", value: "2", tone: "neutral" },
        { label: "Risks", value: "2", tone: "warn" },
        { label: "Ready", value: "Yes", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-slate-500/20 bg-slate-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <ShieldCheck size={18} />
                Trial Narrative Stack
              </CardTitle>
              <CardSubtitle className="text-slate-200/60">
                Condensed argument flow for opening statement.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              {KEY_POINTS.map((point) => (
                <div key={point} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  {point}
                </div>
              ))}
              <Button
                variant="primary"
                className="bg-slate-700 hover:bg-slate-600"
                onClick={async () => {
                  await logForensicEvent("prosecutor.brief.generate", { scope: "prosecutor" });
                  await run(MODULE_PROMPTS.prosecutor_briefing.defaultPrompt);
                }}
              >
                Generate Opening Draft
              </Button>
              {loading ? <div className="text-xs text-slate-300">Generating trial narrative...</div> : null}
              {error ? (
                <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                  {error}
                </div>
              ) : null}
              {output ? (
                <div className="rounded border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-300 whitespace-pre-wrap">
                  {output}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                Evidence Packets
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Exhibit Binder A: Scene Evidence
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Exhibit Binder B: Forensics & Lab Reports
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Vulnerabilities
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Defense likely to challenge eyewitness reliability.
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                Latent print quality rated moderate.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={() => setPacketReady(true)}
              >
                Generate Packet
              </Button>
              {packetReady ? (
                <a
                  className="block text-xs text-emerald-300 underline"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  Download Packet.pdf
                </a>
              ) : null}
              <Button variant="secondary" className="w-full">
                Export Trial Brief
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Reset Briefing
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
