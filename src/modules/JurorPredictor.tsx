import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Users } from "lucide-react";

export default function JurorPredictor() {
  return (
    <ModuleLayout
      title="Juror Predictor"
      subtitle="Voir Dire strategy and bias analysis"
      kpis={[
        { label: "Panel", value: "24", tone: "neutral" },
        { label: "High Bias", value: "3", tone: "warn" },
        { label: "Safe", value: "11", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-blue-400" size={20} /> Venire Analysis
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-slate-400">Enter juror demographic data to predict favorability.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-800 rounded bg-slate-900">
                  <div className="text-lg font-semibold text-slate-200">Juror #4</div>
                  <div className="text-xs text-slate-500">Engineer, 45, Married</div>
                  <div className="mt-2 text-emerald-400 text-sm">Favorability: 85% (Logical appeals)</div>
                </div>
                <div className="p-4 border border-slate-800 rounded bg-slate-900">
                  <div className="text-lg font-semibold text-slate-200">Juror #9</div>
                  <div className="text-xs text-slate-500">Teacher, 32, Single</div>
                  <div className="mt-2 text-rose-400 text-sm">Favorability: 20% (High empathy for plaintiff)</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
