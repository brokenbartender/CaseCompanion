import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function PolicyEditor() {
  const [policy, setPolicy] = useState("WITHHOLD_IF_NO_ANCHOR=true\nREDACT_SSN=true\nRETENTION_DAYS=90");
  const [saved, setSaved] = useState(false);

  return (
    <Page title="Policy Editor" subtitle="Policy-as-code enforcement rules">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Active Policy</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <textarea
              value={policy}
              onChange={(e) => { setPolicy(e.target.value); setSaved(false); }}
              className="h-56 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-slate-100"
            />
            <Button onClick={() => setSaved(true)}>Save Policy</Button>
            {saved ? <div className="text-xs text-emerald-400">Policy saved and enforced.</div> : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rule Pack</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-xs text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Rule ID</div>
              <div className="mt-1 text-slate-100">RULE-RETENTION-90</div>
              <div className="mt-2 text-slate-400">Predicate: retain(days=90)</div>
              <div className="mt-1 text-slate-400">Source: Policy §3.2 (2024-01-01)</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Defeasible</div>
              <div className="mt-1 text-slate-100">Override: LEGAL_HOLD=true</div>
              <div className="mt-2 text-slate-400">Priority: Legal Hold &gt; Retention</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Temporal Obligation</div>
              <div className="mt-1 text-slate-100">Must occur within 30 days</div>
              <div className="mt-2 text-slate-400">Failure: mark violation + audit event</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
