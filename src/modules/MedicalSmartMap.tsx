import React from "react";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import { HeartPulse, AlertTriangle, FileText, Activity } from "lucide-react";

const CHRONOLOGY = [
  { date: "2025-11-12", event: "ER Intake", note: "8/10 pain reported" },
  { date: "2025-11-14", event: "MRI Cervical", note: "C4‑C5 herniation" },
  { date: "2025-11-20", event: "Ortho Consult", note: "Radiculopathy left arm" }
];

export default function MedicalSmartMap() {
  return (
    <Page title="Medical SmartMap" subtitle="Fast chronology mapping and injury clusters">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-rose-500/20 bg-rose-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-100">
                <HeartPulse size={18} />
                Injury Timeline
              </CardTitle>
              <CardSubtitle className="text-rose-200/60">
                Highlighted clusters and gaps.
              </CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              {CHRONOLOGY.map((item) => (
                <div key={item.date} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-xs text-rose-300/80 font-mono">{item.date}</div>
                  <div className="text-slate-200 font-medium">{item.event}</div>
                  <div className="text-xs text-slate-500">{item.note}</div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Gap Alerts
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                45‑day treatment gap before PT visits.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-400" />
                Injury Clusters
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-slate-300">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-3">
                Cervical spine injuries detected in 3 documents.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button variant="secondary" className="w-full">
                Export Chronology
              </Button>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                Refresh Analysis
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  );
}
