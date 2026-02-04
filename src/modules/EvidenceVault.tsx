import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_CATEGORIES, EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";
import { uploadExhibit } from "../services/apiClient";

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
  const [meta, setMeta] = useState<MetaState>(() => readJson(META_KEY, {}));
  const [uploadStatus, setUploadStatus] = useState<string>("");
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
            <CardSubtitle>Export</CardSubtitle>
            <CardTitle>Evidence Packet</CardTitle>
          </CardHeader>
          <CardBody>
            <button
              type="button"
              onClick={exportPacket}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Export Evidence Packet
            </button>
            <div className="mt-2 text-xs text-slate-500">Exports local evidence index + tags/status.</div>
          </CardBody>
        </Card>

        {EVIDENCE_CATEGORIES.map((category) => {
          const items = EVIDENCE_INDEX.filter((item) => item.category === category);
          return (
            <Card key={category}>
              <CardHeader>
                <CardSubtitle>Category</CardSubtitle>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="text-sm text-slate-400 mb-3">{items.length} items</div>
                <ul className="space-y-3 text-sm text-slate-300">
                  {items.map((item) => {
                    const itemMeta = meta[item.path] || defaultMeta();
                    return (
                      <li key={item.path} className="rounded-md border border-white/5 bg-white/5 p-3">
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
