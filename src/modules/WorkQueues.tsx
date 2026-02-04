import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

export default function WorkQueues() {
  return (
    <Page title="Work Queues" subtitle="Triage, review, QC, and policy violations">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: "Triage", count: 6, desc: "New intake and imports" },
          { title: "Review", count: 14, desc: "Privilege + relevance review" },
          { title: "QC", count: 3, desc: "Escalations and spot checks" },
          { title: "Policy Violations", count: 2, desc: "Release gate blocks" }
        ].map((queue) => (
          <Card key={queue.title}>
            <CardHeader><CardTitle>{queue.title} Queue</CardTitle></CardHeader>
            <CardBody className="text-sm text-slate-300">
              <div>{queue.count} items pending</div>
              <div className="mt-2 text-xs text-slate-500">{queue.desc}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
