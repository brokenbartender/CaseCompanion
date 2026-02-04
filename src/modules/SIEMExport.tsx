import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { ShieldCheck } from "lucide-react";

export default function SIEMExport() {
  const [streaming, setStreaming] = useState(false);

  return (
    <Page title="SIEM Export" subtitle="Stream audit events to security tooling">
      <Card>
        <CardHeader><CardTitle>Audit Stream</CardTitle></CardHeader>
        <CardBody className="space-y-4 text-sm text-slate-300">
          <div>Destination: Splunk / Sentinel (mock)</div>
          <Button onClick={() => setStreaming((s) => !s)}>
            {streaming ? "Stop Stream" : "Start Stream"}
          </Button>
          {streaming ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs"><ShieldCheck size={14}/> Streaming active</div>
          ) : (
            <div className="text-slate-500 text-xs">Stream offline</div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
