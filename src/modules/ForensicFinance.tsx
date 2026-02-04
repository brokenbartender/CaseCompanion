import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function ForensicFinance() {
  const [lostWages, setLostWages] = useState("0");
  const [medicalCosts, setMedicalCosts] = useState("0");
  const [businessLoss, setBusinessLoss] = useState("0");
  const total = useMemo(() => {
    const lw = Number(lostWages) || 0;
    const mc = Number(medicalCosts) || 0;
    const bl = Number(businessLoss) || 0;
    return lw + mc + bl;
  }, [lostWages, medicalCosts, businessLoss]);

  return (
    <Page title="Damages Calculator" subtitle="Estimate totals for documentation (informational only).">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Inputs</CardSubtitle>
            <CardTitle>Losses</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Lost wages"
                value={lostWages}
                onChange={(e) => setLostWages(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Medical costs"
                value={medicalCosts}
                onChange={(e) => setMedicalCosts(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Business loss (Broken Arrow Entertainment)"
                value={businessLoss}
                onChange={(e) => setBusinessLoss(e.target.value)}
              />
            </div>
            <div className="mt-4 text-sm text-slate-300">
              Total (for documentation): ${total.toFixed(2)}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
