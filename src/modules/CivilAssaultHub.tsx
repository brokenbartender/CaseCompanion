import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { LIMITATIONS } from "../data/michiganAssaultCivil";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_assault_hub_v1";

type HubState = {
  incidentDate: string;
  limitationKey: string;
  incidentSummary: string;
};

function addYears(dateStr: string, years: number) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export default function CivilAssaultHub() {
  const [state, setState] = useState<HubState>(() =>
    readJson(STORAGE_KEY, { incidentDate: "", limitationKey: "assault_battery", incidentSummary: "" })
  );

  function update(next: Partial<HubState>) {
    const updated = { ...state, ...next };
    setState(updated);
    writeJson(STORAGE_KEY, updated);
  }

  const limitation = LIMITATIONS.find((l) => l.key === state.limitationKey) || LIMITATIONS[0];
  const deadline = useMemo(() => addYears(state.incidentDate, limitation.years), [state.incidentDate, limitation.years]);

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
                value={state.limitationKey}
                onChange={(e) => update({ limitationKey: e.target.value })}
              >
                {LIMITATIONS.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Estimated deadline: {deadline || "Enter an incident date."}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Sources: {limitation.source} (verify with the official statute).
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Claim Elements</CardSubtitle>
            <CardTitle>Worksheet</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Use the Michigan Model Civil Jury Instructions (Chapter 115) and Michigan case law to enter precise elements
              for assault/battery. This app does not provide legal advice.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
