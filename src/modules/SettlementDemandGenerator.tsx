import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";
import { DamagesEntry, SETTLEMENT_SECTIONS } from "../data/damagesTemplates";

export default function SettlementDemandGenerator() {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [exhibits, setExhibits] = useState("");
  const [extraDamages, setExtraDamages] = useState("");

  const damages = readJson<DamagesEntry[]>("case_companion_damages_v1", []);
  const damagesTotal = useMemo(
    () => damages.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [damages]
  );

  const body = `Settlement Demand\n\nTo: ${to}\nFrom: ${from}\nDate: ${date}\n\nSummary:\n${summary}\n\nKey exhibits:\n${exhibits}\n\nDamages total (from app): $${damagesTotal.toFixed(2)}\nAdditional damages notes:\n${extraDamages}\n\nThis draft is for informational purposes only and is not legal advice.`;

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
      <div className="grid gap-6 lg:grid-cols-2">
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
            <textarea className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" rows={5} placeholder="Liability summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <textarea className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" rows={4} placeholder="Key exhibits" value={exhibits} onChange={(e) => setExhibits(e.target.value)} />
            <textarea className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100" rows={3} placeholder="Additional damages notes" value={extraDamages} onChange={(e) => setExtraDamages(e.target.value)} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={download} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900">Download Draft</button>
              <button type="button" onClick={printPdf} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">Print to PDF</button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Preview</CardSubtitle>
            <CardTitle>Outline</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="text-xs text-slate-400">Outline</div>
              <ul className="space-y-2">
                {SETTLEMENT_SECTIONS.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
              <div className="text-xs text-slate-400">Damages total</div>
              <div>${damagesTotal.toFixed(2)}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
