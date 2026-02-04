import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function SkillLauncher() {
  return (
    <Page title="AI Skills" subtitle="Launch skills with progress + streaming output">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <Button variant="secondary" className="w-full">Summarize</Button>
            <Button variant="secondary" className="w-full">Review Documents</Button>
            <Button variant="secondary" className="w-full">Legal Research Memo</Button>
            <Button variant="secondary" className="w-full">Extract Contract Data</Button>
            <Button variant="secondary" className="w-full">Contract Policy Compliance</Button>
            <Button variant="secondary" className="w-full">Search a Database</Button>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Run Status</CardTitle></CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Progress</div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: "65%" }} />
              </div>
              <div className="mt-2 text-xs text-slate-400">ETA 42s • Streaming results enabled</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Latest Output</div>
              <div className="mt-2">Answer draft with citations will appear here.</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
