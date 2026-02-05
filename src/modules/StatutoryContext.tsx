import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const STATUTES = [
  {
    title: "MCL 750.81 — Assault and Battery (criminal reference)",
    summary:
      "Defines assault and battery in Michigan criminal law. Useful for understanding terms, not a civil procedure rule."
  },
  {
    title: "M Crim JI 13.1/13.2 — Criminal Jury Instructions",
    summary:
      "Explains assault and battery elements in criminal cases. Helpful for terminology and narrative framing."
  }
];

export default function StatutoryContext() {
  return (
    <Page title="Statutory Context" subtitle="Criminal references for terminology (not legal advice).">
      <div className="grid gap-6 lg:grid-cols-2">
        {STATUTES.map((statute) => (
          <Card key={statute.title}>
            <CardHeader>
              <CardSubtitle>Reference</CardSubtitle>
              <CardTitle>{statute.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{statute.summary}</div>
            </CardBody>
          </Card>
        ))}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Note</CardSubtitle>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              These references help with terminology and framing only. Civil procedure steps still come from the civil
              benchbook and MCR rules.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
