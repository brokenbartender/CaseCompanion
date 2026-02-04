import React, { useMemo } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

const TIMELINE_KEY = "case_companion_timeline_v1";

type TimelineEvent = { date: string; title: string; note: string; evidence?: string[] };

export default function CivilLeverage() {
  const events = readJson<TimelineEvent[]>(TIMELINE_KEY, []);
  const incidentDates = useMemo(() => {
    const dates = events.map((e) => e.date).filter(Boolean);
    return Array.from(new Set(dates));
  }, [events]);

  const conflict = incidentDates.length > 1;

  return (
    <Page title="Civil Leverage" subtitle="Timeline consistency check (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Consistency</CardSubtitle>
            <CardTitle>Incident Date Check</CardTitle>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <div className="text-sm text-slate-400">No timeline events found.</div>
            ) : (
              <div className="text-sm text-slate-300">
                Unique dates found: {incidentDates.join(", ")}
              </div>
            )}
            {conflict ? (
              <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                Date conflict detected. Review timeline entries for inconsistent dates.
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
