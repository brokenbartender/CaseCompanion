import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function TrustLedger() {
  return (
    <Page title="Trust Ledger" subtitle="Retainers, three-way reconciliation, and alerts">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Balances</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Operating: $32,450</div>
            <div>Trust: $18,200</div>
            <div className="text-xs text-amber-300">Low balance alert: Matter M-2024-002</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Reconciliation</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Three-way reconciliation ready</div>
            <Button variant="secondary" className="w-full">Run Reconciliation</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ledger Export</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <Button variant="secondary" className="w-full">Download Ledger</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
