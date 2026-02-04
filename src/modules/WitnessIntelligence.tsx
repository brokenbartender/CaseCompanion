import React, { useMemo } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody } from "../components/ui/Card";
import { User, FileText, AlertTriangle } from "lucide-react";

export default function WitnessIntelligence() {
  const impeachableOffenses = [
    "Prior Perjury (2019)",
    "Contradictory Statement on 12/05"
  ];
  const credibilityScore = useMemo(() => {
    const penalty = impeachableOffenses.length * 15;
    return Math.max(0, 100 - penalty);
  }, [impeachableOffenses.length]);

  const issueFactLinks = [
    {
      fact: "Vehicle color observed as red sedan.",
      issue: "Identification",
      witness: "Sarah Jones"
    },
    {
      fact: "Driver left scene without stopping.",
      issue: "Negligence",
      witness: "Sarah Jones"
    }
  ];

  return (
    <Page title="Witness Intelligence" subtitle="Profiles, credibility analysis, and statement tracking">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="h-24 bg-gradient-to-r from-blue-600 to-slate-900" />
          <CardBody className="-mt-12">
            <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center border-4 border-slate-900 mb-4">
              <User size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Sarah Jones</h3>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Eyewitness</span>
            <p className="text-slate-400 text-sm mt-4">
              Located at SE corner. Provided statement on scene. Clear line of sight.
            </p>
            <div className="mt-4 rounded border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Credibility Score</span>
                <span className={`font-mono ${credibilityScore >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                  {credibilityScore}%
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                -{impeachableOffenses.length * 15}% for impeachable offenses
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 text-sm space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText size={14} /> Statement Verified
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <AlertTriangle size={14} /> No Prior Record
              </div>
            </div>
            <div className="mt-4 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
              <div className="text-[10px] uppercase tracking-[0.3em] text-rose-200">Impeachable Offenses</div>
              <ul className="mt-2 space-y-1">
                {impeachableOffenses.map((offense) => (
                  <li key={offense}>{offense}</li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
        <Card className="md:col-span-2 lg:col-span-2">
          <CardBody>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Issue-Fact Graph</div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {issueFactLinks.map((link, idx) => (
                <div key={idx} className="rounded border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-slate-400 text-xs">Fact</div>
                  <div className="text-slate-200">{link.fact}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-blue-500/10 px-2 py-1 text-blue-300">Issue: {link.issue}</span>
                    <span className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">
                      Witness: {link.witness}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
