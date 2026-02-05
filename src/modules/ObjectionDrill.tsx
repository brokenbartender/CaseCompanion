import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { MICHIGAN_OBJECTION_CARDS } from "../data/michiganEvidenceObjections";

export default function ObjectionDrill() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const current = MICHIGAN_OBJECTION_CARDS[index % MICHIGAN_OBJECTION_CARDS.length];

  return (
    <Page title="Objection Drill" subtitle="Quick practice on objection timing.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Prompt</CardSubtitle>
            <CardTitle>{current.title}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">When should you use this?</div>
            {show ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {current.whenToUse.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 text-xs text-slate-400">Tap "Show Answer" to reveal.</div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShow((prev) => !prev)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"
              >
                {show ? "Hide Answer" : "Show Answer"}
              </button>
              <button
                type="button"
                onClick={() => { setShow(false); setIndex((prev) => prev + 1); }}
                className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                Next
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
