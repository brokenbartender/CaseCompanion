import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_witness_matrix_v1";

type MatrixRow = { statement: string; videoNotes: string; prepNotes: string };

export default function WitnessIntelligence() {
  const [statement, setStatement] = useState("");
  const [videoNotes, setVideoNotes] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [matrix, setMatrix] = useState<MatrixRow[]>(() => readJson(STORAGE_KEY, []));

  function addRow() {
    if (!statement.trim() || !videoNotes.trim()) return;
    const next = [...matrix, { statement, videoNotes, prepNotes }];
    setMatrix(next);
    writeJson(STORAGE_KEY, next);
    setStatement("");
    setVideoNotes("");
    setPrepNotes("");
  }

  return (
    <Page title="Witness Intelligence" subtitle="Contradiction matrix (informational only).">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Matrix</CardSubtitle>
            <CardTitle>Add Entry</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Statement line"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
            <textarea
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={4}
              placeholder="Video timestamp or observation"
              value={videoNotes}
              onChange={(e) => setVideoNotes(e.target.value)}
            />
            <textarea
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={3}
              placeholder="Prep notes (how to refresh recollection, gentle correction phrasing)"
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
            />
            <button
              type="button"
              onClick={addRow}
              className="mt-3 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Add Matrix Row
            </button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Comparison</CardSubtitle>
            <CardTitle>Statement vs Video</CardTitle>
          </CardHeader>
          <CardBody>
            {matrix.length === 0 ? (
              <div className="text-sm text-slate-400">No entries yet.</div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                {matrix.map((row, idx) => (
                  <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">Statement</div>
                    <div className="text-sm text-slate-100">{row.statement}</div>
                    <div className="mt-2 text-xs text-slate-400">Video / Observation</div>
                    <div className="text-sm text-slate-100">{row.videoNotes}</div>
                    {row.prepNotes ? (
                      <>
                        <div className="mt-2 text-xs text-slate-400">Prep Notes</div>
                        <div className="text-xs text-amber-200">{row.prepNotes}</div>
                      </>
                    ) : null}
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
