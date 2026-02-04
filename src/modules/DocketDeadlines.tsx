import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { CalendarDays, Bell, Plus } from "lucide-react";
import { opsStore, DeadlineEntry } from "../services/opsStore";
import { logForensicEvent } from "../services/forensicLogger";

export default function DocketDeadlines() {
  const [deadlines, setDeadlines] = useState<DeadlineEntry[]>(() => {
    const existing = opsStore.getDeadlines();
    if (existing.length) return existing;
    return [
      { id: "1", title: "Initial disclosures due", date: "2026-03-10", court: "E.D. Mich" },
      { id: "2", title: "Expert reports", date: "2026-04-02", court: "E.D. Mich" }
    ];
  });
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [appointments, setAppointments] = useState([
    {
      id: "appt-1",
      title: "Client intake call",
      time: "2026-02-06 10:00",
      rsvp: "Pending",
      category: "Client",
      billable: true,
      reminders: ["Email", "SMS"],
      zoom: true,
      recurring: false,
      privacy: "Busy"
    },
    {
      id: "appt-2",
      title: "Hearing prep sync",
      time: "2026-02-07 14:30",
      rsvp: "Accepted",
      category: "Team",
      billable: false,
      reminders: ["Email"],
      zoom: false,
      recurring: true,
      privacy: "Available"
    }
  ]);

  const addDeadline = () => {
    if (!title || !date) return;
    const next = [
      { id: String(Date.now()), title, date, court: "E.D. Mich" },
      ...deadlines
    ];
    setDeadlines(next);
    opsStore.saveDeadlines(next);
    logForensicEvent("deadline.added", { resourceId: next[0].id, title, date });
    setTitle("");
    setDate("");
  };

  const autoCreateTimeEntry = (apptTitle: string) => {
    const entries = opsStore.getTimeEntries();
    const next = [
      {
        id: `time-${Date.now()}`,
        matterId: "M-2024-001",
        task: `Calendar event: ${apptTitle}`,
        minutes: 30,
        createdAt: new Date().toISOString()
      },
      ...entries
    ];
    opsStore.saveTimeEntries(next);
  };

  return (
    <Page title="Docket & Deadlines" subtitle="Court calendar, reminders, and filing checkpoints">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays size={18}/> Upcoming Deadlines</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {deadlines.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
                <div>
                  <div className="text-slate-200">{d.title}</div>
                  <div className="text-xs text-slate-500">{d.court}</div>
                </div>
                <div className="text-amber-300 font-mono">{d.date}</div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add Deadline</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deadline title" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-slate-100" />
            <Button onClick={addDeadline} className="w-full flex items-center gap-2"><Plus size={14}/> Add</Button>
            <div className="space-y-2 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Exclude weekends
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Exclude federal holidays
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Rules-based calendaring enabled
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Bell size={12}/> Auto reminders enabled</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Calendar Management</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            {appointments.map((appt) => (
              <div key={appt.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-200">{appt.title}</div>
                    <div className="text-xs text-slate-500">{appt.time} • {appt.category}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-blue-300">{appt.rsvp}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                  <span className="rounded-full border border-slate-700 px-2 py-1">Reminders: {appt.reminders.join(", ")}</span>
                  <span className="rounded-full border border-slate-700 px-2 py-1">Privacy: {appt.privacy}</span>
                  {appt.zoom ? <span className="rounded-full border border-slate-700 px-2 py-1">Zoom link</span> : null}
                  {appt.recurring ? <span className="rounded-full border border-slate-700 px-2 py-1">Recurring</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      autoCreateTimeEntry(appt.title);
                      logForensicEvent("calendar.time_entry", { title: appt.title });
                    }}
                  >
                    Auto-create Time Entry
                  </Button>
                  <Button variant="secondary">Send ICS Invite</Button>
                  <Button variant="secondary">Add Reminder</Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
