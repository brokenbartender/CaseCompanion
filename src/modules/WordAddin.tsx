import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function WordAddin() {
  return (
    <Page title="Word/Outlook Add-ins" subtitle="Install and manage office integrations">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Word Add-in</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Open/save matter documents directly in Word.</div>
            <Button variant="secondary">Download Word Add-in</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Outlook Add-in</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Auto-file emails to matter, capture time entries.</div>
            <Button variant="secondary">Download Outlook Add-in</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
