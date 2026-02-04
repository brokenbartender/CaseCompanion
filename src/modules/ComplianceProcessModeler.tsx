import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const stepsSeed = [
  { id: "S1", name: "Collect Consent", rule: "Consent required before processing" },
  { id: "S2", name: "Process Data", rule: "PII must be masked" },
  { id: "S3", name: "Notify Client", rule: "Notify within 30 days" }
];

export default function ComplianceProcessModeler() {
  const [steps] = useState(stepsSeed);
  const [reportVisible, setReportVisible] = useState(false);

  return (
    <Page title="Compliance Process Model" subtitle="Workflow steps annotated with regulatory rules">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Process Steps</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            {steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="text-slate-100 font-semibold">{step.name}</div>
                <div className="text-xs text-slate-400">Rule: {step.rule}</div>
              </div>
            ))}
            <Button onClick={() => setReportVisible(true)}>Run Compliance Check</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Violation Report</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            {reportVisible ? (
              <>
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  Trace 4 violated rule: Notify within 30 days (Step S3).
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  Suggested fix: add reminder task + auto-notification template.
                </div>
              </>
            ) : (
              <div className="text-slate-500">Run a check to view violations.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
