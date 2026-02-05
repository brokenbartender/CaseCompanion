import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_mifile_reconnect_v1";
const SETTINGS_KEY = "case_companion_settings_v1";

type ReconnectState = Record<string, boolean>;

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
};

const STEPS = [
  "Log into MiFILE and open the case search.",
  "Search by case number and open the case.",
  "Click “I am this Person” (or similar) to link yourself.",
  "Confirm e‑service is enabled for your email.",
  "Save confirmation and verify you receive future notices."
];

const RESOURCES = [
  {
    label: "Oakland County Circuit Court eFiling page",
    href: "https://www.oakgov.com/government/courts/circuit-court/programs/efiling"
  },
  {
    label: "Oakland County Clerk eFiling page",
    href: "https://www.oakgov.com/government/clerk-register-of-deeds/court-records/efiling"
  }
];

export default function MiFileReconnect() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Oakland County, MI"
  });
  const [state, setState] = useState<ReconnectState>(() => readJson(STORAGE_KEY, {}));
  const [caseNumber, setCaseNumber] = useState(settings.caseNumber || "");

  function toggle(id: string) {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    writeJson(STORAGE_KEY, next);
  }

  function saveCaseNumber(value: string) {
    setCaseNumber(value);
    writeJson(SETTINGS_KEY, { ...settings, caseNumber: value });
  }

  const done = STEPS.filter((_, idx) => state[String(idx)]).length;

  return (
    <Page title="MiFILE Reconnect" subtitle="Reconnect your case so you keep receiving e‑service.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Status</CardSubtitle>
            <CardTitle>Reconnect Progress</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Completed {done} of {STEPS.length} steps.
            </div>
            <div className="mt-3 text-xs text-slate-400">
              If you stop receiving notices, repeat this process.
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Steps</CardSubtitle>
            <CardTitle>Reconnect Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">Case number</div>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Case number"
                value={caseNumber}
                onChange={(e) => saveCaseNumber(e.target.value)}
              />
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              {STEPS.map((step, idx) => (
                <li key={step} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-400"
                    checked={Boolean(state[String(idx)])}
                    onChange={() => toggle(String(idx))}
                  />
                  <span className={state[String(idx)] ? "text-slate-400 line-through" : ""}>{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-slate-400">Official resources</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {RESOURCES.map((resource) => (
                <a
                  key={resource.href}
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-amber-400/50 px-3 py-2 text-xs font-semibold text-amber-200"
                >
                  {resource.label}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
