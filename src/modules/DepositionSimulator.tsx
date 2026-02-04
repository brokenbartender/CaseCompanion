import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function DepositionSimulator() {
  const [question, setQuestion] = useState("");
  const [log, setLog] = useState<Array<{ q: string; a: string }>>([]);

  function add() {
    if (!question.trim()) return;
    setLog((prev) => [...prev, { q: question, a: "(Response placeholder for practice)" }]);
    setQuestion("");
  }

  return (
    <Page title="Deposition Simulator" subtitle="Practice questions (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Practice</CardSubtitle>
            <CardTitle>Question Log</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={3}
              placeholder="Enter a leading question to practice."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="button"
              onClick={add}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Add Question
            </button>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {log.map((row, idx) => (
                <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                  <div className="text-xs text-slate-500">Q:</div>
                  <div>{row.q}</div>
                  <div className="mt-2 text-xs text-slate-500">A:</div>
                  <div>{row.a}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
