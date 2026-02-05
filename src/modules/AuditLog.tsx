import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

const SETTINGS_KEY = "case_companion_settings_v1";

type CaseSettings = { apiBase: string; workspaceId: string; authToken: string };

type AuditEvent = { id?: string; action?: string; createdAt?: string; details?: any };

export default function AuditLogView() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<string>("");

  async function loadAudit() {
    if (!settings.apiBase || !settings.workspaceId || !settings.authToken) {
      setStatus("Set API base, workspace ID, and auth token in Case Settings.");
      return;
    }
    try {
      setStatus("Loading...");
      const res = await fetch(`${settings.apiBase}/api/workspaces/${settings.workspaceId}/audit/logs`, {
        headers: { Authorization: `Bearer ${settings.authToken}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : data?.events || []);
      setStatus("");
    } catch (err: any) {
      setStatus(err?.message || "Failed to load audit logs.");
    }
  }

  return (
    <Page title="Audit Log" subtitle="Backend audit events (optional).">
      <Card>
        <CardHeader>
          <CardSubtitle>Audit</CardSubtitle>
          <CardTitle>Workspace Events</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAudit}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Load Audit Logs
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "audit_log.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
            >
              Export Audit Log
            </button>
            <span className="text-xs text-slate-500">{status}</span>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-300 max-h-[500px] overflow-auto">
            {events.map((evt, idx) => (
              <div key={evt.id || idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                <div className="text-xs text-slate-500">{evt.createdAt || ""}</div>
                <div className="text-sm text-slate-100">{evt.action || "(event)"}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
