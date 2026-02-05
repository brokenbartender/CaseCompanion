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
  pageCount?: number;
  renderedPages?: number;
};

type CombinedStatus = {
  video?: ExhibitStatus;
  pdf?: ExhibitStatus;
};

export default function ExhibitDetail() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const [exhibitId, setExhibitId] = useState("");
  const [status, setStatus] = useState<CombinedStatus | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>("");

  const apiBase = settings.apiBase || "http://localhost:8787";

  const frameArtifacts = useMemo(() => artifacts.filter((a) => a.type === "frame"), [artifacts]);
  const keyframeArtifacts = useMemo(() => artifacts.filter((a) => a.type === "keyframe"), [artifacts]);
  const thumbnailArtifacts = useMemo(() => artifacts.filter((a) => a.type === "thumbnail"), [artifacts]);
  const pdfPageArtifacts = useMemo(() => artifacts.filter((a) => a.type === "pdf_page"), [artifacts]);
  const audioArtifact = useMemo(() => artifacts.find((a) => a.type === "audio"), [artifacts]);
  const manifestArtifact = useMemo(() => artifacts.find((a) => a.type === "manifest"), [artifacts]);
  const authenticityArtifact = useMemo(() => artifacts.find((a) => a.type === "authenticity"), [artifacts]);
  const textArtifact = useMemo(() => artifacts.find((a) => a.type === "text"), [artifacts]);

  async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchText(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  }

  async function loadMetadata(items: Artifact[]) {
    const meta: Record<string, any> = {};
    const targets = items.filter((a) => a.type === "metadata");
    for (const item of targets) {
      try {
        if (item.path.endsWith(".json")) {
          const data = await fetchJson(`${apiBase}${item.downloadUrl}`);
          meta[item.path] = data;
        } else {
          const text = await fetchText(`${apiBase}${item.downloadUrl}`);
          meta[item.path] = text;
        }
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
              <div className="space-y-4 text-sm text-slate-300">
                <div>
                  <div className="text-amber-200">Video Forensics</div>
                  <div>Status: {status.video?.status ?? "not_applicable"}</div>
                  {status.video?.startedAt ? <div>Started: {status.video.startedAt}</div> : null}
                  {status.video?.finishedAt ? <div>Finished: {status.video.finishedAt}</div> : null}
                  {status.video?.error ? <div className="text-red-300">Error: {status.video.error}</div> : null}
                </div>
                <div>
                  <div className="text-amber-200">PDF Forensics</div>
                  <div>Status: {status.pdf?.status ?? "not_applicable"}</div>
                  {status.pdf?.startedAt ? <div>Started: {status.pdf.startedAt}</div> : null}
                  {status.pdf?.finishedAt ? <div>Finished: {status.pdf.finishedAt}</div> : null}
                  {status.pdf?.pageCount ? <div>Pages: {status.pdf.pageCount}</div> : null}
                  {status.pdf?.renderedPages ? <div>Rendered: {status.pdf.renderedPages}</div> : null}
                  {status.pdf?.error ? <div className="text-red-300">Error: {status.pdf.error}</div> : null}
                </div>
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
            <CardTitle>Forensics Metadata</CardTitle>
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
                      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Authenticity</CardSubtitle>
            <CardTitle>Deepfake Check</CardTitle>
          </CardHeader>
          <CardBody>
            {authenticityArtifact ? (
              <a
                className="text-amber-300"
                href={`${apiBase}${authenticityArtifact.downloadUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                Download Authenticity Report
              </a>
            ) : (
              <div className="text-sm text-slate-400">
                Authenticity report not available. Configure `FRACTALVIDEOGUARD_SCRIPT` to enable.
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
              {textArtifact ? (
                <a className="text-amber-300" href={`${apiBase}${textArtifact.downloadUrl}`} target="_blank" rel="noreferrer">
                  Download Extracted Text
                </a>
              ) : (
                <div className="text-sm text-slate-400">
                  Transcript or extracted text not available yet.
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardSubtitle>PDF Pages</CardSubtitle>
            <CardTitle>Rendered Pages</CardTitle>
          </CardHeader>
          <CardBody>
            {pdfPageArtifacts.length === 0 ? (
              <div className="text-sm text-slate-400">No PDF pages available.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pdfPageArtifacts.slice(0, 24).map((page) => (
                  <div key={page.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                    <img src={`${apiBase}${page.downloadUrl}`} alt={page.id} className="w-full rounded" />
                    <div className="mt-1 text-xs text-slate-400">{page.id}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

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

        <Card>
          <CardHeader>
            <CardSubtitle>Keyframes</CardSubtitle>
            <CardTitle>Scene Changes</CardTitle>
          </CardHeader>
          <CardBody>
            {keyframeArtifacts.length === 0 ? (
              <div className="text-sm text-slate-400">No keyframes available.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keyframeArtifacts.slice(0, 24).map((frame) => (
                  <div key={frame.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                    <img src={`${apiBase}${frame.downloadUrl}`} alt={frame.id} className="w-full rounded" />
                    <div className="mt-1 text-xs text-slate-400">{frame.id}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Thumbnail</CardSubtitle>
            <CardTitle>Contact Sheet</CardTitle>
          </CardHeader>
          <CardBody>
            {thumbnailArtifacts.length === 0 ? (
              <div className="text-sm text-slate-400">No contact sheet available.</div>
            ) : (
              <div className="rounded-md border border-white/5 bg-white/5 p-2">
                <img
                  src={`${apiBase}${thumbnailArtifacts[0].downloadUrl}`}
                  alt={thumbnailArtifacts[0].id}
                  className="w-full rounded"
                />
                <div className="mt-1 text-xs text-slate-400">{thumbnailArtifacts[0].id}</div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
