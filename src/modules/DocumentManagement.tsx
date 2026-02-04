import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const docsSeed = [
  { id: "DOC-01", name: "Engagement_Letter.docx", version: "v3", locked: false },
  { id: "DOC-02", name: "Medical_Records.pdf", version: "v1", locked: true }
];

export default function DocumentManagement() {
  const [docs] = useState(docsSeed);

  return (
    <Page title="Document Management" subtitle="Versions, tags, and secure sharing">
      <Card>
        <CardHeader><CardTitle>Library</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="text-slate-100 font-semibold">{doc.name}</div>
                <div className="text-xs text-slate-500">Version {doc.version} • {doc.locked ? "Locked" : "Editable"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary">Preview</Button>
                <Button variant="secondary">New Version</Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary">Merge to PDF</Button>
            <Button variant="secondary">Send for e-sign</Button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Versioning & Locking</div>
            <div className="mt-2">Checkout files for edit; auto-create new version on save.</div>
          </div>
        </CardBody>
      </Card>
      <div className="mt-6">
        <Card>
          <CardHeader><CardTitle>Smart Import</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>Batch size: up to 2,000 docs (Dropbox) / 999 (OneDrive).</div>
            <div>AI metadata suggestions with verification queue.</div>
            <div>OCR + full-text indexing for legacy documents.</div>
            <Button variant="secondary">Start Smart Import</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
