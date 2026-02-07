import React, { useEffect, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { getMatterId, getWorkspaceId } from "../services/authStorage";
import { fetchCourtProfile, updateCourtProfile, createSchedulingOrder, listSchedulingOrders } from "../services/caseApi";

const STORAGE_KEY = "case_companion_settings_v1";
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
const DEFAULT_WORKSPACE_ID = import.meta.env.VITE_DEFAULT_WORKSPACE_ID || "lexis-workspace-01";
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
      jurisdiction: "Michigan (County TBD)",
      apiBase: DEFAULT_API_BASE,
      workspaceId: DEFAULT_WORKSPACE_ID,
      authToken: ""
    })
  );
  const [sessionIds, setSessionIds] = useState<{ workspaceId: string; matterId: string }>({
    workspaceId: "",
    matterId: ""
  });
  const [courtProfile, setCourtProfile] = useState({ courtName: "", judgeName: "", overrides: "{}" });
  const [scheduleOrder, setScheduleOrder] = useState({ orderDate: "", overrides: "{}" });
  const [scheduleOrders, setScheduleOrders] = useState<any[]>([]);
  const [proseStatus, setProseStatus] = useState("");

  function update(next: Partial<CaseSettings>) {
    const updated = { ...settings, ...next };
    setSettings(updated);
    writeJson(STORAGE_KEY, updated);
  }

  useEffect(() => {
    setSessionIds({
      workspaceId: getWorkspaceId(),
      matterId: getMatterId()
    });
    fetchCourtProfile()
      .then((data: any) => {
        if (data?.courtProfile) {
          setCourtProfile({
            courtName: data.courtProfile.courtName || "",
            judgeName: data.courtProfile.judgeName || "",
            overrides: data.courtProfile.localRuleOverridesJson || "{}"
          });
        }
      })
      .catch(() => null);
    listSchedulingOrders()
      .then((data: any) => setScheduleOrders(Array.isArray(data?.orders) ? data.orders : []))
      .catch(() => null);
  }, []);

  function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
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

  async function saveCourtProfile() {
    try {
      const overrides = JSON.parse(courtProfile.overrides || "{}");
      await updateCourtProfile({
        courtName: courtProfile.courtName,
        judgeName: courtProfile.judgeName,
        overrides
      });
      setProseStatus("Court profile saved.");
    } catch {
      setProseStatus("Invalid JSON or failed to save court profile.");
    }
  }

  async function addSchedulingOrder() {
    try {
      const overrides = JSON.parse(scheduleOrder.overrides || "{}");
      const result: any = await createSchedulingOrder({
        orderDate: scheduleOrder.orderDate,
        overrides
      });
      setScheduleOrders([result.order, ...scheduleOrders].filter(Boolean));
      setScheduleOrder({ orderDate: "", overrides: "{}" });
      setProseStatus("Scheduling order saved.");
    } catch {
      setProseStatus("Invalid JSON or failed to save scheduling order.");
    }
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
            <CardSubtitle>Court Profile</CardSubtitle>
            <CardTitle>Local Rule Overrides</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Court name"
                value={courtProfile.courtName}
                onChange={(e) => setCourtProfile({ ...courtProfile, courtName: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Judge name (optional)"
                value={courtProfile.judgeName}
                onChange={(e) => setCourtProfile({ ...courtProfile, judgeName: e.target.value })}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">Overrides JSON (by rule id)</div>
            <textarea
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={4}
              value={courtProfile.overrides}
              onChange={(e) => setCourtProfile({ ...courtProfile, overrides: e.target.value })}
            />
            <button
              type="button"
              onClick={saveCourtProfile}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Save Court Profile
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Scheduling Orders</CardSubtitle>
            <CardTitle>Overrides</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Order date (YYYY-MM-DD)"
                value={scheduleOrder.orderDate}
                onChange={(e) => setScheduleOrder({ ...scheduleOrder, orderDate: e.target.value })}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">Overrides JSON (by rule id)</div>
            <textarea
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={4}
              value={scheduleOrder.overrides}
              onChange={(e) => setScheduleOrder({ ...scheduleOrder, overrides: e.target.value })}
            />
            <button
              type="button"
              onClick={addSchedulingOrder}
              className="mt-3 rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
            >
              Add Scheduling Order
            </button>
            {scheduleOrders.length ? (
              <div className="mt-3 text-xs text-slate-400">
                Latest orders: {scheduleOrders.slice(0, 3).map((order) => order.orderDate?.slice(0, 10)).join(", ")}
              </div>
            ) : null}
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
            <CardSubtitle>Session IDs</CardSubtitle>
            <CardTitle>Workspace + Matter</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <div className="text-xs text-slate-400">Workspace ID</div>
              <div className="mt-1 break-all">{sessionIds.workspaceId || settings.workspaceId || "Not set"}</div>
              <button
                type="button"
                className="mt-2 text-xs text-amber-200"
                onClick={() => copyText(sessionIds.workspaceId || settings.workspaceId)}
              >
                Copy
              </button>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-xs text-slate-400">Matter ID</div>
              <div className="mt-1 break-all">{sessionIds.matterId || "Not set"}</div>
              <button
                type="button"
                className="mt-2 text-xs text-amber-200"
                onClick={() => copyText(sessionIds.matterId)}
              >
                  Copy
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              If these are blank, log in and return here. These IDs are required for document ingestion.
            </div>
            {proseStatus ? <div className="mt-2 text-xs text-amber-200">{proseStatus}</div> : null}
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
