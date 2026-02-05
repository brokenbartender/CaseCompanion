import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { TRIAL_PREP, VOIR_DIRE, OBJECTION_CARDS } from "../data/trialPrep";

export default function TrialPrep() {
  return (
    <Page title="Trial Prep" subtitle="Trial notebook, witness prep, and objection quick cards.">
      <div className="grid gap-6 lg:grid-cols-2">
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
