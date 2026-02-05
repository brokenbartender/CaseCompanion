import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const RESOURCES = [
  {
    title: "Michigan Courts Self-Help",
    description: "Self-represented litigant resources and guides."
  },
  {
    title: "Michigan Court Forms",
    description: "Civil forms including MC 01, MC 01a, MC 20, MC 97."
  },
  {
    title: "MiFILE Knowledge Base",
    description: "E-filing guides and troubleshooting."
  }
];

export default function ResourcesHub() {
  return (
    <Page title="Resources Hub" subtitle="Self-help links and filing resources.">
      <div className="grid gap-6 lg:grid-cols-3">
        {RESOURCES.map((resource) => (
          <Card key={resource.title}>
            <CardHeader>
              <CardSubtitle>Resource</CardSubtitle>
              <CardTitle>{resource.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{resource.description}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
