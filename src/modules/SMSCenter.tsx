import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function SMSCenter() {
  return (
    <Page title="SMS & Messaging" subtitle="Two-way client communications with logging">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Active Threads</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Jordan Miles • Intake follow-up</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Rina Patel • Missing W-2</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Send Message</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <textarea className="h-32 w-full rounded-md border border-slate-700 bg-slate-950 p-3" placeholder="Message..." />
            <Button className="w-full">Send SMS</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
