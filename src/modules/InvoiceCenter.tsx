import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function InvoiceCenter() {
  return (
    <Page title="Invoice Center" subtitle="Create, status, and record payments">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Invoice Status</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              Amount Due: $4,200 • Due in 5 days
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              Line Items: 6 • Discounts: 1 • Interest: enabled
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              Export: PDF invoice • Bulk billing statements • LEDES export
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <input className="w-full rounded-md border border-slate-700 bg-slate-950 p-2" placeholder="Payment method" />
            <input className="w-full rounded-md border border-slate-700 bg-slate-950 p-2" placeholder="Reference" />
            <Button className="w-full">Record Payment</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
