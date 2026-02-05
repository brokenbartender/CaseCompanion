import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { MOTION_BUILDER } from "../data/motionsChecklist";

export default function MotionBuilder() {
  return (
    <Page title="Motion Builder" subtitle="Structure motions and summary disposition packets.">
      <div className="grid gap-6 lg:grid-cols-2">
        {MOTION_BUILDER.map((section) => (
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
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Praecipe</CardSubtitle>
            <CardTitle>ePraecipe Quick Start</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Confirm whether your motion requires a praecipe.</li>
              <li>Use the county ePraecipe system if required.</li>
              <li>Attach the praecipe confirmation to your filing notes.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
