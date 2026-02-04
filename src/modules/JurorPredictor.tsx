import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function JurorPredictor() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [input, setInput] = useState("");

  function add() {
    if (!input.trim()) return;
    setQuestions((prev) => [...prev, input]);
    setInput("");
  }

  return (
    <Page title="Voir Dire Designer" subtitle="Generate and collect juror questions (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Question Bank</CardSubtitle>
            <CardTitle>Bias Screening</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Add a voir dire question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="button"
              onClick={add}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Add Question
            </button>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                  {q}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
