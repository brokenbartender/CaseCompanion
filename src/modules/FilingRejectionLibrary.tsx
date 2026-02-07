import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const REJECTIONS = [
  {
    id: "bundled",
    title: "Bundled PDFs",
    fix: "Upload each document as its own PDF. Do not combine forms."
  },
  {
    id: "wrong-code",
    title: "Wrong filing code",
    fix: "Select the correct filing type in MiFILE before submitting."
  },
  {
    id: "missing-proof",
    title: "Missing proof of service",
    fix: "Attach Proof of Service or use e‑service if applicable."
  },
  {
    id: "wrong-court",
    title: "Wrong court selected",
    fix: "Confirm the correct county court selection before filing."
  }
];

export default function FilingRejectionLibrary() {
  const [active, setActive] = useState<string>("");

  return (
    <Page title="Filing Rejection Library" subtitle="Common rejection reasons and fixes.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Choose Reason</CardSubtitle>
            <CardTitle>Rejection Type</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm text-slate-300">
              {REJECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Fix</CardSubtitle>
            <CardTitle>How to Resolve</CardTitle>
          </CardHeader>
          <CardBody>
            {active ? (
              <div className="text-sm text-slate-300">
                {REJECTIONS.find((item) => item.id === active)?.fix}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Select a rejection reason.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
