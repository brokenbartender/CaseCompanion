import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function QuestionnaireReview() {
  return (
    <Page title="Questionnaire Review" subtitle="Flags, incomplete questions, and document center">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Flagged Questions</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              Q: Employment gap in 2022
              <div className="mt-2 text-xs text-slate-500">Client note: "Forgot dates"</div>
              <Button variant="secondary" className="mt-2">Respond + Close Flag</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Incomplete Questions</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              Income section incomplete
              <div className="mt-2 text-xs text-slate-500">Saved for later</div>
            </div>
            <Button variant="secondary">Prompt Client to Finish</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Document Center</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Paystub_01.pdf • 2.4MB</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Tax_Return_2024.pdf • 1.1MB</div>
            <Button variant="secondary">Download All (ZIP)</Button>
          </CardBody>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle>Needs Review Notes</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              Note: Verify prior employer list; add W-2s.
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">Resubmit to Client</Button>
              <Button variant="secondary">Mark Complete</Button>
              <Button variant="secondary">Reopen Note</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
