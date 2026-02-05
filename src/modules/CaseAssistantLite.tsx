import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function CaseAssistantLite() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  function handleAsk() {
    setResponse("This assistant is currently in grounded-only mode. Use Evidence Vault and citations for answers.");
  }

  return (
    <Page title="Case Assistant" subtitle="Grounded answers only (informational).">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Ask</CardSubtitle>
            <CardTitle>Question</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={6}
              placeholder="Ask a question about your evidence or timeline."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAsk}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Ask (Grounded)
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Response</CardSubtitle>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">{response || "No response yet."}</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
