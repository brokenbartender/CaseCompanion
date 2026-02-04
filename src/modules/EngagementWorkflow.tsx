import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { logForensicEvent } from "../services/forensicLogger";

export default function EngagementWorkflow() {
  const [step, setStep] = useState<"draft" | "review" | "sent">("draft");

  return (
    <Page title="Engagement Workflow" subtitle="Generate, review, and execute engagement letters">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Engagement Letter</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <textarea
              className="h-64 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-slate-100"
              defaultValue="This engagement letter confirms our representation of Broken Arrow Entertainment..."
            />
            <div className="flex gap-3">
              <Button onClick={() => { setStep("review"); logForensicEvent("engagement.review", { step: "review" }); }}>
                Send for Review
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("sent");
                  logForensicEvent("engagement.sent", { step: "sent" });
                }}
              >
                Send to Client
              </Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <div>Current Step: <span className="text-emerald-400">{step}</span></div>
            <div>Signer: Client + Partner</div>
            <div>Signature Method: eSign (mock)</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Case Assignment</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-300 space-y-2">
            <div>Lead Attorney: Alicia Grant</div>
            <div>Paralegal: Noah Patel</div>
            <div>Billing Attorney: Riley Chen</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
