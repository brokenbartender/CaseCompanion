import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const seedAssets = [
  { id: "RULE-12", type: "Rule", status: "pending", owner: "J. Patel" },
  { id: "FACTOR-07", type: "Factor", status: "needs-review", owner: "A. Lee" },
  { id: "GRAPH-02", type: "Norm Graph", status: "approved", owner: "S. Chen" }
];

export default function ReasoningAssetReview() {
  const [assets, setAssets] = useState(seedAssets);

  const approve = (id: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status: "approved" } : a)));
  };

  return (
    <Page title="Reasoning Asset Review" subtitle="QC for rules, factors, and norm graphs">
      <Card>
        <CardHeader><CardTitle>Review Queue</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-300">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <div className="text-slate-100 font-semibold">{asset.id}</div>
                <div className="text-xs text-slate-500">{asset.type} • Owner {asset.owner}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-300">{asset.status}</span>
                <Button variant="secondary" onClick={() => approve(asset.id)}>Approve</Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
}
