import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { DEFAULT_AND_MEDIATION } from "../data/motionsChecklist";

export default function DefaultMediation() {
  return (
    <Page title="Default + Mediation" subtitle="Track defaults and mediation readiness.">
      <div className="grid gap-6 lg:grid-cols-2">
        {DEFAULT_AND_MEDIATION.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardSubtitle>Checklist</CardSubtitle>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                {section.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
