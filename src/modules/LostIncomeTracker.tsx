import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function LostIncomeTracker() {
  const [days, setDays] = useState("0");
  const [dailyRate, setDailyRate] = useState("0");

  const total = (Number(days) || 0) * (Number(dailyRate) || 0);

  return (
    <Page title="Lost Income Tracker" subtitle="Estimate lost income based on days missed.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Inputs</CardSubtitle>
            <CardTitle>Lost Income</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Days missed"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Daily wage"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
            <div className="mt-3 text-sm text-slate-300">Estimated lost income: ${total.toFixed(2)}</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
