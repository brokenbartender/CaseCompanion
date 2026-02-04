import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const leadsSeed = [
  { id: "L-01", name: "Pat Quinn", source: "Web Form", status: "New" },
  { id: "L-02", name: "Ivy Chen", source: "Referral", status: "Qualified" }
];

export default function CRMIntake() {
  const [leads] = useState(leadsSeed);

  return (
    <Page title="CRM & Intake" subtitle="Leads, intake forms, and conversion to matter">
      <Card>
        <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {leads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="text-slate-100 font-semibold">{lead.name}</div>
                <div className="text-xs text-slate-500">Source: {lead.source} • Status: {lead.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary">Assign Task</Button>
                <Button variant="secondary">Convert to Matter</Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary">Create Intake Form</Button>
            <Button variant="secondary">Web Form Builder</Button>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
