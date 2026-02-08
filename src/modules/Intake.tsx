import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { getWorkspaceId } from "../services/authStorage";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useLiveIntegrity } from "../hooks/useLiveIntegrity";
import { useMatterId } from "../hooks/useMatterId";

type TriageIndicator = {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type TriageResult = {
  status: "OK" | "REVIEW";
  indicators: TriageIndicator[];
  createdAt: string;
  version: string;
};

type IntakeExhibit = {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string;
  matterId?: string | null;
  triage?: TriageResult | null;
};

type AuditEvent = {
  id: string;
  action: string | null;
  eventType: string;
  createdAt: string;
  payloadJson: string;
};

export default function Intake() {
  const workspaceId = getWorkspaceId();
  const routeMatterId = useMatterId();
  const resolvedMatterId = routeMatterId || "";
  type UploadStatusItem = {
    id: string;
    filename: string;
    status: "PENDING" | "UPLOADING" | "DONE" | "FAILED";
    message?: string;
  };
  const [exhibits, setExhibits] = useState<IntakeExhibit[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custodianName, setCustodianName] = useState("");
  const [custodianEmail, setCustodianEmail] = useState("");
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<UploadStatusItem[]>([]);
  const liveIntegrity = useLiveIntegrity(workspaceId);
  const FILE_LIMIT = 10;
  const MAX_MB = 20;

  const ingestStatus = useMemo(() => {
    const events = liveIntegrity.events || [];
    const hasEvent = (label: string) => events.some((event) => event.action === label);
    const steps = [
      { id: "SEED", label: "Seeding evidence", done: hasEvent("INGEST_STARTED") || hasEvent("EXHIBIT_UPLOAD") },
      { id: "HASH", label: "Hash sealing", done: hasEvent("HASH_SEALED") || hasEvent("ROOT_HASH_SEALED") },
      { id: "RULES", label: "Rule scan", done: hasEvent("RULE_SCAN_COMPLETE") },
      { id: "BATES", label: "Bates anchoring", done: hasEvent("BATES_STAMPED") }
    ];
    const firstPendingIndex = steps.findIndex((step) => !step.done);
    const activeIndex = firstPendingIndex === -1 ? steps.length - 1 : Math.max(0, firstPendingIndex);
    const lastEvent = events[0];
    return { steps, activeIndex, lastEvent };
  }, [liveIntegrity.events]);

  const selected = useMemo(
    () => exhibits.find((ex) => ex.id === selectedId) || null,
    [exhibits, selectedId]
  );

  const refreshIntake = async () => {
    if (!workspaceId || !resolvedMatterId) return;
    const list = await api.get(`/workspaces/${workspaceId}/matters/${resolvedMatterId}/intake/recent`);
    const normalized: IntakeExhibit[] = Array.isArray(list)
      ? list.map((row) => ({
          id: row.id,
          filename: row.filename,
          mimeType: row.mimeType,
          createdAt: row.createdAt,
          matterId: row.matterId ?? null,
          triage: row.triage || null
        }))
      : [];
    setExhibits(normalized);
    if (!selectedId && normalized.length) setSelectedId(normalized[0].id);
  };

  const refreshAudit = async (exhibitId: string) => {
    if (!workspaceId || !exhibitId) return;
    const list = await api.get(`/workspaces/${workspaceId}/audit/by-resource/${exhibitId}?take=25`);
    setEvents(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    refreshIntake().catch(() => null);
  }, [workspaceId, resolvedMatterId]);

  useEffect(() => {
    if (!workspaceId) return;
    api.get(`/workspaces/${workspaceId}/trust/policy`)
      .then((row: any) => {
        setUploadsEnabled(row?.uploadsEnabled !== false);
      })
      .catch(() => null);
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedId) return;
    refreshAudit(selectedId).catch(() => null);
  }, [selectedId]);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId) return;
    if (!resolvedMatterId) {
      setError("Matter missing. Choose a matter before uploading.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File | null;
    if (!file) {
      setError("Select a file to upload.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB}MB limit.`);
      return;
    }
    if (custodianName) form.set("custodianName", custodianName);
    if (custodianEmail) form.set("custodianEmail", custodianEmail);
    setBusy(true);
    setError(null);
    const uploadId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newItem: UploadStatusItem = { id: uploadId, filename: file.name, status: "UPLOADING" };
    setUploadStatus((prev) => [newItem, ...prev].slice(0, FILE_LIMIT));
    try {
      form.set("matterId", resolvedMatterId);
      await api.postForm(`/workspaces/${workspaceId}/matters/${resolvedMatterId}/intake/upload`, form);
      await refreshIntake();
      setUploadStatus((prev) => prev.map((item) => (
        item.id === uploadId ? { ...item, status: "DONE" } : item
      )));
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
      setUploadStatus((prev) => prev.map((item) => (
        item.id === uploadId ? { ...item, status: "FAILED", message: err?.message || "Upload failed" } : item
      )));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Evidence Intake</CardTitle>
          <CardSubtitle>Upload a source file and record triage indicators.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-300">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">Ingest Timeline</div>
            <div className="space-y-2">
              {ingestStatus.steps.map((step, idx) => {
                const isActive = idx === ingestStatus.activeIndex && !step.done;
                const tone = step.done
                  ? "text-emerald-200"
                  : isActive
                    ? "text-blue-200"
                    : "text-slate-500";
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      step.done ? "bg-emerald-400" : isActive ? "bg-blue-400 animate-pulse" : "bg-slate-600"
                    }`} />
                    <span className={tone}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            {ingestStatus.lastEvent ? (
              <div className="mt-3 text-[10px] text-slate-500">
                Latest event: <span className="text-slate-300">{ingestStatus.lastEvent.action}</span>
              </div>
            ) : (
              <div className="mt-3 text-[10px] text-slate-600">Awaiting ingest events.</div>
            )}
          </div>
          <form onSubmit={handleUpload} className="space-y-3">
            <input
              type="file"
              name="file"
              accept=".pdf,image/*,audio/*"
              disabled={!uploadsEnabled}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white"
            />
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2 text-[11px] text-slate-300">
              Upload limit: {FILE_LIMIT} files, {MAX_MB}MB each. Files are encrypted in transit and at rest. Use “Purge Session Now” in Trust Center for local cleanup.
            </div>
            <input
              type="text"
              placeholder="Custodian name (optional)"
              value={custodianName}
              onChange={(e) => setCustodianName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white"
            />
            <input
              type="email"
              placeholder="Custodian email (optional)"
              value={custodianEmail}
              onChange={(e) => setCustodianEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white"
            />
            <Button variant="primary" disabled={busy || !uploadsEnabled} type="submit">
              {busy ? "Uploading..." : "Upload Intake"}
            </Button>
            {!uploadsEnabled ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-2 text-xs text-amber-200">
                Uploads are disabled by workspace policy. Contact an admin to enable uploads.
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
          </form>
          {uploadStatus.length ? (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Upload Status</div>
              {uploadStatus.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs"
                >
                  <div className="text-slate-200">{item.filename}</div>
                  <div className={`uppercase ${
                    item.status === "DONE" ? "text-emerald-300" : item.status === "FAILED" ? "text-red-300" : "text-amber-300"
                  }`}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Recent Intake</CardTitle>
          <CardSubtitle>Newest exhibits with triage metadata.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {exhibits.length ? exhibits.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedId(ex.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-xs ${
                  ex.id === selectedId
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <div className="font-semibold">{ex.filename}</div>
                <div className="mt-1 text-[10px] text-slate-400">{ex.mimeType}</div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {new Date(ex.createdAt).toLocaleString()}
                </div>
              </button>
            )) : (
              <div className="text-xs text-slate-400">No intake records yet.</div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Chain-of-Custody</CardTitle>
          <CardSubtitle>Audit events for the selected exhibit.</CardSubtitle>
        </CardHeader>
        <CardBody>
          {selected ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Triage Status</div>
                <div className="mt-2 text-sm">
                  {selected.triage?.status || "UNKNOWN"}
                </div>
                {selected.triage?.indicators?.length ? (
                  <div className="mt-2 space-y-2">
                    {selected.triage.indicators.map((indicator) => (
                      <div key={indicator.code} className="rounded-md border border-white/10 bg-black/40 p-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {indicator.severity} - {indicator.code}
                        </div>
                        <div className="text-xs text-slate-200 mt-1">{indicator.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">No triage indicators.</div>
                )}
              </div>
              <div className="space-y-2">
                {events.length ? events.map((evt) => (
                  <div key={evt.id} className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-200">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {evt.action || evt.eventType}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(evt.createdAt).toLocaleString()}
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-slate-400">No audit events found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Select an exhibit to view triage and audit data.</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
