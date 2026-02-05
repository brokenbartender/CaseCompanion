import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const QUICK_RULES = [
  { title: "MCR Chapter 2", note: "Civil procedure rules for filing, service, and motions." },
  { title: "Service of Process Table", note: "Method + timing for serving summons/complaint." },
  { title: "Summary Disposition Table", note: "Standards and deadlines for dispositive motions." },
  { title: "Michigan Civil Benchbook", note: "Courtroom flow, filings, and trial steps." },
  { title: "Evidence Standards", note: "Authenticity, relevance, and video admissibility." }
];

export default function RulesQuickReference() {
  return (
    <Page title="Rules Quick Reference" subtitle="Short list of the most-used court rules and guides.">
      <div className="grid gap-6 lg:grid-cols-2">
        {QUICK_RULES.map((rule) => (
          <Card key={rule.title}>
            <CardHeader>
              <CardSubtitle>Quick Link</CardSubtitle>
              <CardTitle>{rule.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{rule.note}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
