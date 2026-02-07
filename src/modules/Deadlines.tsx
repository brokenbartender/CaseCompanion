import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { computeRuleDeadlines, CaseProfile } from "../services/workflowEngine";
import { MICHIGAN_CIVIL_RULESET } from "../data/jurisdictions/mi";

const STORAGE_KEY = "case_companion_deadlines_v1";
const PROFILE_KEY = "case_companion_case_profile_v1";

type Deadline = { date: string; title: string; note: string };

const DEADLINE_TEMPLATES = [
  {
    id: "service-91",
    title: "Summons expires (91 days from filing)",
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
  const [profile, setProfile] = useState<CaseProfile>(() =>
    readJson(PROFILE_KEY, {
      jurisdictionId: "mi",
      courtLevel: "district",
      county: "Unknown",
      filingDate: "",
      serviceDate: "",
      answerDate: "",
      discoveryServedDate: "",
      motionServedDate: "",
      pretrialDate: "",
      claimAmount: undefined,
      venueBasis: "",
      venueCounty: "Unknown"
    })
  );
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

  function addAutoDeadline(label: string, days: number) {
    if (!calcStart.trim()) return;
    const start = new Date(calcStart);
    if (Number.isNaN(start.getTime())) return;
    let count = 0;
    let cursor = new Date(start);
    while (count < days) {
      cursor.setDate(cursor.getDate() + 1);
      const day = cursor.getDay();
      if (day === 0 || day === 6 || isHoliday(cursor)) continue;
      count += 1;
    }
    const due = cursor.toISOString().slice(0, 10);
    const next = [...deadlines, { date: due, title: label, note: `Auto from ${calcStart}` }];
    setDeadlines(next);
    writeJson(STORAGE_KEY, next);
  }

  const [holidayList, setHolidayList] = useState<string[]>(() => readJson("case_companion_holidays_v1", [
    "2026-01-01",
    "2026-05-25",
    "2026-07-03",
    "2026-09-07",
    "2026-11-26",
    "2026-12-25"
  ]));
  const [holidayInput, setHolidayInput] = useState("");

  function saveHolidays(next: string[]) {
    setHolidayList(next);
    writeJson("case_companion_holidays_v1", next);
  }

  function isHoliday(date: Date) {
    const key = date.toISOString().slice(0, 10);
    return holidayList.includes(key);
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
        if (day === 0 || day === 6 || isHoliday(cursor)) continue;
      }
      count += 1;
    }
    const due = cursor.toISOString().slice(0, 10);
    return `${due} (11:59 PM local)`;
  }

  const computed = calculateDeadline();
  const ruleDeadlines = computeRuleDeadlines(profile, holidayList);
  const activeRuleSet = MICHIGAN_CIVIL_RULESET.ruleSets.find((set) => set.courtLevel === profile.courtLevel);
  const overlay = MICHIGAN_CIVIL_RULESET.localOverlays.find(
    (item) => item.county.toLowerCase() === (profile.county || "").toLowerCase()
  );

  return (
    <Page title="Deadlines" subtitle="Track procedural deadlines and reminders.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Workflow Engine</CardSubtitle>
            <CardTitle>Michigan Civil Case Profile</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-300">
              <div>
                <div className="text-xs text-slate-400 mb-1">Jurisdiction</div>
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">Michigan (MI)</div>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Court Level</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={profile.courtLevel}
                  onChange={(e) => {
                    const next = { ...profile, courtLevel: e.target.value as CaseProfile["courtLevel"] };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                >
                  <option value="district">District (<= $25k)</option>
                  <option value="circuit">Circuit (> $25k)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">County</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={profile.county}
                  onChange={(e) => {
                    const next = { ...profile, county: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Filing Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.filingDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, filingDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Service Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.serviceDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, serviceDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Answer Date (if filed)</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.answerDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, answerDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Discovery Served Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.discoveryServedDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, discoveryServedDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Motion Served Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.motionServedDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, motionServedDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Pretrial Conference Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={profile.pretrialDate || ""}
                  onChange={(e) => {
                    const next = { ...profile, pretrialDate: e.target.value };
                    setProfile(next);
                    writeJson(PROFILE_KEY, next);
                  }}
                />
              </label>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Rule set: {activeRuleSet?.id || "none"} - version {activeRuleSet?.version || "n/a"}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Rule-Sourced Deadlines</CardSubtitle>
            <CardTitle>Verified Timeline</CardTitle>
          </CardHeader>
          <CardBody>
            {ruleDeadlines.length === 0 ? (
              <div className="text-sm text-slate-400">Enter filing/service dates to compute rule deadlines.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {ruleDeadlines.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/5 bg-white/5 p-4">
                    <div className="text-xs text-slate-400">
                      Due {item.dueDate || "Manual - set by rule"}
                    </div>
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Trigger: {item.triggerDate} - {item.rule.source.citation}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{item.rule.source.title}</div>
                  </div>
                ))}
              </div>
            )}
            {overlay ? (
              <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                <div className="text-[11px] uppercase text-slate-400">Local Overlay - {overlay.county} County</div>
                <ul className="mt-2 space-y-1">
                  {overlay.notes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
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
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => addAutoDeadline("Service deadline (90 days)", 90)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"
                >
                  Add Service Deadline (+90 days)
                </button>
                <button
                  type="button"
                  onClick={() => addAutoDeadline("Answer deadline (+21 days)", 21)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"
                >
                  Add Answer Deadline (+21 days)
                </button>
                <button
                  type="button"
                  onClick={() => addAutoDeadline("Discovery response (+28 days)", 28)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"
                >
                  Add Discovery Deadline (+28 days)
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Holidays</CardSubtitle>
            <CardTitle>Holiday Editor</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Add holiday (YYYY-MM-DD)"
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (!holidayInput.trim()) return;
                  const next = Array.from(new Set([...holidayList, holidayInput.trim()])).sort();
                  saveHolidays(next);
                  setHolidayInput("");
                }}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Holiday
              </button>
              <div className="space-y-1 text-xs text-slate-300">
                {holidayList.map((day) => (
                  <div key={day} className="flex items-center justify-between">
                    <span>{day}</span>
                    <button
                      type="button"
                      onClick={() => saveHolidays(holidayList.filter((d) => d !== day))}
                      className="text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
