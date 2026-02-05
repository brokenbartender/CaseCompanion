import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const STEPS = [
  {
    title: "1) Case Setup",
    description: "Add court, case name, and basic details to personalize the app.",
    action: { label: "Go to Case Settings", href: "/settings" }
  },
  {
    title: "2) Build Your Filing Pack",
    description: "Prepare summons, complaint, and fee waiver/PII forms as separate PDFs.",
    action: { label: "Open Document Pack", href: "/doc-pack" }
  },
  {
    title: "3) File in MiFILE",
    description: "Initiate a new case and upload each document with correct labels.",
    action: { label: "Open Filing Flow", href: "/filing-flow" }
  },
  {
    title: "4) If you stop getting notices",
    description: "Reconnect your case to MiFILE to restore e‑service.",
    action: { label: "Open MiFILE Reconnect", href: "/mifile-reconnect" }
  },
  {
    title: "5) Serve the Defendant",
    description: "Use a qualified server and track the 90-day service window.",
    action: { label: "Open Service Guide", href: "/service" }
  },
  {
    title: "6) Ingest Evidence",
    description: "Upload PDFs or media for hashing, OCR, and indexing.",
    action: { label: "Open Ingest Center", href: "/ingest" }
  }
];

export default function GuidedStartWizard() {
  return (
    <Page title="Guided Start" subtitle="Follow these steps in order for a clean pro se workflow.">
      <div className="grid gap-6">
        {STEPS.map((step) => (
          <Card key={step.title} className="border border-amber-400/20 bg-amber-500/5">
            <CardHeader>
              <CardSubtitle>Step</CardSubtitle>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-200">{step.description}</div>
              <a
                href={step.action.href}
                className="mt-4 inline-flex rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {step.action.label}
              </a>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
