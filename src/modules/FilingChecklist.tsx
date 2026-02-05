import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { FILING_CHECKLIST } from "../data/filingChecklist";

export default function FilingChecklist() {
  function printPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `
      <html>
        <head><title>Filing Checklist</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Filing Checklist</h2>
          ${FILING_CHECKLIST.map((section) => `
            <h3>${section.title}</h3>
            <ul>
              ${section.tasks.map((task) => `<li>${task}</li>`).join("")}
            </ul>
          `).join("")}
        </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <Page title="Filing Checklist" subtitle="Pleadings, summons, and service workflow.">
      <div className="grid gap-6">
        <button
          type="button"
          onClick={printPdf}
          className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          Print Checklist to PDF
        </button>
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
