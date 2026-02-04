import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function TimeExpenseAdvanced() {
  const [timerRunning, setTimerRunning] = useState(false);

  return (
    <Page title="Advanced Time & Expense" subtitle="Multi-timers, rate cards, and LEDES settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Multi-Timers</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Running timers: {timerRunning ? "1" : "0"}</div>
            <Button onClick={() => setTimerRunning(!timerRunning)} className="w-full">
              {timerRunning ? "Stop Timer" : "Start Timer"}
            </Button>
            <div className="text-xs text-slate-500">Auto-capture from email/phone enabled.</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rate Cards</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Default: Partner $450 • Associate $280</div>
            <Button variant="secondary" className="w-full">Edit Rate Cards</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>LEDES</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-300">
            <div>Timekeeper IDs configured</div>
            <div>Format: 1998B • UTBMS enabled</div>
            <Button variant="secondary" className="w-full">Export LEDES</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
