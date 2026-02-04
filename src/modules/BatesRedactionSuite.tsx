import React, { useEffect, useMemo, useRef, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Stamp, Eraser, Eye, Download } from "lucide-react";
import { logForensicEvent } from "../services/forensicLogger";

export default function BatesRedactionSuite() {
  const [bates, setBates] = useState("DEF-00100");
  const [applied, setApplied] = useState(false);
  const [redactions, setRedactions] = useState<Array<{ id: string; x: string; y: string; w: string; h: string }>>([]);
  const [files, setFiles] = useState([
    { id: "EX-001", name: "Police_Report_Final.pdf", selected: true, batesId: "" },
    { id: "EX-002", name: "Witness_Statement_Jones.pdf", selected: true, batesId: "" },
    { id: "EX-003", name: "Medical_Invoice_2023.pdf", selected: false, batesId: "" }
  ]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedFiles = useMemo(() => files.filter((file) => file.selected), [files]);

  const applyBates = () => {
    const match = bates.match(/^(.*?)(\d+)$/);
    const prefix = match ? match[1] : "DEF-";
    const start = match ? Number(match[2]) : 100;
    let cursor = start;
    const width = match ? match[2].length : 5;

    const nextFiles = files.map((file) => {
      if (!file.selected) return { ...file };
      const nextId = `${prefix}${String(cursor).padStart(width, "0")}`;
      cursor += 1;
      return { ...file, batesId: nextId };
    });
    setFiles(nextFiles);
    setApplied(true);
    logForensicEvent("bates.apply", { start: bates, count: selectedFiles.length });
  };

  const toggleRedaction = () => {
    if (redactions.length) {
      setRedactions([]);
      logForensicEvent("redaction.clear", {});
      return;
    }
    setRedactions([
      { id: "redact-1", x: "25%", y: "35%", w: "40%", h: "8%" },
      { id: "redact-2", x: "18%", y: "58%", w: "50%", h: "6%" }
    ]);
    logForensicEvent("redaction.apply", { count: 2 });
  };

  const exportPrivLog = () => {
    const rows = files
      .filter((file) => file.selected)
      .map((file) => `${file.id},${file.name},Attorney-Client Privilege,Auto-detected`)
      .join("\n");
    const header = "DocID,Document,Privilege Type,Description\n";
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privilege-log.csv";
    a.click();
    URL.revokeObjectURL(url);
    logForensicEvent("privilege.log.exported", { count: files.filter((f) => f.selected).length });
  };

  const toggleFileSelection = (id: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, selected: !file.selected } : file))
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1f2937";
    ctx.font = "12px monospace";
    ctx.fillText(applied ? "BATES APPLIED" : "PREVIEW", 12, 20);
    if (applied) {
      ctx.fillStyle = "#111827";
      ctx.font = "14px monospace";
      ctx.fillText(files.find((f) => f.selected && f.batesId)?.batesId || bates, 120, canvas.height - 12);
    }
    ctx.fillStyle = "#000000";
    redactions.forEach((item) => {
      const x = parseFloat(item.x) / 100;
      const y = parseFloat(item.y) / 100;
      const w = parseFloat(item.w) / 100;
      const h = parseFloat(item.h) / 100;
      ctx.fillRect(canvas.width * x, canvas.height * y, canvas.width * w, canvas.height * h);
    });
  }, [applied, redactions, bates, files]);

  return (
    <ModuleLayout
      title="Production Suite"
      subtitle="Bates stamping and privilege redaction"
      kpis={[
        { label: "Docs", value: "12", tone: "neutral" },
        { label: "Redactions", value: "8", tone: "warn" },
        { label: "Stamped", value: "12", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-white/10 text-white px-2 py-1 text-xs rounded">
            {applied ? "Bates Applied" : "Preview"}
          </div>
          <div className="relative w-64 h-80 bg-white shadow-xl flex items-center justify-center text-slate-400 text-xs">
            <canvas ref={canvasRef} width={256} height={320} className="absolute inset-0" />
            {redactions.map((item) => (
              <div
                key={item.id}
                className="absolute bg-black/90 border border-black/80"
                style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
              />
            ))}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold opacity-0 hover:opacity-100 transition-opacity">
              REDACT AREA
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Start Bates #</label>
                <input
                  type="text"
                  value={bates}
                  onChange={(e) => setBates(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>
              <div className="space-y-2">
                {files.map((file) => (
                  <label key={file.id} className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={file.selected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="accent-emerald-500"
                      />
                      {file.name}
                    </span>
                    <span className="font-mono text-slate-300">{file.batesId || "--"}</span>
                  </label>
                ))}
              </div>
              <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={applyBates}>
                <Stamp size={16} /> Apply Stamps
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-4">
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-950/30"
                onClick={toggleRedaction}
              >
                <Eraser size={16} /> Redact Selection
              </Button>
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={exportPrivLog}>
                Export Priv Log
              </Button>
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                <Eye size={16} /> Preview Production
              </Button>
              <Button
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={() => logForensicEvent("production.exported", { count: selectedFiles.length })}
              >
                <Download size={16} /> Export Production Set
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
