import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { UploadCloud, AlertCircle, CalendarDays } from "lucide-react";

const MOCK_CHRONOLOGY = [
  { date: "2025-11-12", provider: "Pontiac General Hospital", type: "Emergency", summary: "Initial intake following MVA. Pt reports 8/10 neck pain.", flag: "gap" },
  { date: "2025-11-14", provider: "Oakland Imaging Center", type: "Radiology", summary: "MRI Cervical Spine. Findings: C4-C5 herniation affecting thecal sac.", flag: "critical" },
  { date: "2025-11-20", provider: "Dr. Sarah Chen, Ortho", type: "Consult", summary: "Ortho consult. Pt reports radiculopathy in left arm. Reflexes diminished.", flag: "normal" },
  { date: "2025-12-05", provider: "Main Street PT", type: "Therapy", summary: "Session 4/12. Range of motion improved by 10%.", flag: "normal" }
];

export default function MedicalAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setHasResults(true);
    }, 1500);
  };

  return (
    <ModuleLayout
      title="Medical Analysis"
      subtitle="Chronology generation and injury gap detection"
      kpis={[
        { label: "Providers", value: "4", tone: "neutral" },
        { label: "Gaps", value: "1", tone: "warn" },
        { label: "ICD Codes", value: "2", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      {!hasResults ? (
        <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
          <UploadCloud size={48} className="text-rose-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200">Ingest Medical Records</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-sm text-center">
            Supports PDF, DICOM, and HL7. Automatically maps ICD-10 codes.
          </p>
          <Button variant="primary" onClick={runAnalysis} className="mt-8 bg-rose-600 hover:bg-rose-500" disabled={analyzing}>
            {analyzing ? "Analyzing Records..." : "Process Records"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-rose-500/20 bg-rose-950/10">
              <CardHeader>
                <CardTitle className="text-rose-100 flex items-center gap-2">
                  <CalendarDays size={18} /> Treatment Chronology
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                {MOCK_CHRONOLOGY.map((event, idx) => (
                  <div key={idx} className="relative pl-6 pb-2 border-l border-slate-700">
                    <div className={`absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full ${event.flag === "critical" ? "bg-red-500" : "bg-slate-600"}`} />
                    <div className="text-xs font-mono text-rose-300">{event.date}</div>
                    <div className="font-medium text-slate-200">{event.provider}</div>
                    <div className="text-sm text-slate-400">{event.summary}</div>
                    {event.flag === "gap" && (
                      <div className="mt-2 p-2 bg-amber-900/30 border border-amber-500/30 rounded text-amber-200 text-xs flex items-center gap-2">
                        <AlertCircle size={14} /> GAP DETECTED: 45 days without treatment.
                      </div>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Injuries</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded mb-2">
                  <div className="text-sm font-medium text-slate-200">Cervical Herniation</div>
                  <div className="text-xs text-rose-400 font-mono">ICD-10: M50.20</div>
                </div>
              </CardBody>
            </Card>
            <Button variant="ghost" onClick={() => setHasResults(false)} className="w-full">
              Reset
            </Button>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
