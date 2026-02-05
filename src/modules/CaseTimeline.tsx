import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";

const STORAGE_KEY = "case_companion_timeline_v1";

type TimelineEvent = { date: string; title: string; note: string; evidence: string[]; proof?: string };

export default function CaseTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<TimelineEvent>({ date: "", title: "", note: "", evidence: [], proof: "" });

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  function addEvent() {
    if (!form.title.trim()) return;
    const next = [...events, { ...form }];
    setEvents(next);
    writeJson(STORAGE_KEY, next);
    setForm({ date: "", title: "", note: "", evidence: [] });
  }

  function toggleEvidence(path: string) {
    setForm((prev) => {
      const has = prev.evidence.includes(path);
      const next = has ? prev.evidence.filter((p) => p !== path) : [...prev.evidence, path];
      return { ...prev, evidence: next };
    });
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
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Case Chronology</CardSubtitle>
            <CardTitle>Timeline Entries</CardTitle>
          </CardHeader>
          <CardBody>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No events yet. Add your first entry.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((event, idx) => (
                  <div key={`${event.title}-${idx}`} className="rounded-lg border border-white/5 bg-white/5 p-4">
                    <div className="text-sm text-slate-400">{event.date || "TBD"}</div>
                    <div className="text-base text-white font-semibold">{event.title}</div>
                    {event.note ? <div className="text-sm text-slate-300 mt-1">{event.note}</div> : null}
                    {event.proof ? (
                      <div className="mt-2 text-xs text-amber-200">Proof: {event.proof}</div>
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
      </div>
    </Page>
  );
}
