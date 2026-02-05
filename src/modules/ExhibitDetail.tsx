import React, { useEffect, useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

const SETTINGS_KEY = "case_companion_settings_v1";

type CaseSettings = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

type Artifact = {
  id: string;
  type: string;
  path: string;
  sha256: string;
  size: number;
  downloadUrl: string;
};

type ExhibitStatus = {
  exhibitId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  artifacts?: Artifact[];
};

export default function ExhibitDetail() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const [exhibitId, setExhibitId] = useState("");
  const [status, setStatus] = useState<ExhibitStatus | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>("");

  const apiBase = settings.apiBase || "http://localhost:8787";

  const frameArtifacts = useMemo(() => artifacts.filter((a) => a.type === "frame"), [artifacts]);
  const audioArtifact = useMemo(() => artifacts.find((a) => a.type === "audio"), [artifacts]);
  const manifestArtifact = useMemo(() => artifacts.find((a) => a.type === "manifest"), [artifacts]);

  async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function loadMetadata(items: Artifact[]) {
    const meta: Record<string, any> = {};
    const targets = items.filter((a) => a.type === "metadata" && a.path.endsWith(".json"));
    for (const item of targets) {
      try {
        const data = await fetchJson(`${apiBase}${item.downloadUrl}`);
        meta[item.path] = data;
      } catch {
        meta[item.path] = { error: "Failed to load metadata." };
      }
    }
    setMetadata(meta);
  }

  async function loadExhibit() {
    if (!exhibitId.trim()) return;
    setError("");
    try {
      const statusRes = await fetchJson(`${apiBase}/api/exhibits/${encodeURIComponent(exhibitId)}`);
      setStatus(statusRes.status || null);
      const artifactRes = await fetchJson(`${apiBase}/api/exhibits/${encodeURIComponent(exhibitId)}/artifacts`);
      setArtifacts(artifactRes.artifacts || []);
      await loadMetadata(artifactRes.artifacts || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load exhibit.");
    }
  }

  useEffect(() => {
    if (exhibitId) loadExhibit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page title="Exhibit Detail" subtitle="Video forensics artifacts and verification." >
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Lookup</CardSubtitle>
            <CardTitle>Exhibit ID</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Paste Exhibit ID"
                value={exhibitId}
                onChange={(e) => setExhibitId(e.target.value)}
              />
              <button
                type="button"
                onClick={loadExhibit}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Load Exhibit
              </button>
            </div>
            {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Status</CardSubtitle>
            <CardTitle>Processing</CardTitle>
          </CardHeader>
          <CardBody>
            {status ? (
              <div className="text-sm text-slate-300 space-y-1">
                <div>Status: {status.status}</div>
                {status.startedAt ? <div>Started: {status.startedAt}</div> : null}
                {status.finishedAt ? <div>Finished: {status.finishedAt}</div> : null}
                {status.error ? <div className="text-red-300">Error: {status.error}</div> : null}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No status loaded.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Verification</CardSubtitle>
            <CardTitle>Manifest</CardTitle>
          </CardHeader>
          <CardBody>
            {manifestArtifact ? (
              <a
                className="text-amber-300"
                href={`${apiBase}${manifestArtifact.downloadUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                Download Verification Manifest
              </a>
            ) : (
              <div className="text-sm text-slate-400">Manifest not available.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Metadata</CardSubtitle>
            <CardTitle>ffprobe / mediainfo / exiftool</CardTitle>
          </CardHeader>
          <CardBody>
            {Object.keys(metadata).length === 0 ? (
              <div className="text-sm text-slate-400">No metadata loaded.</div>
            ) : (
              <div className="space-y-3 text-xs text-slate-200">
                {Object.entries(metadata).map(([key, value]) => (
                  <details key={key} className="rounded-md border border-white/5 bg-white/5 p-3">
                    <summary className="cursor-pointer text-sm text-amber-200">{key}</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-200">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardSubtitle>Audio</CardSubtitle>
              <CardTitle>Extracted Track</CardTitle>
            </CardHeader>
            <CardBody>
              {audioArtifact ? (
                <audio controls src={`${apiBase}${audioArtifact.downloadUrl}`} className="w-full" />
              ) : (
                <div className="text-sm text-slate-400">No audio artifact found.</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardSubtitle>Transcript</CardSubtitle>
              <CardTitle>Panel</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-400">
                Transcript generation not enabled yet. Upload a transcript file to attach it as an artifact.
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardSubtitle>Frames</CardSubtitle>
            <CardTitle>Frame Browser</CardTitle>
          </CardHeader>
          <CardBody>
            {frameArtifacts.length === 0 ? (
              <div className="text-sm text-slate-400">No frames available.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {frameArtifacts.slice(0, 30).map((frame) => (
                  <div key={frame.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                    <img src={`${apiBase}${frame.downloadUrl}`} alt={frame.id} className="w-full rounded" />
                    <div className="mt-1 text-xs text-slate-400">{frame.id}</div>
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
