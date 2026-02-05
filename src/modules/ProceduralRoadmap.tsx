import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { PROCEDURE_STEPS } from "../data/procedureSteps";

export default function ProceduralRoadmap() {
  return (
    <Page
      title="Procedural Roadmap"
      subtitle="A rule-aligned sequence of civil procedure stages."
    >
      <div className="grid gap-6">
        {PROCEDURE_STEPS.map((stage, index) => (
          <Card key={stage.id}>
            <CardHeader>
              <CardSubtitle>Stage {index + 1}</CardSubtitle>
              <CardTitle>{stage.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {stage.sources.map((source) => (
                  <Badge key={source} tone="slate">{source}</Badge>
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-300">{stage.summary}</div>
              <div className="mt-4 text-sm text-slate-400">Key tasks:</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {stage.checklist.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
              {stage.benchbookSections && stage.benchbookSections.length ? (
                <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 mb-2">Benchbook sections</div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {stage.benchbookSections.map((section) => (
                      <li key={section}>{section}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
