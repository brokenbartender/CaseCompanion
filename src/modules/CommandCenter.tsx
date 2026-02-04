import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileAudio, FileVideo, Mail, Database } from "lucide-react";
import { getApiBase } from "../services/apiBase";
import { getCsrfHeader } from "../services/csrf";
import { logForensicEvent } from "../services/forensicLogger";
import { useNavigate } from "react-router-dom";

const MOCK_EVIDENCE = [
  {
    id: "EX-001",
    name: "Police_Report_Final.pdf",
    type: "pdf",
    size: "2.4 MB",
    status: "ready",
    ai_tags: ["Official Record", "Date: 2023-11-01"],
    sampleText: "Officer noted witness stated the driver would never stop and guaranteed compliance."
  },
  {
    id: "EX-002",
    name: "Dashcam_Footage_Front.mp4",
    type: "video",
    size: "145 MB",
    status: "processing",
    ai_tags: ["Video", "Night"],
    sampleText: "Video evidence pending OCR transcript."
  },
  {
    id: "EX-003",
    name: "Witness_Audio_Jones.wav",
    type: "audio",
    size: "12 MB",
    status: "ready",
    ai_tags: ["Audio", "Transcript Generated"],
    sampleText: "Caller provided SSN 123-45-6789 during statement."
  }
];

const analyzeRisk = (text: string) => {
  const risks: string[] = [];
  if (/(guarantee|always|never)/i.test(text)) risks.push("High Risk Language");
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text) || /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text)) {
    risks.push("Compliance Risk (PII)");
  }
  return risks;
};

export default function CommandCenter() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const runBatch = async () => {
    if (!selected.length) return;
    setBatchRunning(true);
    setBatchProgress(0);
    logForensicEvent("batch.analyze.start", { count: selected.length });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    Object.assign(headers, getCsrfHeader());
    fetch(`${getApiBase()}/batch/analyze`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ items: selected.map((id) => ({ id })) })
    }).catch(() => null);

    let step = 0;
    const total = selected.length;
    const timer = window.setInterval(() => {
      step += 1;
      setBatchProgress(Math.min(100, Math.round((step / total) * 100)));
      if (step >= total) {
        window.clearInterval(timer);
        setBatchRunning(false);
        logForensicEvent("batch.analyze.complete", { count: total });
      }
    }, 350);
  };

  return (
    <ModuleLayout
      title="Evidence Locker"
      subtitle="Secure chain-of-custody ingestion and OCR processing"
      kpis={[
        { label: "Items", value: "3", tone: "neutral" },
        { label: "Indexed", value: "2", tone: "good" },
        { label: "OCR", value: "1", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-[0.3em] text-slate-500">Batch Actions</span>
          <span>{selected.length} selected</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setSelected([])}>
            Clear
          </Button>
          <Button variant="primary" onClick={runBatch} disabled={!selected.length || batchRunning}>
            Analyze All
          </Button>
        </div>
        <div className="w-full">
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${batchProgress}%` }} />
          </div>
          {batchRunning ? (
            <div className="mt-1 text-[10px] text-emerald-200">Processing queue...</div>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Evidence Repository</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {MOCK_EVIDENCE.map((file) => {
                const risks = analyzeRisk(file.sampleText);
                return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="accent-emerald-500"
                    />
                    <div className="p-3 bg-slate-800 rounded">
                      {file.type === "pdf" ? (
                        <FileText className="text-blue-400" />
                      ) : file.type === "video" ? (
                        <FileVideo className="text-rose-400" />
                      ) : (
                        <FileAudio className="text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{file.name}</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono">
                          {file.id} - {file.size}
                        </span>
                        {file.ai_tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-slate-800 px-2 rounded text-slate-400">
                            {tag}
                          </span>
                        ))}
                        {risks.map((risk) => (
                          <span key={risk} className="text-[10px] bg-rose-500/20 px-2 rounded text-rose-200">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    {file.status === "ready" ? (
                      <span className="flex items-center text-xs text-emerald-400 gap-1">
                        <CheckCircle2 size={14} /> Indexed
                      </span>
                    ) : (
                      <span className="flex items-center text-xs text-amber-400 gap-1">
                        <AlertCircle size={14} className="animate-pulse" /> OCR Running
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card className="border-dashed border-2 border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center p-8 text-center h-64">
            <UploadCloud size={48} className="text-slate-500 mb-4" />
            <h3 className="text-slate-200 font-medium">Ingest Evidence</h3>
            <p className="text-xs text-slate-500 mt-2">Drag files here to auto-hash and start chain of custody.</p>
            <Button variant="primary" className="mt-6 w-full">
              Browse Files
            </Button>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Evidence Pipeline</CardTitle>
              <CardSubtitle>Ingest to production with governance checkpoints.</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              {[
                { label: "Ingest", status: "Active", action: () => navigate("../exhibits") },
                { label: "OCR + Metadata", status: "Queued", action: () => navigate("../exhibits") },
                { label: "Review Queue", status: "Ready", action: () => navigate("../review-queue") },
                { label: "Privilege Review", status: "Ready", action: () => navigate("../review-queue") },
                { label: "Redaction + Bates", status: "Ready", action: () => navigate("../production") },
                { label: "QC", status: "Pending", action: () => navigate("../production-qc") },
                { label: "Production", status: "Pending", action: () => navigate("../production-center") }
              ].map((step) => (
                <div key={step.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
                  <div className="text-slate-200">{step.label}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-[0.2em] ${
                      step.status === "Active" ? "text-emerald-300" : step.status === "Ready" ? "text-blue-300" : "text-amber-300"
                    }`}>
                      {step.status}
                    </span>
                    <Button variant="secondary" size="sm" onClick={step.action}>
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Connectors</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <Button variant="secondary" className="w-full flex items-center gap-2" onClick={() => navigate("../dms")}>
                <Database size={14} /> DMS Connector
              </Button>
              <Button variant="secondary" className="w-full flex items-center gap-2" onClick={() => navigate("../email-capture")}>
                <Mail size={14} /> Email Capture
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
