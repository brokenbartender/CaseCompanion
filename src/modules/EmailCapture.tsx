import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Mail } from "lucide-react";
import { opsStore } from "../services/opsStore";
import { logForensicEvent } from "../services/forensicLogger";

export default function EmailCapture() {
  const [connected, setConnected] = useState(() => opsStore.getConnectors().email);

  return (
    <Page title="Email Capture" subtitle="Connect Outlook/Gmail and auto-file into matters">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail size={18}/> Mailbox Connector</CardTitle></CardHeader>
        <CardBody className="space-y-4 text-sm text-slate-300">
          <div>Provider: Microsoft 365 / Gmail</div>
          <Button
            onClick={() => {
              const next = !connected;
              setConnected(next);
              const connectors = opsStore.getConnectors();
              opsStore.saveConnectors({ ...connectors, email: next });
              logForensicEvent("email.connector", { enabled: next });
            }}
          >
            {connected ? "Disconnect" : "Connect Mailbox"}
          </Button>
          {connected ? (
            <div className="text-emerald-400">Mailbox connected. Auto-filing enabled.</div>
          ) : (
            <div className="text-slate-500">Not connected.</div>
          )}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Automation</div>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Auto-create time entry on send
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Smart suggest matter contacts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Convert email to task
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Save inbound emails to matter
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked /> Secure send (encryption + proof of delivery)
            </label>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
