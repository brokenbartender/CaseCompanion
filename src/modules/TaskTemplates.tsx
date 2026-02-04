import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

type Template = {
  id: string;
  name: string;
  category: string;
  recurring: boolean;
  subtasks: string[];
};

const seedTemplates: Template[] = [
  {
    id: "TMP-01",
    name: "Discovery Review Checklist",
    category: "Litigation",
    recurring: true,
    subtasks: ["Assign reviewers", "Tag privilege", "QC pass"]
  },
  {
    id: "TMP-02",
    name: "Motion Filing Workflow",
    category: "Litigation",
    recurring: false,
    subtasks: ["Draft motion", "Partner review", "File with court"]
  }
];

export default function TaskTemplates() {
  const [templates, setTemplates] = useState(seedTemplates);

  return (
    <Page title="Task Templates" subtitle="Procedures, subtasks, and reusable workflows">
      <Card>
        <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {templates.map((template) => (
            <div key={template.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-100 font-semibold">{template.name}</div>
                  <div className="text-xs text-slate-500">{template.category}</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">
                  {template.recurring ? "Recurring" : "One-time"}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                {template.subtasks.map((task) => (
                  <span key={task} className="rounded-full border border-slate-700 px-2 py-1">{task}</span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary">Assign Template</Button>
                <Button variant="secondary">Edit</Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setTemplates((prev) => [...prev, { id: `TMP-${prev.length + 3}`, name: "Client Intake Checklist", category: "Operations", recurring: true, subtasks: ["Send intake", "Collect IDs", "Confirm conflicts"] }])}>
            Create Template
          </Button>
        </CardBody>
      </Card>
    </Page>
  );
}
