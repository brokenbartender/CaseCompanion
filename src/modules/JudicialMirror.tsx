import React, { useMemo, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody } from "../components/ui/Card";
import { Gavel } from "lucide-react";

const JUDGES = [
  { id: "mitchell", name: "Hon. Sarah Mitchell", court: "6th Circuit Court", motionsGranted: 62, totalMotions: 100, avgDays: 190 },
  { id: "boyd", name: "Hon. Marcus Boyd", court: "E.D. Michigan", motionsGranted: 48, totalMotions: 90, avgDays: 140 },
  { id: "nguyen", name: "Hon. Lila Nguyen", court: "N.D. California", motionsGranted: 55, totalMotions: 120, avgDays: 210 },
  { id: "chen", name: "Hon. Patricia Chen", court: "S.D. Texas", motionsGranted: 70, totalMotions: 110, avgDays: 160 },
  { id: "garcia", name: "Hon. Tomas Garcia", court: "D. Colorado", motionsGranted: 35, totalMotions: 80, avgDays: 130 }
];

export default function JudicialMirror() {
  const [selectedId, setSelectedId] = useState("mitchell");
  const judge = useMemo(() => JUDGES.find((j) => j.id === selectedId) || JUDGES[0], [selectedId]);
  const grantRate = Math.round((judge.motionsGranted / judge.totalMotions) * 100);
  const nationalAvg = 170;
  const venueDelta = judge.avgDays - nationalAvg;

  return (
    <ModuleLayout
      title="Judicial Mirror"
      subtitle="Predictive rulings based on judge history"
      kpis={[
        { label: "Judge", value: judge.name.split(" ").slice(-1)[0], tone: "neutral" },
        { label: "GrantRate", value: `${grantRate}%`, tone: grantRate >= 60 ? "warn" : "good" },
        { label: "Rules", value: "803(6)", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-t-4 border-t-blue-500">
          <CardBody className="text-center pt-8">
            <Gavel size={48} className="mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl text-slate-200 font-bold">{judge.name}</h2>
            <p className="text-slate-500">{judge.court}</p>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-4 w-full rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
            >
              {JUDGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </CardBody>
        </Card>
        <Card className="col-span-2">
          <CardBody className="space-y-6">
            <div>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Defense Summary Judgment Rate</span>
                <span>{grantRate}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${grantRate}%` }} />
              </div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Venue Speed</span>
                <span>{judge.avgDays} days</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                National avg: {nationalAvg} days • Delta: {venueDelta >= 0 ? `+${venueDelta}` : venueDelta}
              </div>
            </div>
            <p className="text-sm text-slate-400 bg-slate-900 p-4 rounded">
              <strong>Strategy Note:</strong> Judge Mitchell strictly enforces Rule 803(6) on medical records. Ensure
              authentication affidavits are filed 14 days prior.
            </p>
          </CardBody>
        </Card>
      </div>
    </ModuleLayout>
  );
}
