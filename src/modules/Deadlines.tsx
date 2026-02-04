import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_deadlines_v1";

type Deadline = { date: string; title: string; note: string };

export default function DeadlinesView() {
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<Deadline>({ date: "", title: "", note: "" });

  const sorted = useMemo(() => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)), [deadlines]);

  function addDeadline() {
    if (!form.title.trim()) return;
    const next = [...deadlines, { ...form }];
    setDeadlines(next);
    writeJson(STORAGE_KEY, next);
    setForm({ date: "", title: "", note: "" });
  }

  return (
    <Page title="Deadlines" subtitle="Track procedural deadlines and reminders.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Add Deadline</CardSubtitle>
            <CardTitle>New Deadline</CardTitle>
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
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <button
                type="button"
                onClick={addDeadline}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Deadline
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Upcoming</CardSubtitle>
            <CardTitle>Deadline List</CardTitle>
          </CardHeader>
          <CardBody>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No deadlines yet.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((d, idx) => (
                  <div key={`${d.title}-${idx}`} className="rounded-lg border border-white/5 bg-white/5 p-4">
                    <div className="text-sm text-slate-400">{d.date || "TBD"}</div>
                    <div className="text-base text-white font-semibold">{d.title}</div>
                    {d.note ? <div className="text-sm text-slate-300 mt-1">{d.note}</div> : null}
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
