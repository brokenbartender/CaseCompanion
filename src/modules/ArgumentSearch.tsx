import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const sampleResults = [
  {
    id: "ARG-001",
    claim: "Non-compete restrictions are unenforceable when they prevent an employee from earning a livelihood.",
    authority: "CA Business & Professions Code § 16600",
    jurisdiction: "CA",
    posture: "Summary judgment",
    excerpt: "...every contract by which anyone is restrained from engaging in a lawful profession... is to that extent void.",
    matchNotes: "Applies to employee role, post-termination restraint, statewide coverage.",
    confidence: "High"
  },
  {
    id: "ARG-002",
    claim: "Non-compete clauses may be enforced if narrowly tailored to protect trade secrets.",
    authority: "MI MCL 445.774a",
    jurisdiction: "MI",
    posture: "Preliminary injunction",
    excerpt: "...agreement is reasonable as to duration, geographical area, and type of employment...",
    matchNotes: "Employee had access to confidential client lists; duration 12 months.",
    confidence: "Medium"
  }
];

export default function ArgumentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(sampleResults);

  return (
    <Page title="Conceptual Search" subtitle="Argument retrieval over legal concepts">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Query & Filters</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm text-slate-300">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Legal Issue</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Non-compete enforceability for departing sales exec"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Element</label>
                <input className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Reasonableness" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Party Role</label>
                <input className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Employee" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Jurisdiction</label>
                <input className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="CA, MI" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Posture</label>
                <input className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Summary judgment" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Time Window</label>
              <input className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="2018-2025" />
            </div>
            <Button onClick={() => setResults(sampleResults)} className="w-full">Run Conceptual Search</Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Argument Cards</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {results.map((result) => (
              <div key={result.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100 font-semibold">{result.claim}</div>
                  <span className="text-xs text-emerald-300">{result.confidence}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Authority: {result.authority}</div>
                <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                  “{result.excerpt}”
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Match Notes: {result.matchNotes}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <span>{result.jurisdiction}</span>
                  <span>•</span>
                  <span>{result.posture}</span>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-300">
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">3-Ply Argument Draft</div>
              <div className="mt-2"><span className="font-semibold text-slate-100">Analogize:</span> Facts align with ABC v. Smith on proprietary client lists and NDA access.</div>
              <div className="mt-2"><span className="font-semibold text-slate-100">Distinguish:</span> Opposing case Northwind lacked evidence of confidential access.</div>
              <div className="mt-2"><span className="font-semibold text-slate-100">Rebut:</span> Even under narrowed scrutiny, the restraint is limited and justified by trade secret protection.</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
