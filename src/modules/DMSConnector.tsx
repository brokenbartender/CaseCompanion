import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Database } from "lucide-react";
import { opsStore } from "../services/opsStore";
import { logForensicEvent } from "../services/forensicLogger";

export default function DMSConnector() {
  const [connected, setConnected] = useState(() => opsStore.getConnectors().dms);

  return (
    <Page title="DMS Connector" subtitle="Sync iManage, NetDocuments, or SharePoint">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database size={18}/> Document Management</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          <div>Primary System: iManage</div>
          <Button
            onClick={() => {
              const next = !connected;
              setConnected(next);
              const connectors = opsStore.getConnectors();
              opsStore.saveConnectors({ ...connectors, dms: next });
              logForensicEvent("dms.connector", { enabled: next });
            }}
          >
            {connected ? "Disconnect" : "Connect DMS"}
          </Button>
          {connected ? (
            <div className="text-emerald-400">DMS connected. Sync active.</div>
          ) : (
            <div className="text-slate-500">No DMS connected.</div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
