import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function BusinessLossWorksheet() {
  const [revenue, setRevenue] = useState("0");
  const [expenses, setExpenses] = useState("0");

  const loss = (Number(expenses) || 0) - (Number(revenue) || 0);

  return (
    <Page title="Business Loss Worksheet" subtitle="Simple P&L to estimate business loss.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Inputs</CardSubtitle>
            <CardTitle>Business Loss</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Revenue"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Expenses"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
              />
            </div>
            <div className="mt-3 text-sm text-slate-300">Estimated business loss: ${loss.toFixed(2)}</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
