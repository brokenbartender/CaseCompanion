import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { uploadExhibit, ApiConfig } from "../services/apiClient";

const SETTINGS_KEY = "case_companion_settings_v1";
const RECENT_KEY = "case_companion_recent_ingest_v1";

type CaseSettings = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

type RecentIngest = {
  id: string;
  filename: string;
  size: number;
  status: string;
  at: string;
};

export default function IngestCenter() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const [status, setStatus] = useState("");
  const [recent, setRecent] = useState<RecentIngest[]>(() => readJson(RECENT_KEY, []));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const ready = useMemo(() => Boolean(settings.apiBase && settings.workspaceId && settings.authToken), [settings]);

  async function handleUpload() {
    if (!selectedFile) return;
    if (!ready) {
      setStatus("Set API base, workspace ID, and auth token in Case Settings.");
      return;
    }
    try {
      setStatus("Uploading and hashing...");
      const config: ApiConfig = {
        apiBase: settings.apiBase,
        workspaceId: settings.workspaceId,
        authToken: settings.authToken
      };
      await uploadExhibit(config, selectedFile);
      const next: RecentIngest[] = [
        {
          id: `${Date.now()}`,
          filename: selectedFile.name,
          size: selectedFile.size,
          status: "Uploaded",
          at: new Date().toISOString()
        },
        ...recent
      ].slice(0, 8);
      setRecent(next);
      writeJson(RECENT_KEY, next);
      setStatus("Upload complete.");
      setSelectedFile(null);
    } catch (err: any) {
      setStatus(err?.message || "Upload failed.");
    }
  }

  return (
    <Page title="Ingest Center" subtitle="Upload PDFs and media for secure ingestion.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Upload</CardSubtitle>
            <CardTitle>Evidence Ingest</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-sm text-slate-300"
              />
              <button
                type="button"
                onClick={handleUpload}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Upload & Ingest
              </button>
              <div className="text-xs text-slate-500">
                {ready ? "Connected to backend." : "Backend not configured."}
              </div>
              {status ? <div className="text-xs text-amber-200">{status}</div> : null}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Recent Uploads</CardSubtitle>
            <CardTitle>Ingest Log</CardTitle>
          </CardHeader>
          <CardBody>
            {recent.length === 0 ? (
              <div className="text-sm text-slate-400">No uploads yet.</div>
            ) : (
              <div className="space-y-3">
                {recent.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-white">{entry.filename}</div>
                    <div className="text-xs text-slate-400">
                      {entry.status} • {(entry.size / (1024 * 1024)).toFixed(2)} MB • {new Date(entry.at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
