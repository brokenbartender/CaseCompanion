import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import ExportAction from "../components/ui/ExportAction";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { FileText, Calculator } from "lucide-react";

export default function SettlementDemand() {
  const [step] = useState(1);

  return (
    <ModuleLayout
      title="Settlement Demand Engine"
      subtitle="Calculate damages and draft demand letters"
      kpis={[
        { label: "Total", value: "$623k", tone: "good" },
        { label: "Bills", value: "$178k", tone: "neutral" },
        { label: "Multiplier", value: "3.5x", tone: "warn" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator size={18} className="text-amber-400" /> Damages Calculator
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Medical Specials (Past)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    defaultValue="$42,850.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Medical Specials (Future)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    defaultValue="$120,000.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Lost Wages</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    defaultValue="$15,400.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Pain & Suffering Multiplier</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
                    defaultValue="3.5"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Total Demand Value</span>
                <span className="text-2xl font-bold text-amber-400">$623,875.00</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={18} className="text-slate-400" /> Generated Demand Letter
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="p-4 bg-slate-950 rounded border border-slate-800 text-sm text-slate-400 font-mono leading-relaxed h-64 overflow-y-auto">
                RE: Demand for Settlement - Our Client: John Doe<br />
                <br />
                Dear Claims Adjuster,<br />
                <br />
                This letter serves as a formal demand for settlement regarding the incident on November 12, 2025. As
                detailed in the attached medical chronology, our client sustained a C4-C5 herniation requiring ongoing
                intervention...
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex-1">
                  <ExportAction label="Export PDF" />
                </div>
                <Button variant="secondary" className="flex-1">
                  Edit in Assistant
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
