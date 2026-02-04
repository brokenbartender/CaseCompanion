import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Clock, Play, Square, Download } from "lucide-react";
import { opsStore, TimeEntry } from "../services/opsStore";
import { logForensicEvent } from "../services/forensicLogger";

export default function TimeBilling() {
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("Draft motion in limine");
  const [elapsed, setElapsed] = useState(0);
  const [entries, setEntries] = useState<TimeEntry[]>(() => opsStore.getTimeEntries());

  React.useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const addEntry = () => {
    if (!task.trim()) return;
    const entry: TimeEntry = {
      id: String(Date.now()),
      matterId: "M-2024-001",
      task: task.trim(),
      minutes: Math.max(1, Math.ceil(elapsed / 60)),
      createdAt: new Date().toISOString()
    };
    const next = [entry, ...entries];
    setEntries(next);
    opsStore.saveTimeEntries(next);
    logForensicEvent("time_entry.logged", { resourceId: entry.id, task: entry.task, minutes: entry.minutes });
    setElapsed(0);
    setRunning(false);
  };

  const exportCsv = () => {
    const rows = [
      ["Matter", "Task", "Minutes", "Created"],
      ...entries.map((e) => [e.matterId, e.task, String(e.minutes), e.createdAt])
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lexipro_time_entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLedes = () => {
    const rows = entries.map((e) => ({
      CLIENT_ID: "LEXIPRO",
      MATTER_ID: e.matterId,
      TASK: e.task,
      HOURS: (e.minutes / 60).toFixed(2),
      DATE: e.createdAt.split("T")[0]
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lexipro_ledes_mock.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalMinutes = useMemo(() => entries.reduce((sum, e) => sum + e.minutes, 0), [entries]);

  return (
    <Page title="Time & Billing" subtitle="Matter timers, LEDES-ready exports, and task narratives">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock size={18} /> Live Timer</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="text-4xl font-mono text-slate-200">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-slate-100"
              placeholder="Task description (auto-copied to billing narrative)"
            />
            <div className="flex gap-3">
              <Button onClick={() => setRunning(true)} disabled={running} className="flex items-center gap-2">
                <Play size={14} /> Start
              </Button>
              <Button onClick={() => setRunning(false)} variant="secondary" className="flex items-center gap-2">
                <Square size={14} /> Pause
              </Button>
              <Button onClick={addEntry} variant="primary">Log Entry</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between"><span>Total Entries</span><span>{entries.length}</span></div>
            <div className="flex justify-between"><span>Total Minutes</span><span>{totalMinutes}</span></div>
            <Button onClick={exportCsv} variant="secondary" className="w-full flex items-center gap-2"><Download size={14}/> Export CSV</Button>
            <Button onClick={exportLedes} variant="secondary" className="w-full">Export LEDES (Mock)</Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="text-sm text-slate-500">No entries yet.</div>
              ) : entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
                  <div>
                    <div className="text-slate-200">{entry.task}</div>
                    <div className="text-xs text-slate-500">{entry.createdAt}</div>
                  </div>
                  <div className="font-mono text-emerald-400">{entry.minutes} min</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
