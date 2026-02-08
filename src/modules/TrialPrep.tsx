import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { TRIAL_PREP, VOIR_DIRE, OBJECTION_CARDS } from "../data/trialPrep";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const TRIAL_PREP_KEY = "case_companion_trial_prep_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";

type TrialPrepState = {
  trialDate: string;
  notebookExported: boolean;
  witnessesReady: boolean;
  exhibitsReady: boolean;
  instructionsReady: boolean;
  motionsInLimineReady: boolean;
  trialBriefReady: boolean;
  notes: string;
};

export default function TrialPrep() {
  const [state, setState] = useState<TrialPrepState>(() =>
    readJson(TRIAL_PREP_KEY, {
      trialDate: "",
      notebookExported: false,
      witnessesReady: false,
      exhibitsReady: false,
      instructionsReady: false,
      motionsInLimineReady: false,
      trialBriefReady: false,
      notes: ""
    })
  );
  const timeline = readJson<any[]>(TIMELINE_KEY, []);
  const witnesses = useMemo(() => EVIDENCE_INDEX.filter((item) => item.category === "Witnesses"), []);
  const exhibits = useMemo(() => EVIDENCE_INDEX.filter((item) => item.category !== "Other"), []);

  function update<K extends keyof TrialPrepState>(key: K, value: TrialPrepState[K]) {
    const next = { ...state, [key]: value } as TrialPrepState;
    setState(next);
    writeJson(TRIAL_PREP_KEY, next);
  }

  function exportNotebook() {
    const lines = [
      "Trial Notebook Export",
      "",
      `Trial Date: ${state.trialDate || "TBD"}`,
      "",
      "Timeline",
      "",
      ...timeline.map((event) => `${event.date || "TBD"} - ${event.title} :: ${event.note || ""}`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trial_notebook.txt";
    a.click();
    URL.revokeObjectURL(url);
    update("notebookExported", true);
  }

  function exportTrialBinder() {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Trial Binder</title>
<style>
body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
h1, h2 { margin-bottom: 8px; }
section { margin-bottom: 24px; }
ul { padding-left: 18px; }
</style>
</head>
<body>
<h1>Trial Binder</h1>
<p><strong>Trial Date:</strong> ${state.trialDate || "TBD"}</p>
<section>
<h2>Witness List</h2>
<ul>
${witnesses.map((w) => `<li>${w.name}</li>`).join("")}
</ul>
</section>
<section>
<h2>Exhibit List</h2>
<ul>
${exhibits.map((e) => `<li>${e.name}</li>`).join("")}
</ul>
</section>
<section>
<h2>Timeline</h2>
<ul>
${timeline.map((event) => `<li>${event.date || "TBD"} - ${event.title}</li>`).join("")}
</ul>
</section>
<section>
<h2>Notes</h2>
<p>${state.notes || ""}</p>
</section>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trial_binder.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title="Trial Prep" subtitle="Trial notebook, witness prep, and objection quick cards.">
      <Card className="mb-6">
        <CardHeader>
          <CardSubtitle>Oakland County Guidance</CardSubtitle>
          <CardTitle>Case Evaluation + Trial Readiness</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 text-sm text-slate-300">
            <div>Michigan circuit court cases may be submitted to case evaluation under MCR 2.403.</div>
            <div>Watch the scheduling order for case evaluation briefs and hearing dates.</div>
            <div className="text-xs text-slate-400">
              Settlement conferences and pretrial statements are often required before trial.
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Binder Controls</CardSubtitle>
            <CardTitle>Trial Pack</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-200">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">Trial Date</span>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="YYYY-MM-DD"
                value={state.trialDate}
                onChange={(e) => update("trialDate", e.target.value)}
              />
            </label>
            <div className="grid gap-2">
              {[
                { key: "witnessesReady", label: "Witness list ready" },
                { key: "exhibitsReady", label: "Exhibits tabbed + indexed" },
                { key: "instructionsReady", label: "Jury instructions drafted" },
                { key: "motionsInLimineReady", label: "Motions in limine ready" },
                { key: "trialBriefReady", label: "Trial brief drafted" }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state[item.key as keyof TrialPrepState] as boolean}
                    onChange={(e) => update(item.key as keyof TrialPrepState, e.target.checked as any)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportNotebook}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Export Trial Notebook
              </button>
              <button
                type="button"
                onClick={exportTrialBinder}
                className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white"
              >
                Export Trial Binder
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Notes</CardSubtitle>
            <CardTitle>Prep Notes</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="min-h-[220px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Track witness prep, exhibit issues, and trial themes."
              value={state.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {TRIAL_PREP.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardSubtitle>Checklist</CardSubtitle>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm text-slate-300">
                {section.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Voir Dire</CardSubtitle>
            <CardTitle>Bias Screening Questions</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              {VOIR_DIRE.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Objections</CardSubtitle>
            <CardTitle>Quick Cards</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm text-slate-300">
              {OBJECTION_CARDS.map((card) => (
                <div key={card.title} className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-white">{card.title}</div>
                  <div className="text-xs text-slate-400">{card.use}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
