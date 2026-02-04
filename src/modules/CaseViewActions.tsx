import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function CaseViewActions() {
  const [status, setStatus] = useState("Active");

  return (
    <Page title="Case View" subtitle="Status, permissions, export, and history">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Case Actions</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                <option>Active</option>
                <option>Archived</option>
                <option>Decided</option>
              </select>
              <Button variant="secondary">Assign Team</Button>
              <Button variant="secondary">Privacy / Permissions</Button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Export</div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary">PDF Summary</Button>
                <Button variant="secondary">Full Case Export</Button>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Case History</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>Upload exhibit • 2/3</div>
            <div>Export packet • 2/4</div>
            <Button variant="secondary">Download History</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
