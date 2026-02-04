import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_settings_v1";
const EXPORT_KEYS = [
  "case_companion_settings_v1",
  "case_companion_checklist_v1",
  "case_companion_deadlines_v1",
  "case_companion_timeline_v1",
  "case_companion_evidence_meta_v1"
];

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

export default function CaseSettingsView() {
  const [settings, setSettings] = useState<CaseSettings>(() =>
    readJson(STORAGE_KEY, {
      caseName: "",
      court: "",
      judge: "",
      caseNumber: "",
      jurisdiction: "Oakland County, MI",
      apiBase: "",
      workspaceId: "",
      authToken: ""
    })
  );

  function update(next: Partial<CaseSettings>) {
    const updated = { ...settings, ...next };
    setSettings(updated);
    writeJson(STORAGE_KEY, updated);
  }

  function exportData() {
    const payload: Record<string, any> = {};
    for (const key of EXPORT_KEYS) {
      payload[key] = readJson(key, null);
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    Object.entries(data).forEach(([key, value]) => {
      if (EXPORT_KEYS.includes(key)) {
        writeJson(key, value);
      }
    });
    const nextSettings = readJson(STORAGE_KEY, settings);
    setSettings(nextSettings);
  }

  return (
    <Page title="Case Settings" subtitle="Basic case information used across the app.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Case Profile</CardSubtitle>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Case name"
                value={settings.caseName}
                onChange={(e) => update({ caseName: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Court"
                value={settings.court}
                onChange={(e) => update({ court: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Judge"
                value={settings.judge}
                onChange={(e) => update({ judge: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Case number"
                value={settings.caseNumber}
                onChange={(e) => update({ caseNumber: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Jurisdiction"
                value={settings.jurisdiction}
                onChange={(e) => update({ jurisdiction: e.target.value })}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Backend (Optional)</CardSubtitle>
            <CardTitle>API Connection</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="API base URL (e.g. http://localhost:8787)"
                value={settings.apiBase}
                onChange={(e) => update({ apiBase: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Workspace ID"
                value={settings.workspaceId}
                onChange={(e) => update({ workspaceId: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Auth token"
                value={settings.authToken}
                onChange={(e) => update({ authToken: e.target.value })}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Optional: connect to the backend for uploads and audit logs.
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Backup</CardSubtitle>
            <CardTitle>Export or Import</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportData}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Export Backup
              </button>
              <label className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                Import Backup
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importData(file);
                  }}
                />
              </label>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Exports and imports local-only app data.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
