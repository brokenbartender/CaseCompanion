import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { logAuditEvent } from "../utils/auditLog";

const STORAGE_KEY = "case_companion_timeline_v1";
const TRACKS = [
  { id: "master", label: "Master Timeline" },
  { id: "retaliation", label: "Retaliation Timeline" },
  { id: "termination", label: "Termination Timeline" }
];

type TimelineEvent = {
  date: string;
  title: string;
  note: string;
  evidence: string[];
  proof?: string;
  exhibitRef?: string;
  pageRef?: string;
  track: "master" | "retaliation" | "termination";
};

const DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},\s+\d{4}\b/i,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i
];

function normalizeDate(raw: string) {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) {
    const [m, d, y] = raw.split("/");
    const year = y.length === 2 ? `20${y}` : y;
    const mm = m.padStart(2, "0");
    const dd = d.padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function extractDate(text: string) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) return normalizeDate(match[0]);
  }
  return "";
}

function cleanTitle(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/^\d{4}-\d{2}-\d{2}\s*[-–—]\s*/i, "").trim();
}

function inferTrack(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("retaliation")) return "retaliation";
  if (lower.includes("termination")) return "termination";
  return "master";
}

export default function CaseTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>(() => readJson(STORAGE_KEY, []));
  const [summary, setSummary] = useState(() => readJson("case_companion_neutral_summary_v1", ""));
  const [form, setForm] = useState<TimelineEvent>({
    date: "",
    title: "",
    note: "",
    evidence: [],
    proof: "",
    exhibitRef: "",
    pageRef: "",
    track: "master"
  });
  const [activeTrack, setActiveTrack] = useState<"all" | TimelineEvent["track"]>("all");

  const sorted = useMemo(() => {
    const list = activeTrack === "all" ? events : events.filter((event) => event.track === activeTrack);
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, activeTrack]);

  function addEvent() {
    if (!form.title.trim()) return;
    const next = [...events, { ...form }];
    setEvents(next);
    writeJson(STORAGE_KEY, next);
    logAuditEvent("Timeline event added", { title: form.title, date: form.date, track: form.track });
    setForm({ date: "", title: "", note: "", evidence: [], proof: "", exhibitRef: "", pageRef: "", track: form.track });
  }

  function toggleEvidence(path: string) {
    setForm((prev) => {
      const has = prev.evidence.includes(path);
      const next = has ? prev.evidence.filter((p) => p !== path) : [...prev.evidence, path];
      return { ...prev, evidence: next };
    });
  }

  function exportTimeline(track: "master" | "retaliation" | "termination") {
    const list = events.filter((event) => event.track === track);
    const payload = {
      track,
      updatedAt: new Date().toISOString(),
      events: list
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track}_timeline.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTimelineHtml(track: "master" | "retaliation" | "termination") {
    const list = events.filter((event) => event.track === track).sort((a, b) => a.date.localeCompare(b.date));
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${track.toUpperCase()} Timeline</title>
    <style>
      body { font-family: "Times New Roman", serif; margin: 32px; color: #0a0a0a; }
      h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
      .row { margin: 12px 0; }
      .date { font-weight: bold; }
      .note { margin-top: 4px; color: #333; }
    </style>
  </head>
  <body>
    <h1>${track.toUpperCase()} Timeline</h1>
    ${list.map((event) => `
      <div class="row">
        <div class="date">${event.date || "TBD"} - ${event.title}</div>
        ${event.note ? `<div class="note">${event.note}</div>` : ""}
      </div>
    `).join("")}
  </body>
</html>
    `.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track}_timeline.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateNeutralSummary() {
    const list = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const lines = [
      "Neutral Case Summary",
      "",
      ...list.map((event) => {
        const cite = event.exhibitRef || event.pageRef ? ` [${event.exhibitRef || "Exhibit"}${event.pageRef ? `, ${event.pageRef}` : ""}]` : "";
        return `On ${event.date || "TBD"}, ${event.title}.${cite}`;
      })
    ];
    const text = lines.join("\n");
    setSummary(text);
    writeJson("case_companion_neutral_summary_v1", text);
    logAuditEvent("Neutral summary generated", { events: list.length });
  }

  function exportNeutralSummary() {
    const blob = new Blob([summary || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neutral_case_summary.txt";
    a.click();
    URL.revokeObjectURL(url);
    logAuditEvent("Neutral summary exported", { format: "txt" });
  }

  function autoBuildTimeline() {
    const dynamicEvidence = readJson<{ name: string; path: string; ext: string; category: string }[]>(
      "case_companion_dynamic_evidence_v1",
      []
    );
    const combined = [...dynamicEvidence, ...EVIDENCE_INDEX];
    const generated = combined
      .map((item) => {
        const date = extractDate(item.name);
        if (!date) return null;
        const title = cleanTitle(item.name);
        return {
          date,
          title,
          note: `Auto-added from evidence: ${item.name}`,
          evidence: [item.path],
          proof: "",
          track: inferTrack(item.name)
        } as TimelineEvent;
      })
      .filter(Boolean) as TimelineEvent[];

    if (!generated.length) return;
    const existingKeys = new Set(events.map((event) => `${event.date}|${event.title}|${event.track}`));
    const merged = [
      ...events,
      ...generated.filter((event) => !existingKeys.has(`${event.date}|${event.title}|${event.track}`))
    ];
    setEvents(merged);
    writeJson(STORAGE_KEY, merged);
    logAuditEvent("Timeline auto-built from evidence", { added: merged.length - events.length });
  }

  return (
    <Page
      title="Timeline"
      subtitle="Chronology of events tied to evidence and procedural steps."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Add Event</CardSubtitle>
            <CardTitle>Timeline Entry</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={form.track}
                onChange={(e) => setForm({ ...form, track: e.target.value as TimelineEvent["track"] })}
              >
                {TRACKS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Date (YYYY-MM-DD)"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Notes"
                rows={4}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Proof of service filename (optional)"
                value={form.proof || ""}
                onChange={(e) => setForm({ ...form, proof: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Exhibit reference (e.g., Exhibit H)"
                value={form.exhibitRef || ""}
                onChange={(e) => setForm({ ...form, exhibitRef: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Page reference (e.g., p. 3)"
                value={form.pageRef || ""}
                onChange={(e) => setForm({ ...form, pageRef: e.target.value })}
              />
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-xs text-slate-400 mb-2">Link evidence</div>
                <div className="max-h-48 overflow-auto space-y-1">
                  {EVIDENCE_INDEX.map((item) => (
                    <label key={item.path} className="flex items-start gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        className="mt-1 h-3 w-3 accent-amber-400"
                        checked={form.evidence.includes(item.path)}
                        onChange={() => toggleEvidence(item.path)}
                      />
                      <span className="truncate">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={addEvent}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Event
              </button>
              <button
                type="button"
                onClick={autoBuildTimeline}
                className="w-full rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Auto-Build Timeline from Evidence
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Case Chronology</CardSubtitle>
            <CardTitle>Timeline Entries</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="uppercase tracking-[0.2em] text-slate-500">Filter</span>
              {["all", ...TRACKS.map((t) => t.id)].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTrack(value as typeof activeTrack)}
                  className={`rounded-full border px-3 py-1 ${
                    activeTrack === value ? "border-amber-400 bg-amber-500/20 text-amber-200" : "border-slate-800 bg-slate-900"
                  }`}
                >
                  {value === "all" ? "All" : value}
                </button>
              ))}
            </div>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No events yet. Add your first entry.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((event, idx) => (
                  <div key={`${event.title}-${idx}`} className="rounded-lg border border-white/5 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{event.track} timeline</div>
                    <div className="text-sm text-slate-400">{event.date || "TBD"}</div>
                    <div className="text-base text-white font-semibold">{event.title}</div>
                    {event.note ? <div className="text-sm text-slate-300 mt-1">{event.note}</div> : null}
                    {event.proof ? (
                      <div className="mt-2 text-xs text-amber-200">Proof: {event.proof}</div>
                    ) : null}
                    {event.exhibitRef || event.pageRef ? (
                      <div className="mt-2 text-xs text-slate-300">
                        Citation: {event.exhibitRef || "Exhibit"} {event.pageRef ? `(${event.pageRef})` : ""}
                      </div>
                    ) : null}
                    {event.evidence?.length ? (
                      <div className="mt-2 text-xs text-slate-500">
                        Linked evidence: {event.evidence.length}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Evidence Cross‑Links</CardSubtitle>
            <CardTitle>Evidence by Event</CardTitle>
          </CardHeader>
          <CardBody>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No events yet.</div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                {sorted.map((event, idx) => (
                  <div key={`${event.title}-${idx}`} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{event.track} timeline</div>
                    <div className="text-xs text-slate-400">{event.date || "TBD"}</div>
                    <div className="text-sm text-white">{event.title}</div>
                    <div className="text-xs text-slate-400">
                      Linked evidence: {event.evidence.length ? event.evidence.join(", ") : "None"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Exports</CardSubtitle>
            <CardTitle>Download Timelines</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
              {TRACKS.map((track) => (
                <div key={track.id} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => exportTimeline(track.id as TimelineEvent["track"])}
                    className="rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
                  >
                    Export {track.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportTimelineHtml(track.id as TimelineEvent["track"])}
                    className="rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
                  >
                    HTML
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Summary</CardSubtitle>
            <CardTitle>Neutral Case Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateNeutralSummary}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Generate Summary
              </button>
              <button
                type="button"
                onClick={exportNeutralSummary}
                className="rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
              >
                Export Summary
              </button>
            </div>
            <textarea
              className="mt-3 min-h-[160px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Generate a neutral summary from timeline events."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
