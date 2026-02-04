import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function DocumentAutomation() {
  return (
    <Page title="Document Automation" subtitle="Templates, merge fields, and form logic">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Template Library</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Engagement Letter • Demand Letter • Motion Template</div>
            <Button variant="secondary">New Template</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Automation Rules</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Conditional clauses, jurisdictional variants</div>
            <Button variant="secondary">Edit Rules</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
