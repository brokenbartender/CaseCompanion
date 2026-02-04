import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { FileText, Mail, Globe, Download } from "lucide-react";

export default function DraftingIntegration() {
  const [ready, setReady] = useState(false);

  return (
    <ModuleLayout
      title="Integrated Drafting Assistant"
      subtitle="Embed LexiPro in Word/Outlook/Browser workflows"
      kpis={[
        { label: "Integrations", value: "3", tone: "neutral" },
        { label: "Drafts", value: "Ready", tone: "good" },
        { label: "Citations", value: "Linked", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              Workflow Integrations
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 flex items-center gap-3">
              <Mail size={16} className="text-amber-400" />
              Outlook: Draft client emails with citations.
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 flex items-center gap-3">
              <FileText size={16} className="text-blue-400" />
              Word: Insert redlines + exhibits.
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
              Auto-time capture enabled for drafting sessions.
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 flex items-center gap-3">
              <Globe size={16} className="text-emerald-400" />
              Browser: “Send to LexiPro” extension.
            </div>
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-500" onClick={() => setReady(true)}>
              Generate Draft Package
            </Button>
            {ready ? (
              <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
                Draft package ready. Citations embedded.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={18} className="text-emerald-400" />
                Downloads
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <Button variant="secondary" className="w-full">
                Download Word Add‑in
              </Button>
              <Button variant="secondary" className="w-full">
                Download Outlook Add‑in
              </Button>
              <Button variant="secondary" className="w-full">
                Download Browser Extension
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                Document Automation
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Template library with merge fields and clause presets.
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Advanced form logic (HotDocs-style) for complex filings.
              </div>
              <Button variant="secondary" className="w-full">Open Template Builder</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
