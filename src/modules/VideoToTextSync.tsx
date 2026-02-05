import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_video_sync_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";

type SyncRow = { timecode: string; reportLine: string; note: string; timelineTitle?: string };

export default function VideoToTextSync() {
  const [rows, setRows] = useState<SyncRow[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<SyncRow>({ timecode: "", reportLine: "", note: "", timelineTitle: "" });
  const timeline = readJson<any[]>(TIMELINE_KEY, []);

  function addRow() {
    if (!form.timecode.trim() || !form.reportLine.trim()) return;
    const next = [...rows, { ...form }];
    setRows(next);
    writeJson(STORAGE_KEY, next);
    setForm({ timecode: "", reportLine: "", note: "" });
  }

  return (
    <Page title="Video-to-Text Sync" subtitle="Map video timestamps to report lines (informational only).">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>New Link</CardSubtitle>
            <CardTitle>Add Mapping</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Timecode (e.g., 00:45)"
              value={form.timecode}
              onChange={(e) => setForm({ ...form, timecode: e.target.value })}
            />
            <input
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Report line or page reference"
              value={form.reportLine}
              onChange={(e) => setForm({ ...form, reportLine: e.target.value })}
            />
            <textarea
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={3}
              placeholder="Notes"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <select
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              value={form.timelineTitle}
              onChange={(e) => setForm({ ...form, timelineTitle: e.target.value })}
            >
              <option value="">Link to timeline event (optional)</option>
              {timeline.map((event, idx) => (
                <option key={`${event.title}-${idx}`} value={event.title}>
                  {event.date || "TBD"} - {event.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRow}
              className="mt-3 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Add Mapping
            </button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Mappings</CardSubtitle>
            <CardTitle>Synced Evidence</CardTitle>
          </CardHeader>
          <CardBody>
            {rows.length === 0 ? (
              <div className="text-sm text-slate-400">No mappings yet.</div>
            ) : (
              <div className="space-y-2 text-sm text-slate-300">
                {rows.map((row, idx) => (
                  <div key={idx} className="rounded-md border border-white/5 bg-white/5 p-3">
                    <div className="text-xs text-slate-500">{row.timecode}</div>
                    <div className="text-sm text-slate-100">{row.reportLine}</div>
                    {row.note ? <div className="text-xs text-slate-400 mt-1">{row.note}</div> : null}
                    {row.timelineTitle ? <div className="text-xs text-amber-200 mt-1">Timeline: {row.timelineTitle}</div> : null}
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
