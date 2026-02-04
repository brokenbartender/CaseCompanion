import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function BillingAccounting() {
  return (
    <Page title="Billing & Accounting" subtitle="Invoices, trust ledgers, and financial reports">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>Pre-bill review enabled</div>
            <div>Status banner: Current / Due Soon / Overdue</div>
            <div>Discounts, interest, consolidated invoices supported</div>
            <div>LEDES formats: 1998B, LITADV, Tymetrix</div>
            <Button variant="secondary" className="w-full">Open Billing Center</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trust / Retainers</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>Ledger balance alerts enabled</div>
            <div>Three-way reconciliation reports</div>
            <Button variant="secondary" className="w-full">View Trust Ledger</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Reporting</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div>AR aging, WIP, productivity, P&L</div>
            <Button variant="secondary" className="w-full">Run Reports</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
