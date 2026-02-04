import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody } from "../components/ui/Card";
import { Clock } from "lucide-react";

export default function TimelineView() {
  return (
    <ModuleLayout
      title="Master Timeline"
      subtitle="Chronological visualization of all extracted facts"
      kpis={[
        { label: "Events", value: "42", tone: "neutral" },
        { label: "Critical", value: "6", tone: "warn" },
        { label: "Verified", value: "29", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="relative border-l-2 border-slate-800 ml-6 space-y-12">
        {[
          {
            time: "Oct 31, 2023 - 23:00",
            title: "Pre-Incident Activity",
            desc: "Defendant posts on social media from 'The Rusty Anchor' bar.",
            type: "context"
          },
          {
            time: "Nov 01, 2023 - 21:30",
            title: "The Incident",
            desc: "Collision occurs at Main & 4th. Airbags deploy.",
            type: "critical"
          },
          {
            time: "Nov 01, 2023 - 21:45",
            title: "Police Arrival",
            desc: "Officer Miller arrives on scene. Notes skid marks.",
            type: "official"
          }
        ].map((event, i) => (
          <div key={i} className="relative pl-8">
            <div
              className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 ${
                event.type === "critical" ? "bg-red-500" : "bg-blue-500"
              }`}
            />
            <Card className="max-w-2xl">
              <CardBody>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-mono">
                  <Clock size={12} /> {event.time}
                </div>
                <h3 className="text-lg font-medium text-slate-200">{event.title}</h3>
                <p className="text-slate-400 mt-2 text-sm">{event.desc}</p>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </ModuleLayout>
  );
}
