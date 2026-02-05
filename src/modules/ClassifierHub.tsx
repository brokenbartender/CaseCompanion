import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_classifier_v1";

type ClassifierItem = {
  id: string;
  filename: string;
  tags: string[];
};

function inferTags(name: string) {
  const lower = name.toLowerCase();
  const tags: string[] = [];
  if (/(police|report|ocso)/.test(lower)) tags.push("police-report");
  if (/(medical|er|hospital|trinity|bill|invoice)/.test(lower)) tags.push("medical");
  if (/(video|footage|clip)/.test(lower) || /(mp4|mov|avi|mkv)$/.test(lower)) tags.push("video");
  if (/(witness|statement)/.test(lower)) tags.push("witness");
  return tags;
}

export default function ClassifierHub() {
  const [items, setItems] = useState<ClassifierItem[]>(() => readJson(STORAGE_KEY, []));
  const [filename, setFilename] = useState("");
  const inferred = useMemo(() => (filename ? inferTags(filename) : []), [filename]);

  function addItem() {
    if (!filename.trim()) return;
    const next = [
      ...items,
      { id: `${Date.now()}`, filename: filename.trim(), tags: inferred }
    ];
    setItems(next);
    writeJson(STORAGE_KEY, next);
    setFilename("");
  }

  return (
    <Page title="Classifier Hub" subtitle="Rule-based tagging now; Lawma classifier later.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Auto-Tag</CardSubtitle>
            <CardTitle>Filename Classifier</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Enter filename to classify"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
              <div className="text-xs text-slate-400">
                Suggested tags: {inferred.length ? inferred.join(", ") : "none"}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Save Tagging
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Saved</CardSubtitle>
            <CardTitle>Tag Log</CardTitle>
          </CardHeader>
          <CardBody>
            {items.length === 0 ? (
              <div className="text-sm text-slate-400">No tagged files yet.</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-white">{item.filename}</div>
                    <div className="text-xs text-amber-200">{item.tags.join(", ") || "No tags"}</div>
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
