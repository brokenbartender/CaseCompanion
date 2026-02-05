import React, { useMemo } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

type TimelineEvent = { date: string; title: string; note: string; evidence: string[]; proof?: string };

export default function AutoChronology() {
  const events = readJson<TimelineEvent[]>("case_companion_timeline_v1", []);
  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events]);

  function exportChronology() {
    const lines = [
      "CaseCompanion Auto‑Chronology",
      "",
      ...sorted.map((event) => {
        const evidence = event.evidence?.length ? `Evidence: ${event.evidence.join(", ")}` : "Evidence: none";
        const proof = event.proof ? `Proof: ${event.proof}` : "";
        return `${event.date || "TBD"} — ${event.title}\n${event.note || ""}\n${evidence}\n${proof}\n`;
      })
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auto_chronology.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title="Auto Chronology" subtitle="Sorted timeline export.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Export</CardSubtitle>
            <CardTitle>Chronology Bundle</CardTitle>
          </CardHeader>
          <CardBody>
            <button
              type="button"
              onClick={exportChronology}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Export Chronology
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Timeline</CardSubtitle>
            <CardTitle>Events</CardTitle>
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
                    {event.note ? <div className="text-xs text-slate-400">{event.note}</div> : null}
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
