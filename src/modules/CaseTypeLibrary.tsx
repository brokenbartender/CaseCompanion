import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const CASE_TYPES = [
  { type: "Civil tort / personal injury", eligible: true },
  { type: "Contract", eligible: true },
  { type: "Small claims", eligible: false },
  { type: "Other", eligible: false }
];

export default function CaseTypeLibrary() {
  return (
    <Page title="Case-Type Eligibility" subtitle="Quick reference for e-filing eligibility.">
      <div className="grid gap-6 lg:grid-cols-2">
        {CASE_TYPES.map((item) => (
          <Card key={item.type}>
            <CardHeader>
              <CardSubtitle>{item.eligible ? "Eligible" : "May be blocked"}</CardSubtitle>
              <CardTitle>{item.type}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">
                {item.eligible ? "Generally eligible for e-filing." : "Confirm with the clerk before e-filing."}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
