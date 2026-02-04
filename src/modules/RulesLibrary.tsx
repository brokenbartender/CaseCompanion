import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

const sources = [
  {
    title: "Michigan Court Rules Chapter 2",
    desc: "Civil procedure rules updated through October 1, 2025.",
    path: "references/mcr_ch2.txt"
  },
  {
    title: "Civil Proceedings Benchbook",
    desc: "Judge-focused procedure guide updated through November 19, 2025.",
    path: "references/michigan_civil_benchbook.txt"
  },
  {
    title: "Civil Process Handbook",
    desc: "Service of process mechanics and summons details.",
    path: "references/civil_process_overview_2014.txt"
  },
  {
    title: "Service of Process Table",
    desc: "Quick reference for MCR 2.105 service methods.",
    path: "references/service_of_process_table.txt"
  },
  {
    title: "Summary Disposition Table",
    desc: "Quick reference for MCR 2.116 motions.",
    path: "references/summary_disposition_table.txt"
  },
  {
    title: "MCL 750.81",
    desc: "Assault and assault and battery statute reference.",
    path: "references/mcl_750_81.txt"
  },
  {
    title: "Michigan Law Review (1939)",
    desc: "Historical analysis of intent vs negligence in assault/battery (non-binding).",
    path: "references/assault_battery_intent_to_harm_negligence_liability_for.txt"
  }
];

export default function RulesLibrary() {
  return (
    <Page
      title="Rules Library"
      subtitle="Primary procedural sources used in this app."
    >
      <div className="grid gap-6">
        {sources.map((source) => (
          <Card key={source.title}>
            <CardHeader>
              <CardSubtitle>Source</CardSubtitle>
              <CardTitle>{source.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{source.desc}</div>
              <div className="mt-2 text-xs text-slate-500">{source.path}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
