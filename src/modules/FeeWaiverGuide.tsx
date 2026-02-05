import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";

export default function FeeWaiverGuide() {
  const [receivesAid, setReceivesAid] = useState<"yes" | "no" | "unsure">("unsure");

  return (
    <Page title="Fee Waiver Guide" subtitle="Decide if you should file MC 20.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Step 1</CardSubtitle>
            <CardTitle>Do you receive public assistance?</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="flex items-start gap-2">
                <input type="radio" className="mt-1 h-4 w-4 accent-amber-400" checked={receivesAid === "yes"} onChange={() => setReceivesAid("yes")} />
                <span>Yes — I receive means‑tested public assistance</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" className="mt-1 h-4 w-4 accent-amber-400" checked={receivesAid === "no"} onChange={() => setReceivesAid("no")} />
                <span>No — I do not receive assistance</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" className="mt-1 h-4 w-4 accent-amber-400" checked={receivesAid === "unsure"} onChange={() => setReceivesAid("unsure")} />
                <span>Not sure</span>
              </label>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Step 2</CardSubtitle>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardBody>
            {receivesAid === "yes" ? (
              <div className="text-sm text-slate-300">
                File MC 20 and attach proof of assistance. Submit it electronically with your filings.
              </div>
            ) : receivesAid === "no" ? (
              <div className="text-sm text-slate-300">
                You can still request a fee waiver based on income. Be ready to provide income details.
              </div>
            ) : (
              <div className="text-sm text-slate-300">
                Gather benefit or income information first, then decide whether to file MC 20.
              </div>
            )}
            <div className="mt-3 text-xs text-slate-400">
              This is informational only. Confirm eligibility under court rules.
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Rule</CardSubtitle>
            <CardTitle>MCR 2.002 (Fee Waiver)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Fee waivers are governed by MCR 2.002. Use the official rule text to confirm eligibility and required
              submissions.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
