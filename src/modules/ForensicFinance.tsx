import React, { useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import Button from "../components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Upload, AlertTriangle } from "lucide-react";

export default function ForensicFinance() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <ModuleLayout
      title="Forensic Finance"
      subtitle="Asset tracing and fraud detection"
      kpis={[
        { label: "Accounts", value: "3", tone: "neutral" },
        { label: "Flags", value: "2", tone: "warn" },
        { label: "Recovered", value: "$90k", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      {!hasResults ? (
        <Card className="h-96 flex flex-col items-center justify-center border-dashed border-emerald-900/50 bg-emerald-950/5">
          <Upload size={48} className="text-emerald-500 mb-4" />
          <h3 className="text-slate-200 font-medium">Upload Bank Statements</h3>
          <Button className="mt-6 bg-emerald-600 hover:bg-emerald-500" onClick={() => setHasResults(true)}>
            Analyze Cash Flow
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3 grid grid-cols-3 divide-x divide-slate-800 text-center py-6">
            <div>
              <div className="text-slate-500 text-xs uppercase">Inflow</div>
              <div className="text-2xl text-emerald-400 font-mono">+$1.2M</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase">Outflow</div>
              <div className="text-2xl text-rose-400 font-mono">-$1.1M</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase">Discrepancy</div>
              <div className="text-2xl text-amber-400 font-mono">$90k</div>
            </div>
          </Card>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} /> Flagged Transactions
                </CardTitle>
              </CardHeader>
              <CardBody>
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="border-b border-slate-800 text-xs uppercase">
                    <tr>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Desc</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="py-3 font-mono">2025-09-12</td>
                      <td>WIRE TRANSFER - OFFSHORE</td>
                      <td className="text-right text-slate-200 font-mono">$9,500.00</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono">2025-10-01</td>
                      <td>CONSULTING FEE (Round Number)</td>
                      <td className="text-right text-slate-200 font-mono">$50,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
