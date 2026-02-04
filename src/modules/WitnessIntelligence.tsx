import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function WitnessIntelligence() {
  const [statement, setStatement] = useState("");
  const [videoNotes, setVideoNotes] = useState("");
  const [matrix, setMatrix] = useState<string[]>([]);

  function addRow() {
    if (!statement.trim() || !videoNotes.trim()) return;
    setMatrix((prev) => [...prev, `${statement} | ${videoNotes}`]);
    setStatement("");
    setVideoNotes("");
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
              <div className="space-y-2 text-sm text-slate-300">
                {matrix.map((row, idx) => (
                  <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                    {row}
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
