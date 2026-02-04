import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function MatterCustomFields() {
  return (
    <Page title="Matter Custom Fields" subtitle="Practice-area templates and default folders">
      <Card>
        <CardHeader><CardTitle>Practice Area Templates</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Personal Injury • Default folders: Intake, Med Records, Demand, Settlement</div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">Employment • Default folders: HR, Witness, Policies</div>
          <Button variant="secondary">Add Template</Button>
        </CardBody>
      </Card>
    </Page>
  );
}
