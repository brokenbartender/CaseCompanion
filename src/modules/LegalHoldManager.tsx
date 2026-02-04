import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Shield } from "lucide-react";

interface Hold {
  id: string;
  matter: string;
  status: "active" | "released";
}

export default function LegalHoldManager() {
  const [holds, setHolds] = useState<Hold[]>([
    { id: "LH-001", matter: "M-2024-001", status: "active" }
  ]);

  const release = (id: string) => {
    setHolds((prev) => prev.map((h) => (h.id === id ? { ...h, status: "released" } : h)));
  };

  return (
    <Page title="Legal Holds" subtitle="Retention controls and litigation holds">
      <Card>
        <CardHeader><CardTitle>Active Holds</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {holds.map((hold) => (
            <div key={hold.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
              <div>
                <div className="text-slate-200">{hold.id}</div>
                <div className="text-xs text-slate-500">Matter: {hold.matter}</div>
              </div>
              {hold.status === "active" ? (
                <Button variant="secondary" onClick={() => release(hold.id)}>Release Hold</Button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-xs"><Shield size={14}/> Released</div>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
