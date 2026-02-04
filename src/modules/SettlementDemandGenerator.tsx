import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function SettlementDemandGenerator() {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [damages, setDamages] = useState("");

  const body = `Settlement Demand\n\nTo: ${to}\nFrom: ${from}\nDate: ${date}\n\nSummary:\n${summary}\n\nDamages (summary):\n${damages}\n\nThis draft is for informational purposes only and is not legal advice.`;

  function download() {
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settlement_demand_draft.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style='font-family: Arial; white-space: pre-wrap;'>${body}</pre>`);
    w.document.close();
    w.print();
  }

  return (
    <Page title="Settlement Demand Generator" subtitle="Draft a demand letter (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Draft</CardSubtitle>
            <CardTitle>Letter Builder</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
              <input className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)} />
              <input className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" placeholder="Date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <textarea className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" rows={5} placeholder="Incident summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <textarea className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" rows={4} placeholder="Damages summary" value={damages} onChange={(e) => setDamages(e.target.value)} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={download} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900">Download Draft</button>
              <button type="button" onClick={printPdf} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">Print to PDF</button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
