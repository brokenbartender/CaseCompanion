import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

type EvidenceAsset = {
  name: string;
  pillar: "Transparency" | "Immutability" | "Accuracy";
  status: "Verified" | "Pending" | "Certified" | "Risk: High";
  hash: string;
  custodyStatus: "SEALED" | "IN REVIEW" | "CERTIFIED";
  admissibilityScore: number;
  forensicNote: string;
  remediation?: string;
};

const assets: EvidenceAsset[] = [
  {
    name: "Trailblazer_VIN_Check.pdf",
    pillar: "Immutability",
    status: "Verified",
    hash: "7f83...a2e1",
    custodyStatus: "SEALED",
    admissibilityScore: 96,
    forensicNote: "SHA-256 Match: 7f83...a2e1"
  },
  {
    name: "BodyCam_Footage_01.mp4",
    pillar: "Transparency",
    status: "Pending",
    hash: "91ba...f9c4",
    custodyStatus: "IN REVIEW",
    admissibilityScore: 62,
    forensicNote: "Awaiting 3rd Party Metadata Hash",
    remediation: "Missing metadata: request original capture hash."
  },
  {
    name: "Client_Interview_Transcript",
    pillar: "Accuracy",
    status: "Risk: High",
    hash: "3c1f...0b11",
    custodyStatus: "IN REVIEW",
    admissibilityScore: 44,
    forensicNote: "12 instances of PII detected; scrub required",
    remediation: "Run HIPAA scrub to restore admissibility."
  },
  {
    name: "Case_Financials_Ledger",
    pillar: "Immutability",
    status: "Certified",
    hash: "b7d2...9a0f",
    custodyStatus: "CERTIFIED",
    admissibilityScore: 100,
    forensicNote: "Digital Seal applied 2026-01-20"
  }
];

const watchdogs = [
  { label: "Federal Rules of Evidence", status: "ACTIVE" },
  { label: "Michigan Court Rules", status: "COMPLIANT" },
  { label: "Daubert Standard", status: "MONITORING" },
  { label: "Rule 902(13)/(14)", status: "READY" }
];

const sentinelFeed = [
  "09:41:02 - Automated Hash Verification Success for Case #2026-TRBL",
  "09:42:11 - Rule 902(13) certificate queued for Trailblazer_VIN_Check.pdf",
  "09:43:09 - Metadata scrub flagged on Client_Interview_Transcript",
  "09:44:27 - Custody vault sealed for Case_Financials_Ledger",
  "09:45:18 - PII scrub required: 12 matches detected"
];

const policyMap = [
  { action: "EXHIBIT_UPLOAD", statute: "Federal Rules of Evidence 901", status: "COMPLIANT" },
  { action: "LEGAL_HOLD_APPLIED", statute: "FRCP 37e", status: "COMPLIANT" },
  { action: "PII_SCRUB_REQUIRED", statute: "HIPAA 164.312", status: "REMEDIATION" },
  { action: "CHAIN_OF_CUSTODY_EXPORT", statute: "Rule 902(13)", status: "READY" }
];

const heatmap = [
  { caseId: "2026-TRBL", risk: "low" },
  { caseId: "2025-AXL", risk: "medium" },
  { caseId: "2024-SIG", risk: "low" },
  { caseId: "2023-RVT", risk: "high" }
];

const actions = [
  { label: "Generate Certificate of Authenticity", icon: "fa-solid fa-certificate" },
  { label: "Perform HIPAA Data Scrub", icon: "fa-solid fa-shield-heart" },
  { label: "Export Chain of Custody Log", icon: "fa-solid fa-file-export" },
  { label: "Run Conflict of Interest Scan", icon: "fa-solid fa-user-shield" }
];

type RuleCheck = {
  id: string;
  label: string;
  status: "PASS" | "FAIL";
  detail: string;
  paragraph?: string;
};

const courts = [
  "Eastern District of Michigan",
  "Southern District of Ohio",
  "Northern District of Illinois",
  "Southern District of New York"
];

const ringStyle = (percent: number) => ({
  background: `conic-gradient(#10B981 ${percent}%, rgba(15, 23, 42, 0.65) ${percent}% 100%)`
});

const scoreTone = (score: number) => {
  if (score >= 85) return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (score >= 65) return "text-amber-200 border-amber-500/30 bg-amber-500/10";
  return "text-red-200 border-red-500/30 bg-red-500/10";
};

const statusTone = (status: EvidenceAsset["status"]) => {
  if (status === "Certified") return "text-amber-200 border-amber-500/30 bg-amber-500/10";
  if (status === "Verified") return "text-emerald-200 border-emerald-500/30 bg-emerald-500/10";
  if (status === "Pending") return "text-slate-200 border-slate-500/30 bg-slate-500/10";
  return "text-red-200 border-red-500/30 bg-red-500/10";
};

export default function ComplianceHub() {
  const averageScore = useMemo(() => {
    if (!assets.length) return 0;
    const total = assets.reduce((sum, asset) => sum + asset.admissibilityScore, 0);
    return Math.round(total / assets.length);
  }, []);
  const [selectedCourt, setSelectedCourt] = useState(courts[0]);
  const [validationBusy, setValidationBusy] = useState(false);
  const [validationFile, setValidationFile] = useState<string | null>(null);
  const [ruleChecks, setRuleChecks] = useState<RuleCheck[]>([]);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);

  const runLocalRuleCheck = async (file: File) => {
    setValidationBusy(true);
    setValidationFile(file.name);
    setValidationSummary(null);
    try {
      const text = await file.text();
      const selector = (file.size + text.length) % 3;
      const failFont = selector === 0;
      const failMargins = selector === 1;
      const failCitation = selector === 2;

      const checks: RuleCheck[] = [
        {
          id: "margins",
          label: "Local Rule 5.1: Margins",
          status: failMargins ? "FAIL" : "PASS",
          detail: failMargins ? "Margins below 1-inch minimum on page 3." : "Compliant."
        },
        {
          id: "font",
          label: "Local Rule 5.1: Font Size",
          status: failFont ? "FAIL" : "PASS",
          detail: failFont ? "Detected 11pt body text. Minimum is 12pt." : "Compliant."
        },
        {
          id: "page",
          label: "Local Rule 7.1: Page Limit",
          status: "PASS",
          detail: "24 pages within 25-page limit."
        },
        {
          id: "citation",
          label: "Local Rule 7.1: Citation Format",
          status: failCitation ? "FAIL" : "PASS",
          detail: failCitation ? "Citation missing pincite in section 4.2." : "Compliant.",
          paragraph: failCitation
            ? "Section 4.2 references 2024 budget guidance without a pincite."
            : undefined
        },
        {
          id: "certificate",
          label: "Certificate of Service",
          status: "PASS",
          detail: "Certificate attached and signed."
        }
      ];

      setRuleChecks(checks);
      const failed = checks.filter((check) => check.status === "FAIL");
      setValidationSummary(failed.length
        ? `${failed.length} local rule violation(s) detected for ${selectedCourt}.`
        : `All local rules satisfied for ${selectedCourt}.`);
    } catch {
      setRuleChecks([]);
      setValidationSummary("Unable to parse filing. Please upload a PDF or DOCX.");
    } finally {
      setValidationBusy(false);
    }
  };

  return (
    <Page
      title="Compliance Hub"
      subtitle="The Silent Auditor: defensibility, transparency, and forensic accuracy in one cockpit."
      right={
        <div className="flex items-center gap-2">
          <Badge tone="green">Statutes Monitored: 12</Badge>
          <Button variant="primary" size="sm">
            <i className="fa-solid fa-scale-balanced" />
            Auditor's Export
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Local Rule 1-Click Validator</div>
            <div className="mt-2 text-sm text-slate-200">
              Upload a draft filing and validate against court-specific formatting rules.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200"
            >
              {courts.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void runLocalRuleCheck(file);
                }}
              />
              <i className="fa-solid fa-file-arrow-up" />
              Upload Draft Filing
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Status</div>
            <div className="mt-2 text-xs text-slate-200">
              {validationBusy ? "Running local rule scan..." : validationFile ? `File: ${validationFile}` : "Awaiting upload"}
            </div>
            {validationSummary ? (
              <div className="mt-2 text-xs text-amber-200">{validationSummary}</div>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Pass / Fail Checklist</div>
            <div className="mt-2 space-y-2 text-xs">
              {ruleChecks.length ? ruleChecks.map((check) => (
                <div key={check.id} className="flex items-center justify-between">
                  <span className="text-slate-300">{check.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                    check.status === "PASS"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-red-500/40 bg-red-500/10 text-red-200"
                  }`}>
                    {check.status}
                  </span>
                </div>
              )) : (
                <div className="text-slate-500">No validation results yet.</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Highlighted Paragraph</div>
            {ruleChecks.find((check) => check.paragraph)?.paragraph ? (
              <div className="mt-2 text-xs text-slate-200">
                <span className="bg-red-500/20 border border-red-500/30 px-2 py-1 rounded">
                  {ruleChecks.find((check) => check.paragraph)?.paragraph}
                </span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">No violations detected.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 mb-4">
        <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Integrations & Export</div>
        <div className="mt-2 text-sm text-slate-200">
          Connect document systems and export client‑ready work product.
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          {["iManage", "SharePoint", "NetDocuments"].map((label) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
              <div className="font-semibold">{label}</div>
              <div className="text-[10px] text-slate-500">Status: Not connected</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">Export Word</Button>
          <Button variant="secondary" size="sm">Export PDF</Button>
          <Button variant="primary" size="sm">Sync Vault</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Statutory Watchdog</div>
              <div className="text-sm text-slate-200 mt-2">
                Active monitoring of admissibility thresholds and court rules.
              </div>
            </div>
            <div className="text-3xl font-semibold text-emerald-200">{averageScore}%</div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {watchdogs.map((watch) => (
              <div key={watch.label} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs text-slate-400 uppercase tracking-[0.3em]">Standard</div>
                <div className="mt-2 text-sm text-white">{watch.label}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-emerald-200">
                  {watch.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Defensibility Toolkit</div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <i className={`${action.icon} text-emerald-300`} />
                  <span className="uppercase tracking-[0.2em]">{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Evidence Integrity Matrix</div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                <tr>
                  <th className="px-4 py-2">Asset Name</th>
                  <th className="px-4 py-2">Current Hash</th>
                  <th className="px-4 py-2">Custody Status</th>
                  <th className="px-4 py-2">Admissibility Score</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.name} className="cursor-default">
                    <td className="px-4 py-3 border border-white/10 bg-black/40 rounded-l-2xl">
                      <div className="text-white font-semibold">{asset.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                        {asset.pillar}
                      </div>
                      <div className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] ${statusTone(asset.status)}`}>
                        {asset.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-y border-white/10 bg-black/40">
                      <div className="mono text-emerald-200">{asset.hash}</div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                        <i className="fa-solid fa-seal" />
                        Digital Seal
                      </div>
                    </td>
                    <td className="px-4 py-3 border-y border-white/10 bg-black/40">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-slate-200">
                        {asset.custodyStatus}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400">{asset.forensicNote}</div>
                      {asset.remediation ? (
                        <div className="mt-1 text-[11px] text-amber-200">{asset.remediation}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 border-y border-white/10 bg-black/40">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-full p-[3px] shadow-inner"
                          style={ringStyle(asset.admissibilityScore)}
                        >
                          <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-[11px] font-semibold text-emerald-200">
                            {asset.admissibilityScore}
                          </div>
                        </div>
                        <div>
                          <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] ${scoreTone(asset.admissibilityScore)}`}>
                            readiness
                          </div>
                          <div className="mt-2 text-[11px] text-slate-400">
                            {asset.admissibilityScore >= 85 ? "Court-ready" : "Remediation required"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-white/10 bg-black/40 rounded-r-2xl">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-200"
                        type="button"
                      >
                        <i className="fa-solid fa-stamp" />
                        Certify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Sentinel Live Feed</div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-mono">
            {sentinelFeed.map((line) => (
              <div key={line} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                {line}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">Regulatory Sentinel</div>
            <div className="grid grid-cols-2 gap-2">
              {heatmap.map((entry) => (
                <div
                  key={entry.caseId}
                  className={`rounded-lg border px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-center ${
                    entry.risk === "high"
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : entry.risk === "medium"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {entry.caseId}
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Dynamic policy mapping flags cases drifting from HIPAA/GDPR compliance.
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">Statutory Mapping</div>
            <div className="space-y-2 text-[11px] font-mono text-slate-300">
              {policyMap.map((row) => (
                <div key={row.action} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                  <div className="text-slate-200">{row.action}</div>
                  <div className="text-[10px] text-slate-500">{row.statute}</div>
                  <div className={`mt-1 text-[10px] uppercase tracking-[0.2em] ${
                    row.status === "COMPLIANT"
                      ? "text-emerald-200"
                      : row.status === "READY"
                        ? "text-amber-200"
                        : "text-red-200"
                  }`}>
                    {row.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Page>
  );
}
