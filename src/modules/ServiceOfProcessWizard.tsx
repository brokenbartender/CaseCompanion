import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { SERVICE_OF_PROCESS_GUIDE } from "../data/serviceOfProcess";

export default function ServiceOfProcessWizard() {
  return (
    <Page title="Service of Process" subtitle="Rule-aligned guidance and checklist.">
      <div className="grid gap-6">
        {SERVICE_OF_PROCESS_GUIDE.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardSubtitle>Step</CardSubtitle>
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
