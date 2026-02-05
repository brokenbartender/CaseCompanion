import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_CATEGORIES, EVIDENCE_INDEX } from "../data/evidenceIndex";
import { MICHIGAN_OBJECTION_CARDS } from "../data/michiganEvidenceObjections";
import { readJson, writeJson } from "../utils/localStore";
import { uploadExhibit } from "../services/apiClient";
import { useLocation } from "react-router-dom";

const META_KEY = "case_companion_evidence_meta_v1";
const SETTINGS_KEY = "case_companion_settings_v1";

type EvidenceMeta = { tags: string[]; status: "new" | "reviewed" | "linked" };

type MetaState = Record<string, EvidenceMeta>;

type CaseSettings = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

function defaultMeta(): EvidenceMeta {
  return { tags: [], status: "new" };
}

export default function EvidenceVault() {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlight = query.get("highlight") || "";
  const [meta, setMeta] = useState<MetaState>(() => readJson(META_KEY, {}));
  const [trialMode, setTrialMode] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [filter, setFilter] = useState<string>(highlight);
  const [statusLookupId, setStatusLookupId] = useState("");
  const [statusResult, setStatusResult] = useState<string>("");
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });

  function updateMeta(path: string, next: Partial<EvidenceMeta>) {
    setMeta((prev) => {
      const current = prev[path] || defaultMeta();
      const updated = { ...current, ...next };
      const merged = { ...prev, [path]: updated };
      writeJson(META_KEY, merged);
      return merged;
    });
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    if (!settings.apiBase || !settings.workspaceId || !settings.authToken) {
      setUploadStatus("Set API base, workspace ID, and auth token in Case Settings.");
      return;
    }
    try {
      setUploadStatus("Uploading...");
      await uploadExhibit(settings, file);
      setUploadStatus("Upload complete.");
    } catch (err: any) {
      setUploadStatus(err?.message || "Upload failed.");
    }
  }

  const trialPicks = EVIDENCE_INDEX.filter((item) => /police report|victim statement|video/i.test(item.name)).slice(0, 3);
  const filteredIndex = useMemo(() => {
    if (!filter.trim()) return EVIDENCE_INDEX;
    const needle = filter.toLowerCase();
    return EVIDENCE_INDEX.filter((item) => item.name.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle));
  }, [filter]);

  async function fetchStatus() {
    if (!settings.apiBase || !statusLookupId.trim()) return;
    try {
      const res = await fetch(`${settings.apiBase}/api/exhibits/${encodeURIComponent(statusLookupId.trim())}`);
      if (!res.ok) {
        setStatusResult(await res.text());
        return;
      }
      const json = await res.json();
      setStatusResult(JSON.stringify(json.status, null, 2));
    } catch (err: any) {
      setStatusResult(err?.message || "Status lookup failed.");
    }
  }

  function exportPacket() {
    const payload = { index: EVIDENCE_INDEX, meta };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_evidence_packet.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExhibitMap() {
    const lines = [
      "Case Companion Exhibit Map",
      "",
      ...EVIDENCE_CATEGORIES.flatMap((category) => {
        const items = EVIDENCE_INDEX.filter((item) => item.category === category);
        return [
          `## ${category}`,
          ...items.map((item) => `- ${item.name} (${item.path})`),
          ""
        ];
      })
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_exhibit_map.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page
      title="Evidence Vault"
      subtitle="Exhibit index with tags and status (local only)."
    >
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Backend Upload (Optional)</CardSubtitle>
            <CardTitle>Upload Exhibit</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="text-sm text-slate-300"
              />
              <span className="text-xs text-slate-500">{uploadStatus}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Video Forensics</CardSubtitle>
            <CardTitle>Status Lookup</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Exhibit ID"
                value={statusLookupId}
                onChange={(e) => setStatusLookupId(e.target.value)}
              />
              <button
                type="button"
                onClick={fetchStatus}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Check Status
              </button>
            </div>
            {statusResult ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                {statusResult}
              </pre>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Trial Mode</CardSubtitle>
            <CardTitle>One-Tap Exhibits</CardTitle>
          </CardHeader>
          <CardBody>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={trialMode}
                onChange={(e) => setTrialMode(e.target.checked)}
              />
              Enable Trial Mode view
            </label>
            {trialMode ? (
              <div className="mt-3 grid gap-4">
                <div className="grid gap-3">
                  {trialPicks.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="w-full rounded-lg bg-amber-500 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 mb-2">Objection Battle Cards</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    {MICHIGAN_OBJECTION_CARDS.map((card) => (
                      <div key={card.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                        <div className="text-amber-200">{card.rule}</div>
                        <div className="text-slate-100">{card.title}</div>
                        <div className="text-slate-400">{card.whenToUse[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Export</CardSubtitle>
            <CardTitle>Evidence Packet</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportPacket}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Export Evidence Packet
              </button>
              <button
                type="button"
                onClick={exportExhibitMap}
                className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
              >
                Export Exhibit Map
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">Exports local evidence index + tags/status.</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Standards</CardSubtitle>
            <CardTitle>Evidence Quality</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Use RAM validation and admissibility checklists before relying on exhibits.
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/evidence-standards"
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                RAM Validator
              </a>
              <a
                href="/video-admissibility"
                className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
              >
                Video Admissibility
              </a>
            </div>
          </CardBody>
        </Card>

        {EVIDENCE_CATEGORIES.map((category) => {
          const items = filteredIndex.filter((item) => item.category === category);
          return (
            <Card key={category}>
              <CardHeader>
                <CardSubtitle>Category</CardSubtitle>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="text-sm text-slate-400 mb-3">{items.length} items</div>
                <input
                  className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                  placeholder="Filter by name or path"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <ul className="space-y-3 text-sm text-slate-300">
                  {items.map((item) => {
                    const itemMeta = meta[item.path] || defaultMeta();
                    const isHighlighted = highlight && item.path === highlight;
                    return (
                      <li
                        key={item.path}
                        className={`rounded-md border border-white/5 bg-white/5 p-3 ${
                          isHighlighted ? "ring-2 ring-amber-400/60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs text-slate-500">.{item.ext}</span>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          <input
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                            placeholder="Tags (comma separated)"
                            value={itemMeta.tags.join(", ")}
                            onChange={(e) =>
                              updateMeta(item.path, {
                                tags: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                              })
                            }
                          />
                          <select
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                            value={itemMeta.status}
                            onChange={(e) => updateMeta(item.path, { status: e.target.value as EvidenceMeta["status"] })}
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="linked">Linked</option>
                          </select>
                          <div className="text-xs text-slate-500">Path: {item.path}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
