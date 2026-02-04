import React from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { BookOpen, AlertCircle } from "lucide-react";

export default function EmployerMisconduct() {
  return (
    <ModuleLayout
      title="Employment Law Agent"
      subtitle="Handbook vs. Incident analysis"
      kpis={[
        { label: "Policies", value: "18", tone: "neutral" },
        { label: "Flags", value: "1", tone: "warn" },
        { label: "Compliant", value: "94%", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" /> Policy
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-slate-400 text-sm">
              "Sec 4.2: Employees are entitled to a verbal warning prior to termination..."
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400" /> Incident
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-slate-400 text-sm">Action Taken: Immediate termination via email on 2024-02-14.</p>
          </CardBody>
        </Card>
      </div>
      <div className="mt-6 p-4 bg-rose-950/20 border border-rose-900/50 rounded text-rose-200 text-center">
        VIOLATION DETECTED: Procedural non-compliance (No verbal warning found).
      </div>
    </ModuleLayout>
  );
}
