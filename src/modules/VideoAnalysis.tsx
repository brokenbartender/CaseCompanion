import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_video_analysis_v1";

type ClipTag = {
  id: string;
  timestamp: string;
  description: string;
  linkedExhibit: string;
};

export default function VideoAnalysis() {
  const [tags, setTags] = useState<ClipTag[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<ClipTag>({
    id: "",
    timestamp: "",
    description: "",
    linkedExhibit: ""
  });

  function addTag() {
    if (!form.timestamp.trim() || !form.description.trim()) return;
    const next = [...tags, { ...form, id: `${Date.now()}` }];
    setTags(next);
    writeJson(STORAGE_KEY, next);
    setForm({ id: "", timestamp: "", description: "", linkedExhibit: "" });
  }

  return (
    <Page title="Video Content Analysis" subtitle="Tag key moments and link them to exhibits.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Tag Moment</CardSubtitle>
            <CardTitle>Add Clip Tag</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Timestamp (e.g., 00:45)"
                value={form.timestamp}
                onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Linked exhibit (optional)"
                value={form.linkedExhibit}
                onChange={(e) => setForm({ ...form, linkedExhibit: e.target.value })}
              />
              <button
                type="button"
                onClick={addTag}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Tag
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              This is a manual tagging tool now; automated analysis can be added later.
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Tags</CardSubtitle>
            <CardTitle>Clip Index</CardTitle>
          </CardHeader>
          <CardBody>
            {tags.length === 0 ? (
              <div className="text-sm text-slate-400">No tags yet.</div>
            ) : (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-400">{tag.timestamp}</div>
                    <div className="text-sm text-white">{tag.description}</div>
                    {tag.linkedExhibit ? (
                      <div className="text-xs text-amber-200">Exhibit: {tag.linkedExhibit}</div>
                    ) : null}
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
