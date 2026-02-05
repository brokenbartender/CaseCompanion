import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { PROCEDURE_STEPS } from "../data/procedureSteps";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_checklist_v1";

type ChecklistState = Record<string, Record<string, boolean>>;

export default function ProceduralChecklist() {
  const [state, setState] = useState<ChecklistState>(() => readJson(STORAGE_KEY, {}));

  const totals = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const step of PROCEDURE_STEPS) {
      for (const task of step.checklist) {
        total += 1;
        if (state?.[step.id]?.[task]) done += 1;
      }
    }
    return { done, total };
  }, [state]);

  function exportChecklist() {
    const lines = [
      "CaseCompanion Procedural Checklist",
      "",
      ...PROCEDURE_STEPS.flatMap((block) => [
        `## ${block.title}`,
        ...block.checklist.map((task) => `- [${state?.[block.id]?.[task] ? "x" : " "}] ${task}`),
        ""
      ])
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "procedural_checklist.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggle(stepId: string, task: string) {
    setState((prev) => {
      const next: ChecklistState = { ...prev };
      next[stepId] = { ...(next[stepId] || {}), [task]: !next[stepId]?.[task] };
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <Page
      title="Checklist"
      subtitle={`Rule-aligned tasks and deadlines. Completed ${totals.done}/${totals.total}.`}
    >
      <div className="mb-4">
        <button
          type="button"
          onClick={exportChecklist}
          className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
        >
          Export Checklist
        </button>
      </div>
      <div className="grid gap-6">
        {PROCEDURE_STEPS.map((block) => (
          <Card key={block.id}>
            <CardHeader>
              <CardSubtitle>Section</CardSubtitle>
              <CardTitle>{block.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-400 mb-3">{block.summary}</div>
              <ul className="space-y-2 text-sm text-slate-300">
                {block.checklist.map((task) => (
                  <li key={task} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-amber-400"
                      checked={Boolean(state?.[block.id]?.[task])}
                      onChange={() => toggle(block.id, task)}
                    />
                    <span className={state?.[block.id]?.[task] ? "text-slate-400 line-through" : ""}>{task}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
