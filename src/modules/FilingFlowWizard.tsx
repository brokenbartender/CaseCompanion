import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const SETTINGS_KEY = "case_companion_settings_v1";

type CaseSettings = {
  caseName: string;
  court: string;
  judge: string;
  caseNumber: string;
  jurisdiction: string;
};

export default function FilingFlowWizard() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, {
    caseName: "",
    court: "",
    judge: "",
    caseNumber: "",
    jurisdiction: "Oakland County, MI"
  });
  const [court, setCourt] = useState(settings.court || "");
  const [claimAmount, setClaimAmount] = useState("");

  function saveCourt(next: string) {
    setCourt(next);
    writeJson(SETTINGS_KEY, { ...settings, court: next });
  }

  return (
    <Page title="Filing Flow" subtitle="Choose your court and prep MiFILE steps.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Step 1</CardSubtitle>
            <CardTitle>Court Selection</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="text-xs text-slate-400">Estimated claim amount (optional)</div>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="$ Amount"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
              />
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="court"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={court === "52nd District Court (<= $25,000)"}
                  onChange={() => saveCourt("52nd District Court (<= $25,000)")}
                />
                <span>52nd District Court (claims up to $25,000)</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="court"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={court === "6th Circuit Court (> $25,000)"}
                  onChange={() => saveCourt("6th Circuit Court (> $25,000)")}
                />
                <span>6th Circuit Court (claims above $25,000)</span>
              </label>
              <div className="text-xs text-slate-400">
                This app does not provide legal advice. Confirm limits with court rules.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Step 2</CardSubtitle>
            <CardTitle>MiFILE Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Create a MiFILE account as a pro se filer.</li>
              <li>Select the correct Oakland County court.</li>
              <li>Prepare each filing as its own PDF (Complaint, Summons, MC 20/MC 97 if needed).</li>
              <li>Initiate a new case, upload each PDF separately, and pay or request fee waiver.</li>
              <li>Save stamped copies for service of process.</li>
            </ul>
            <a
              href="/filing"
              className="mt-4 inline-flex rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Open Filing Checklist
            </a>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
