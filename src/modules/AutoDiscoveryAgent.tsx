import React, { useMemo, useState } from "react";
import ModuleLayout from "../components/ui/ModuleLayout";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FileText, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { logForensicEvent } from "../services/forensicLogger";

type DiscoveryHit = {
  id: string;
  subject: string;
  from: string;
  to: string;
  excerpt: string;
  relevance: number;
};

const MOCK_HITS: DiscoveryHit[] = [
  {
    id: "DOC-118",
    subject: "Internal Memo: Sensor QA failures",
    from: "alex@lawfirm.com",
    to: "ops@clientco.com",
    excerpt: "CONFIDENTIAL: Contains explicit discussion of sensor testing failures and timeline gaps.",
    relevance: 98
  },
  {
    id: "DOC-221",
    subject: "Counsel strategy email",
    from: "partner@lawfirm.com",
    to: "associate@lawfirm.com",
    excerpt: "Legal strategy and impressions about liability exposure; guarantee language flagged.",
    relevance: 91
  },
  {
    id: "DOC-305",
    subject: "Vendor contract amendment",
    from: "procurement@clientco.com",
    to: "legal@clientco.com",
    excerpt: "Contract changes addressing warranty carve-outs and wire transfer approvals.",
    relevance: 74
  }
];

const FIRM_DOMAIN = "lawfirm.com";

const isPrivileged = (hit: DiscoveryHit) => {
  const sender = hit.from.toLowerCase();
  const recipient = hit.to.toLowerCase();
  return sender.endsWith(`@${FIRM_DOMAIN}`) || recipient.endsWith(`@${FIRM_DOMAIN}`);
};

const riskScore = (hit: DiscoveryHit) => {
  let score = 0;
  const text = `${hit.subject} ${hit.excerpt}`.toLowerCase();
  if (text.includes("confidential")) score += 20;
  if (text.includes("wire transfer")) score += 30;
  if (text.includes("guarantee")) score += 50;
  return Math.min(100, score);
};

export default function AutoDiscoveryAgent() {
  const [searching, setSearching] = useState(false);
  const [hidePrivileged, setHidePrivileged] = useState(false);
  const { role } = useUser();
  const isClient = role === "Client";

  const privilegeLog = useMemo(() => {
    if (!searching) return [] as Array<{ id: string; subject: string; reason: string }>;
    return MOCK_HITS.filter(isPrivileged).map((hit) => ({
      id: hit.id,
      subject: hit.subject,
      reason: "Attorney-Client Privilege"
    }));
  }, [searching]);

  const visibleHits = useMemo(() => {
    if (!searching) return [];
    if (!hidePrivileged) return MOCK_HITS;
    return MOCK_HITS.filter((hit) => !isPrivileged(hit));
  }, [searching, hidePrivileged]);

  const exportPrivilegeLog = () => {
    if (!privilegeLog.length) return;
    const header = "DocID,Subject,Privilege Type\n";
    const rows = privilegeLog
      .map((entry) => `${entry.id},"${entry.subject.replace(/\"/g, '""')}",${entry.reason}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privilege-log.csv";
    a.click();
    URL.revokeObjectURL(url);
    logForensicEvent("privilege.log.exported", { count: privilegeLog.length });
  };

  if (isClient) {
    return (
      <ModuleLayout
        title="Auto-Discovery Agent"
        subtitle="AI responsiveness review and privilege logging"
        kpis={[
          { label: "Docs", value: "248", tone: "neutral" },
          { label: "Hits", value: "12", tone: "warn" },
          { label: "Reviewed", value: "60%", tone: "good" }
        ]}
        lastUpdated="2026-02-03"
      >
        <Card className="border border-rose-500/30 bg-rose-500/10">
          <CardBody>
            <div className="text-xs uppercase tracking-[0.3em] text-rose-200">Unauthorized</div>
            <div className="mt-2 text-sm text-rose-100">
              Client role cannot access Privilege Log or discovery review tools.
            </div>
          </CardBody>
        </Card>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Auto-Discovery Agent"
      subtitle="AI responsiveness review and privilege logging"
      kpis={[
        { label: "Docs", value: "248", tone: "neutral" },
        { label: "Hits", value: "12", tone: "warn" },
        { label: "Reviewed", value: "60%", tone: "good" }
      ]}
      lastUpdated="2026-02-03"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Search concept (e.g. 'Evidence of knowledge regarding sensor failure')..."
            className="flex-1 min-w-[260px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200"
          />
          <Button variant="primary" onClick={() => setSearching(true)} className="bg-purple-600 hover:bg-purple-500">
            Run Agent
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setHidePrivileged((prev) => !prev);
            }}
          >
            {hidePrivileged ? "Show Privileged" : "Hide Privileged"}
          </Button>
        </div>
        {searching && (
          <div className="space-y-6">
            <div className="space-y-4">
              {visibleHits.map((hit) => {
                const privileged = isPrivileged(hit);
                const score = riskScore(hit);
                return (
                  <Card key={hit.id}>
                    <CardBody className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="bg-slate-800 p-3 rounded h-fit">
                          <FileText className="text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-slate-200 font-medium">{hit.subject}</h4>
                          <p className="text-slate-400 text-sm mt-1">
                            Relevance Score: <span className="text-emerald-400 font-bold">{hit.relevance}%</span>
                          </p>
                          <p className="text-slate-500 text-xs mt-2">{hit.excerpt}</p>
                          <div className="mt-3 text-xs text-slate-500 font-mono">
                            {hit.from} {"->"} {hit.to}
                          </div>
                          <div className="mt-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Risk Thermometer
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${score >= 70 ? "bg-rose-500" : score >= 40 ? "bg-amber-400" : "bg-emerald-500"}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">{score}/100</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {privileged ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                            <ShieldAlert size={12} /> Privileged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                            <CheckCircle2 size={12} /> Responsive
                          </span>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
            <Card className="border border-amber-500/30 bg-amber-500/5">
              <CardBody>
                <div className="text-xs uppercase tracking-widest text-amber-200">Privilege Log (CSV-ready)</div>
                <div className="mt-3 space-y-2 text-xs text-amber-100">
                  {privilegeLog.length === 0 ? (
                    <div className="text-amber-200/80">No privileged documents detected.</div>
                  ) : (
                    privilegeLog.map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-3">
                        <span className="font-mono">{entry.id}</span>
                        <span className="flex-1">{entry.subject}</span>
                        <span>{entry.reason}</span>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="secondary" className="mt-4" onClick={exportPrivilegeLog}>
                  Export Priv Log
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
