import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { logForensicEvent } from "../services/forensicLogger";

const KNOWN_PARTIES = ["Acme Corp", "Broken Arrow Entertainment", "Northwind LLC"];

export default function ConflictCheck() {
  const [party, setParty] = useState("");
  const [result, setResult] = useState<"clear" | "conflict" | null>(null);

  const runCheck = () => {
    if (!party.trim()) return;
    const hit = KNOWN_PARTIES.some((p) => p.toLowerCase().includes(party.toLowerCase().trim()));
    setResult(hit ? "conflict" : "clear");
    logForensicEvent("conflict.check", { query: party.trim(), result: hit ? "conflict" : "clear" });
  };

  return (
    <Page title="Conflict Check" subtitle="Screen parties before engagement">
      <Card>
        <CardHeader><CardTitle>Party Search</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <input value={party} onChange={(e) => setParty(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-slate-100" placeholder="Company or individual name" />
          <Button onClick={runCheck}>Run Conflict Check</Button>

          {result === "clear" && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle size={16}/> No conflicts found.</div>
          )}
          {result === "conflict" && (
            <div className="flex items-center gap-2 text-rose-400 text-sm"><ShieldAlert size={16}/> Potential conflict detected. Review matter history.</div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
