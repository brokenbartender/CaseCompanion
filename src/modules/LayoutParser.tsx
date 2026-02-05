import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function LayoutParser() {
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Page title="Layout Parser" subtitle="Prepare PDFs for layout-aware extraction.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Input</CardSubtitle>
            <CardTitle>Document Selection</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Document filename (from Evidence Vault)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                rows={4}
                placeholder="Notes or extraction goals"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Queue Layout Extraction
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              This is a placeholder for DeepDoc layout extraction integration.
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Output</CardSubtitle>
            <CardTitle>Expected Artifacts</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Table extraction (CSV)</li>
              <li>Structured fields (JSON)</li>
              <li>Page layout map (JSON)</li>
              <li>OCR text with coordinates</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
