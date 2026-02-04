import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { FILING_CHECKLIST } from "../data/filingChecklist";

export default function FilingChecklist() {
  return (
    <Page title="Filing Checklist" subtitle="Pleadings, summons, and service workflow.">
      <div className="grid gap-6">
        {FILING_CHECKLIST.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardSubtitle>Section</CardSubtitle>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                {section.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-500">Sources: {section.sources.join(", ")}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
