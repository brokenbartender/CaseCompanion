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
  const [caseType, setCaseType] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [needsPraecipe, setNeedsPraecipe] = useState(false);

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
              <div className="text-xs text-slate-400 mt-2">Case type (for e‑file eligibility)</div>
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                <option value="">Select case type</option>
                <option value="civil-tort">Civil tort / personal injury</option>
                <option value="contract">Contract</option>
                <option value="small-claims">Small claims</option>
                <option value="other">Other</option>
              </select>
              {caseType === "small-claims" ? (
                <div className="text-xs text-amber-200">
                  This case type may not be eligible for e‑filing. Do not proceed until confirmed with the clerk.
                </div>
              ) : null}
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
              className={`mt-4 inline-flex rounded-md px-3 py-2 text-xs font-semibold ${
                caseType === "small-claims"
                  ? "bg-slate-700 text-slate-400 pointer-events-none"
                  : "bg-amber-500 text-slate-900"
              }`}
            >
              Open Filing Checklist
            </a>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Praecipe Gate</CardSubtitle>
            <CardTitle>Do You Need a Praecipe?</CardTitle>
          </CardHeader>
          <CardBody>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={needsPraecipe}
                onChange={(e) => setNeedsPraecipe(e.target.checked)}
              />
              This filing requires a praecipe
            </label>
            {needsPraecipe ? (
              <div className="mt-3 text-sm text-slate-300">
                Use the county’s ePraecipe system when required. Confirm with the clerk if you’re unsure.
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href="https://www.oakgov.com/government/clerk-register-of-deeds/court-records/efiling"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-amber-400/50 px-3 py-2 text-xs font-semibold text-amber-200"
                  >
                    Oakland County eFiling Info
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-400">If you’re not sure, ask the clerk before filing.</div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Rejected Filing</CardSubtitle>
            <CardTitle>Fix Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              >
                <option value="">Select rejection reason</option>
                <option value="bundled">Bundled PDFs</option>
                <option value="wrong-code">Wrong filing code</option>
                <option value="missing-proof">Missing proof of service</option>
                <option value="wrong-court">Wrong court selected</option>
              </select>
              {rejectionReason ? (
                <div className="text-sm text-slate-300">
                  Fix steps:
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    <li>Correct the issue and re‑export each PDF separately.</li>
                    <li>Re‑submit in MiFILE with the correct labels.</li>
                    <li>Confirm the court and filing code before submitting.</li>
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Choose a reason to see fixes.</div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
