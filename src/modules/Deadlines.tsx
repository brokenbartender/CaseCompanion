import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_deadlines_v1";

type Deadline = { date: string; title: string; note: string };

const DEADLINE_TEMPLATES = [
  {
    id: "service-90",
    title: "Service deadline (90 days from filing)",
    note: "Confirm the service window for your court."
  },
  {
    id: "answer-21",
    title: "Answer deadline (typically 21 days from service)",
    note: "Confirm response time based on service method."
  },
  {
    id: "discovery-response",
    title: "Discovery response deadline",
    note: "Set based on your discovery request date."
  }
];

export default function DeadlinesView() {
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<Deadline>({ date: "", title: "", note: "" });
  const [templateId, setTemplateId] = useState(DEADLINE_TEMPLATES[0].id);
  const [templateDate, setTemplateDate] = useState("");
  const [calcStart, setCalcStart] = useState("");
  const [calcDays, setCalcDays] = useState("0");
  const [calcBusiness, setCalcBusiness] = useState(true);

  const sorted = useMemo(() => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)), [deadlines]);

  function addDeadline() {
    if (!form.title.trim()) return;
    const next = [...deadlines, { ...form }];
    setDeadlines(next);
    writeJson(STORAGE_KEY, next);
    setForm({ date: "", title: "", note: "" });
  }

  function addTemplate() {
    const template = DEADLINE_TEMPLATES.find((item) => item.id === templateId);
    if (!template || !templateDate.trim()) return;
    const next = [...deadlines, { date: templateDate.trim(), title: template.title, note: template.note }];
    setDeadlines(next);
    writeJson(STORAGE_KEY, next);
    setTemplateDate("");
  }

  function calculateDeadline() {
    if (!calcStart.trim()) return "";
    const start = new Date(calcStart);
    if (Number.isNaN(start.getTime())) return "";
    const days = Math.max(0, Number(calcDays) || 0);
    let count = 0;
    let cursor = new Date(start);
    while (count < days) {
      cursor.setDate(cursor.getDate() + 1);
      if (calcBusiness) {
        const day = cursor.getDay();
        if (day === 0 || day === 6) continue;
      }
      count += 1;
    }
    const due = cursor.toISOString().slice(0, 10);
    return `${due} (11:59 PM local)`;
  }

  const computed = calculateDeadline();

  return (
    <Page title="Deadlines" subtitle="Track procedural deadlines and reminders.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Calculator</CardSubtitle>
            <CardTitle>Deadline Tool</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Start date (YYYY-MM-DD)"
                value={calcStart}
                onChange={(e) => setCalcStart(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Number of days"
                value={calcDays}
                onChange={(e) => setCalcDays(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-400"
                  checked={calcBusiness}
                  onChange={(e) => setCalcBusiness(e.target.checked)}
                />
                Business days only
              </label>
              <div className="text-xs text-amber-200">Due: {computed || "Enter inputs"}</div>
              <div className="text-[10px] text-slate-500">
                Filings submitted by 11:59 PM count that business day. Weekends roll to next business day.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Presets</CardSubtitle>
            <CardTitle>Quick Add</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {DEADLINE_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Date (YYYY-MM-DD)"
                value={templateDate}
                onChange={(e) => setTemplateDate(e.target.value)}
              />
              <button
                type="button"
                onClick={addTemplate}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Template Deadline
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Templates are common defaults. Confirm exact timing with court rules.
            </div>
          </CardBody>
        </Card>

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
