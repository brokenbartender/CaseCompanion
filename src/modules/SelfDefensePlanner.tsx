import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_self_defense_v1";

type Row = { id: string; claim: string; rebuttal: string; evidence: string };

export default function SelfDefensePlanner() {
  const [rows, setRows] = useState<Row[]>(() => readJson(STORAGE_KEY, []));
  const [claim, setClaim] = useState("");
  const [rebuttal, setRebuttal] = useState("");
  const [evidence, setEvidence] = useState("");

  function addRow() {
    if (!claim.trim()) return;
    const next = [...rows, { id: `${Date.now()}`, claim, rebuttal, evidence }];
    setRows(next);
    writeJson(STORAGE_KEY, next);
    setClaim("");
    setRebuttal("");
    setEvidence("");
  }

  return (
    <Page title="Self-Defense Counter Planner" subtitle="List defense claims and rebuttals.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Plan</CardSubtitle>
            <CardTitle>Add Counter</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Defense claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
            />
            <textarea
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={3}
              placeholder="Rebuttal"
              value={rebuttal}
              onChange={(e) => setRebuttal(e.target.value)}
            />
            <input
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
            <button
              type="button"
              onClick={addRow}
              className="mt-3 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Save Counter
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>List</CardSubtitle>
            <CardTitle>Saved Counters</CardTitle>
          </CardHeader>
          <CardBody>
            {rows.length === 0 ? (
              <div className="text-sm text-slate-400">No counters yet.</div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-white">{row.claim}</div>
                    <div className="text-xs text-slate-400">{row.rebuttal}</div>
                    {row.evidence ? <div className="text-xs text-amber-200">Evidence: {row.evidence}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
