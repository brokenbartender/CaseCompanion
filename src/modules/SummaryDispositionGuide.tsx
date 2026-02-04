import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { SUMMARY_DISPOSITION_GUIDE } from "../data/summaryDisposition";

export default function SummaryDispositionGuide() {
  return (
    <Page title="Summary Disposition" subtitle="Grounds, timing, and evidence reference.">
      <div className="grid gap-6">
        {SUMMARY_DISPOSITION_GUIDE.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardSubtitle>Guide</CardSubtitle>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{step.detail}</div>
              <div className="mt-3 text-xs text-slate-500">Sources: {step.sources.join(", ")}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
