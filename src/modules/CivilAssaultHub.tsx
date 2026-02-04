import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { MCI_115 } from "../data/michiganAssaultCivil";

const STORAGE_KEY = "case_companion_assault_hub_v1";
const JI_KEY = "case_companion_ji_checklist_v1";

type HubState = {
  incidentDate: string;
  limitationYears: number;
  incidentSummary: string;
};

type ChecklistState = Record<string, boolean>;

const SOL_OPTIONS = [
  { years: 2, label: "Assault/Battery (2 years)", cite: "MCL 600.5805(3)" },
  { years: 3, label: "Injury to person (3 years)", cite: "MCL 600.5805(2)" },
  { years: 5, label: "Assault/Battery - spouse/household (5 years)", cite: "MCL 600.5805(4)" },
  { years: 5, label: "Assault/Battery - dating relationship (5 years)", cite: "MCL 600.5805(5)" },
  { years: 10, label: "Criminal sexual conduct (10 years)", cite: "MCL 600.5805(6)" }
];

function addYears(dateStr: string, years: number) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export default function CivilAssaultHub() {
  const [state, setState] = useState<HubState>(() =>
    readJson(STORAGE_KEY, { incidentDate: "", limitationYears: 2, incidentSummary: "" })
  );
  const [checklist, setChecklist] = useState<ChecklistState>(() => readJson(JI_KEY, {}));

  function update(next: Partial<HubState>) {
    const updated = { ...state, ...next };
    setState(updated);
    writeJson(STORAGE_KEY, updated);
  }

  function toggle(id: string) {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeJson(JI_KEY, next);
      return next;
    });
  }

  const deadline = useMemo(() => addYears(state.incidentDate, state.limitationYears), [state.incidentDate, state.limitationYears]);

  return (
    <Page title="Civil Assault & Battery Hub" subtitle="Michigan-focused civil case organization (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Case Summary</CardSubtitle>
            <CardTitle>Incident Overview</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={5}
              placeholder="Describe the incident in your own words (for your records)."
              value={state.incidentSummary}
              onChange={(e) => update({ incidentSummary: e.target.value })}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Statute of Limitations</CardSubtitle>
            <CardTitle>Deadline Tracker</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Incident date (YYYY-MM-DD)"
                value={state.incidentDate}
                onChange={(e) => update({ incidentDate: e.target.value })}
              />
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={state.limitationYears}
                onChange={(e) => update({ limitationYears: Number(e.target.value) })}
              >
                {SOL_OPTIONS.map((opt) => (
                  <option key={`${opt.years}-${opt.label}`} value={opt.years}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Estimated deadline: {deadline || "Enter an incident date."}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Verify with current law (MCL 600.5805). These options are a guide only and may not apply to every case.
              <div className="mt-1 space-y-1">
                {SOL_OPTIONS.map((opt) => (
                  <div key={`${opt.cite}-${opt.label}`}>
                    {opt.label} — {opt.cite}
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Jury Instructions</CardSubtitle>
            <CardTitle>Assault & Battery Elements (Checklist)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300 mb-4">
              Use this checklist to link evidence to each element. This is informational, not legal advice.
            </div>
            <div className="space-y-3">
              {MCI_115.map((item) => (
                <div key={item.id} className="rounded-md border border-white/5 bg-white/5 p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-amber-400"
                      checked={Boolean(checklist[item.id])}
                      onChange={() => toggle(item.id)}
                    />
                    <div>
                      <div className="text-sm text-slate-100 font-semibold">{item.title}</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {item.text.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-slate-500">Source: {item.sourcePath}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
