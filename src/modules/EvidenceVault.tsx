import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_CATEGORIES, EVIDENCE_INDEX } from "../data/evidenceIndex";
import { MICHIGAN_OBJECTION_CARDS } from "../data/michiganEvidenceObjections";
import { readJson, writeJson } from "../utils/localStore";
import { uploadExhibit } from "../services/apiClient";
import { useLocation } from "react-router-dom";
import JSZip from "jszip";

const META_KEY = "case_companion_evidence_meta_v1";
const SETTINGS_KEY = "case_companion_settings_v1";
const PACKET_LAYOUT_KEY = "case_companion_packet_layout_v1";
const PACKET_OUTPUTS_KEY = "case_companion_packet_outputs_v1";
const PACKET_LAYOUT_OVERRIDE_KEY = "case_companion_packet_layout_override_v1";
const PREFILE_AUDIT_KEY = "case_companion_prefile_audit_v1";
const TIMELINE_KEY = "case_companion_timeline_v1";
const DAMAGES_KEY = "case_companion_damages_v1";
const MEDICAL_KEY = "case_companion_medical_items_v1";
const WAGE_LOSS_KEY = "case_companion_wage_loss_v1";
const WAGE_THEFT_KEY = "case_companion_wage_theft_v1";
const WC_BENEFITS_KEY = "case_companion_wc_benefits_v1";

type EvidenceMeta = { tags: string[]; status: "new" | "reviewed" | "linked" };

type MetaState = Record<string, EvidenceMeta>;

type CaseSettings = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

const PACKET_SECTION_KEYWORDS: Record<string, string[]> = {
  incident: ["incident", "assault", "police", "report", "witness", "statement"],
  medical: ["medical", "er", "hospital", "trinity", "injury", "bill", "diagnosis"],
  negligence: ["negligence", "employer", "safety", "miosha", "protocol", "training"],
  retaliation: ["retaliation", "termination", "wage complaint", "mdcr", "discrimination"],
  "wage-theft": ["wage", "pay", "payroll", "stub", "hours", "salary", "uia"],
  "workers-comp": ["workers", "comp", "wc", "compensation", "mediation"],
  misconduct: ["threat", "surveillance", "hostile", "misconduct", "mlcc"]
};

const AUTO_TAG_KEYWORDS: Record<string, string[]> = {
  medical: ["medical", "er", "hospital", "injury", "bill", "diagnosis", "trinity"],
  police: ["police", "report", "incident", "assault"],
  witness: ["witness", "statement", "victim", "testimony"],
  wage: ["wage", "pay", "payroll", "salary", "uia", "termination"],
  retaliation: ["retaliation", "termination", "complaint", "discrimination"],
  workers_comp: ["workers", "comp", "wc", "mediation"],
  timeline: ["timeline", "summary", "sequence", "chronology"]
};

function defaultMeta(): EvidenceMeta {
  return { tags: [], status: "new" };
}

export default function EvidenceVault() {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlight = query.get("highlight") || "";
  const [meta, setMeta] = useState<MetaState>(() => readJson(META_KEY, {}));
  const [trialMode, setTrialMode] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [filter, setFilter] = useState<string>(highlight);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [statusLookupId, setStatusLookupId] = useState("");
  const [statusResult, setStatusResult] = useState<string>("");
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const packetLayout = readJson<Record<string, boolean>>(PACKET_LAYOUT_KEY, {});
  const packetLayoutOverrides = readJson<Record<string, boolean>>(PACKET_LAYOUT_OVERRIDE_KEY, {});
  const packetOutputs = readJson<Record<string, boolean>>(PACKET_OUTPUTS_KEY, {});
  const preFileAudit = readJson<Record<string, boolean>>(PREFILE_AUDIT_KEY, {});
  const timeline = readJson<any[]>(TIMELINE_KEY, []);
  const damages = readJson<any[]>(DAMAGES_KEY, []);
  const medicalItems = readJson<any[]>(MEDICAL_KEY, []);
  const wageLoss = readJson<any>(WAGE_LOSS_KEY, {});
  const wageTheft = readJson<any>(WAGE_THEFT_KEY, {});
  const wcBenefits = readJson<any>(WC_BENEFITS_KEY, {});
  const damagesSummary = readJson<string>("case_companion_damages_summary_v1", "");

  function autoCompletePacketLayoutWith(metaState: MetaState) {
    const existing = readJson<Record<string, boolean>>(PACKET_LAYOUT_KEY, {});
    const overrides = readJson<Record<string, boolean>>(PACKET_LAYOUT_OVERRIDE_KEY, {});
    const next: Record<string, boolean> = { ...existing };
    for (const [sectionId, keywords] of Object.entries(PACKET_SECTION_KEYWORDS)) {
      if (typeof overrides[sectionId] === "boolean") {
        next[sectionId] = overrides[sectionId];
        continue;
      }
      const matched = combinedIndex.some((item) => {
        const metaTags = (metaState[item.path]?.tags || []).map((tag) => tag.toLowerCase());
        const status = metaState[item.path]?.status || "";
        if (status === "linked") return true;
        const haystack = [
          item.name,
          item.path,
          item.category,
          ...metaTags
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword));
      });
      if (matched) next[sectionId] = true;
    }
    writeJson(PACKET_LAYOUT_KEY, next);
  }

  function autoCompletePacketOutputs() {
    const existing = readJson<Record<string, boolean>>(PACKET_OUTPUTS_KEY, {});
    const next: Record<string, boolean> = { ...existing };
    const hasMasterTimeline = timeline.some((event: any) => event.track === "master");
    const hasRetaliation = timeline.some((event: any) => event.track === "retaliation");
    const hasTermination = timeline.some((event: any) => event.track === "termination");
    const hasDamages = damages.length > 0;
    const hasMedical = medicalItems.length > 0;
    const hasWageLoss = Number(wageLoss?.aww) > 0 && Number(wageLoss?.weeks) > 0;
    const hasWageTheft = Number(wageTheft?.unpaidHours) > 0 || Number(wageTheft?.missingPayPeriods) > 0;
    const hasWC = Number(wcBenefits?.rate) > 0 && Number(wcBenefits?.weeks) > 0;

    if (combinedIndex.length) {
      next["evidence-index"] = true;
      next["case-summary"] = true;
      next["key-facts"] = true;
    }
    if (hasMasterTimeline) next["master-timeline"] = true;
    if (hasRetaliation) next["retaliation-timeline"] = true;
    if (hasTermination) next["termination-summary"] = true;
    if (hasDamages || hasWageLoss || hasWageTheft || hasWC) next["damages-summary"] = true;
    if (hasWageLoss || hasWageTheft || hasWC) next["wage-loss-summary"] = true;
    if (hasMedical) next["medical-summary"] = true;
    if (hasWC) next["wc-summary"] = true;

    writeJson(PACKET_OUTPUTS_KEY, next);
  }

  function updateMeta(path: string, next: Partial<EvidenceMeta>) {
    setMeta((prev) => {
      const current = prev[path] || defaultMeta();
      const updated = { ...current, ...next };
      const merged = { ...prev, [path]: updated };
      writeJson(META_KEY, merged);
      autoCompletePacketLayoutWith(merged);
      autoCompletePacketOutputs();
      return merged;
    });
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    if (!settings.apiBase || !settings.workspaceId || !settings.authToken) {
      setUploadStatus("Set API base, workspace ID, and auth token in Case Settings.");
      return;
    }
    try {
      setUploadStatus("Uploading...");
      await uploadExhibit(settings, file);
      setUploadStatus("Upload complete.");
    } catch (err: any) {
      setUploadStatus(err?.message || "Upload failed.");
    }
  }

  const dynamicEvidence = readJson<{ name: string; path: string; ext: string; category: string }[]>(
    "case_companion_dynamic_evidence_v1",
    []
  );
  const combinedIndex = [...dynamicEvidence, ...EVIDENCE_INDEX];
  const trialPicks = combinedIndex.filter((item) => /police report|victim statement|video/i.test(item.name)).slice(0, 3);
  const filteredIndex = useMemo(() => {
    if (!filter.trim()) return combinedIndex;
    const needle = filter.toLowerCase();
    return combinedIndex.filter((item) => item.name.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle));
  }, [filter, combinedIndex]);

  const tagFilteredIndex = useMemo(() => {
    if (!tagFilter) return filteredIndex;
    return filteredIndex.filter((item) => (meta[item.path]?.tags || []).includes(tagFilter));
  }, [filteredIndex, meta, tagFilter]);

  async function fetchStatus() {
    if (!settings.apiBase || !statusLookupId.trim()) return;
    try {
      const res = await fetch(`${settings.apiBase}/api/exhibits/${encodeURIComponent(statusLookupId.trim())}`);
      if (!res.ok) {
        setStatusResult(await res.text());
        return;
      }
      const json = await res.json();
      setStatusResult(JSON.stringify(json.status, null, 2));
    } catch (err: any) {
      setStatusResult(err?.message || "Status lookup failed.");
    }
  }

  function exportPacket() {
    const payload = {
      generatedAt: new Date().toISOString(),
      index: combinedIndex,
      meta,
      packetLayout,
      packetOutputs,
      preFileAudit,
      timeline,
      damages,
      medicalItems,
      wageLoss,
      wageTheft,
      wcBenefits
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_evidence_packet.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExhibitMap() {
    const lines = [
      "Case Companion Exhibit Map",
      "",
      ...EVIDENCE_CATEGORIES.flatMap((category) => {
        const items = combinedIndex.filter((item) => item.category === category);
        return [
          `## ${category}`,
          ...items.map((item) => `- ${item.name} (${item.path})`),
          ""
        ];
      })
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_companion_exhibit_map.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportEvidencePacketHtml() {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Evidence Packet</title>
    <style>
      body { font-family: "Times New Roman", serif; margin: 32px; color: #0a0a0a; }
      h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 0.08em; }
      h2 { font-size: 16px; margin-top: 18px; }
      ul { margin-top: 8px; }
      .section { margin-top: 16px; }
      .muted { color: #444; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Evidence Packet</h1>
    <div class="muted">Generated ${new Date().toLocaleString()}</div>
    <div class="section">
      <h2>Packet Layout</h2>
      <ul>
        ${Object.entries(packetLayout).map(([key, value]) => `<li>${key}: ${value ? "Complete" : "Missing"}</li>`).join("")}
      </ul>
    </div>
    <div class="section">
      <h2>Packet Outputs</h2>
      <ul>
        ${Object.entries(packetOutputs).map(([key, value]) => `<li>${key}: ${value ? "Complete" : "Missing"}</li>`).join("")}
      </ul>
    </div>
    <div class="section">
      <h2>Prefile Audit</h2>
      <ul>
        ${Object.entries(preFileAudit).map(([key, value]) => `<li>${key}: ${value ? "Complete" : "Missing"}</li>`).join("")}
      </ul>
    </div>
    <div class="section">
      <h2>Evidence Index</h2>
      <ul>
        ${combinedIndex.map((item) => `<li>${item.name} (${item.category})</li>`).join("")}
      </ul>
    </div>
    <div class="section">
      <h2>Timelines</h2>
      <pre>${buildTimelineText("master")}</pre>
      <pre>${buildTimelineText("retaliation")}</pre>
      <pre>${buildTimelineText("termination")}</pre>
    </div>
    <div class="section">
      <h2>Damages Summary</h2>
      <pre>${damagesSummary || "No damages summary yet."}</pre>
    </div>
  </body>
</html>
    `.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evidence_packet.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExhibitBinderHtml() {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Exhibit Binder</title>
    <style>
      body { font-family: "Times New Roman", serif; margin: 32px; color: #0a0a0a; }
      h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 0.08em; }
      h2 { font-size: 16px; margin-top: 18px; }
      ul { margin-top: 8px; }
      .muted { color: #444; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Exhibit Binder</h1>
    <div class="muted">Generated ${new Date().toLocaleString()}</div>
    ${EVIDENCE_CATEGORIES.map((category) => `
      <h2>${category}</h2>
      <ul>
        ${combinedIndex.filter((item) => item.category === category).map((item, idx) => `<li>Exhibit ${idx + 1}: ${item.name}</li>`).join("")}
      </ul>
    `).join("")}
  </body>
</html>
    `.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exhibit_binder.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function autoCompletePacketLayout() {
    autoCompletePacketLayoutWith(meta);
    autoCompletePacketOutputs();
  }

  function setPacketLayoutOverride(sectionId: string, value: boolean) {
    const next = { ...packetLayoutOverrides, [sectionId]: value };
    writeJson(PACKET_LAYOUT_OVERRIDE_KEY, next);
    autoCompletePacketLayoutWith(meta);
  }

  function clearPacketLayoutOverrides() {
    writeJson(PACKET_LAYOUT_OVERRIDE_KEY, {});
    autoCompletePacketLayoutWith(meta);
  }

  function autoTagEvidence() {
    const next: MetaState = { ...meta };
    combinedIndex.forEach((item) => {
      const current = next[item.path] || defaultMeta();
      const haystack = `${item.name} ${item.path} ${item.category}`.toLowerCase();
      const tags = new Set(current.tags);
      for (const [tag, keywords] of Object.entries(AUTO_TAG_KEYWORDS)) {
        if (keywords.some((keyword) => haystack.includes(keyword))) {
          tags.add(tag);
        }
      }
      if (!current.tags.length && tags.size) {
        next[item.path] = { ...current, tags: Array.from(tags) };
      }
    });
    setMeta(next);
    writeJson(META_KEY, next);
    autoCompletePacketLayoutWith(next);
    autoCompletePacketOutputs();
  }

  function buildTimelineText(track: "master" | "retaliation" | "termination") {
    const rows = timeline
      .filter((event: any) => event.track === track)
      .sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));
    const lines = [
      `${track.toUpperCase()} TIMELINE`,
      "",
      ...rows.map((event: any) => `${event.date || "TBD"} - ${event.title}${event.note ? ` :: ${event.note}` : ""}`)
    ];
    return lines.join("\n");
  }

  function buildDamagesSummaryText() {
    const total = damages.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const wageLossTotal = (Number(wageLoss?.aww) || 0) * (Number(wageLoss?.weeks) || 0);
    const wageTheftTotal = (() => {
      const hourlyRate = Number(wageTheft?.hourlyRate) || 0;
      const unpaidHours = Number(wageTheft?.unpaidHours) || 0;
      const salaryPerPeriod = Number(wageTheft?.salaryPerPeriod) || 0;
      const missingPayPeriods = Number(wageTheft?.missingPayPeriods) || 0;
      const deductions = Number(wageTheft?.deductions) || 0;
      const base = hourlyRate * unpaidHours + salaryPerPeriod * missingPayPeriods + deductions;
      return wageTheft?.liquidated ? base * 2 : base;
    })();
    const wcBenefitsTotal = (Number(wcBenefits?.rate) || 0) * (Number(wcBenefits?.weeks) || 0);
    const lines = [
      "DAMAGES SUMMARY",
      "",
      `Total damages ledger: $${total.toFixed(2)}`,
      `Wage loss (AWW): $${wageLossTotal.toFixed(2)}`,
      `Wage theft: $${wageTheftTotal.toFixed(2)}`,
      `Workers' comp benefits: $${wcBenefitsTotal.toFixed(2)}`,
      "",
      "Entries:",
      ...damages.map((entry: any) => `- ${entry.category}: ${entry.description} ($${Number(entry.amount || 0).toFixed(2)})`)
    ];
    return lines.join("\n");
  }

  function buildPacketReadinessText() {
    const layoutKeys = Object.keys(packetLayout);
    const outputKeys = Object.keys(packetOutputs);
    const auditKeys = Object.keys(preFileAudit);
    const layoutDone = layoutKeys.filter((key) => packetLayout[key]).length;
    const outputDone = outputKeys.filter((key) => packetOutputs[key]).length;
    const auditDone = auditKeys.filter((key) => preFileAudit[key]).length;
    return [
      "PACKET READINESS REPORT",
      "",
      `Layout completion: ${layoutDone}/${layoutKeys.length || 0}`,
      `Output completion: ${outputDone}/${outputKeys.length || 0}`,
      `Pre-file audit completion: ${auditDone}/${auditKeys.length || 0}`
    ].join("\n");
  }

  async function exportPacketZip() {
    const payload = {
      generatedAt: new Date().toISOString(),
      index: combinedIndex,
      meta,
      packetLayout,
      packetOutputs,
      preFileAudit,
      timeline,
      damages,
      medicalItems,
      wageLoss,
      wageTheft,
      wcBenefits
    };
    const zip = new JSZip();
    zip.file("evidence_packet.json", JSON.stringify(payload, null, 2));
    zip.file("packet_readiness.txt", buildPacketReadinessText());
    zip.file("timeline_master.txt", buildTimelineText("master"));
    zip.file("timeline_retaliation.txt", buildTimelineText("retaliation"));
    zip.file("timeline_termination.txt", buildTimelineText("termination"));
    zip.file("damages_summary.txt", buildDamagesSummaryText());
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evidence_packet.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page
      title="Evidence Vault"
      subtitle="Exhibit index with tags and status (local only)."
    >
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Backend Upload (Optional)</CardSubtitle>
            <CardTitle>Upload Exhibit</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="text-sm text-slate-300"
              />
              <span className="text-xs text-slate-500">{uploadStatus}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Video Forensics</CardSubtitle>
            <CardTitle>Status Lookup</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Exhibit ID"
                value={statusLookupId}
                onChange={(e) => setStatusLookupId(e.target.value)}
              />
              <button
                type="button"
                onClick={fetchStatus}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Check Status
              </button>
            </div>
            {statusResult ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                {statusResult}
              </pre>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Trial Mode</CardSubtitle>
            <CardTitle>One-Tap Exhibits</CardTitle>
          </CardHeader>
          <CardBody>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={trialMode}
                onChange={(e) => setTrialMode(e.target.checked)}
              />
              Enable Trial Mode view
            </label>
            {trialMode ? (
              <div className="mt-3 grid gap-4">
                <div className="grid gap-3">
                  {trialPicks.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="w-full rounded-lg bg-amber-500 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 mb-2">Objection Battle Cards</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    {MICHIGAN_OBJECTION_CARDS.map((card) => (
                      <div key={card.id} className="rounded-md border border-white/5 bg-white/5 p-2">
                        <div className="text-amber-200">{card.rule}</div>
                        <div className="text-slate-100">{card.title}</div>
                        <div className="text-slate-400">{card.whenToUse[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Export</CardSubtitle>
            <CardTitle>Evidence Packet</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportPacket}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Export Evidence Packet
              </button>
              <button
                type="button"
                onClick={exportPacketZip}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Export Evidence Packet ZIP
              </button>
              <button
                type="button"
                onClick={exportEvidencePacketHtml}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-200"
              >
                Export Evidence Packet (HTML)
              </button>
              <button
                type="button"
                onClick={autoCompletePacketLayout}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-200"
              >
                Auto-Complete Packet Layout
              </button>
              <button
                type="button"
                onClick={autoTagEvidence}
                className="rounded-md border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-200"
              >
                Auto-Tag Evidence
              </button>
              <button
                type="button"
                onClick={exportExhibitMap}
                className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
              >
                Export Exhibit Map
              </button>
              <button
                type="button"
                onClick={exportExhibitBinderHtml}
                className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
              >
                Export Exhibit Binder (HTML)
              </button>
              <button
                type="button"
                onClick={clearPacketLayoutOverrides}
                className="rounded-md border border-slate-500/60 px-3 py-2 text-sm font-semibold text-slate-300"
              >
                Clear Layout Overrides
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">Exports local evidence index + tags/status.</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Packet Layout</CardSubtitle>
            <CardTitle>Manual Overrides</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-xs text-slate-400 mb-3">
              Overrides persist and will supersede auto-complete for the selected section.
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              {Object.entries(PACKET_SECTION_KEYWORDS).map(([sectionId]) => (
                <label key={sectionId} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    checked={Boolean(packetLayoutOverrides[sectionId])}
                    onChange={(e) => setPacketLayoutOverride(sectionId, e.target.checked)}
                  />
                  <span className={packetLayoutOverrides[sectionId] ? "text-slate-300" : "text-slate-500"}>
                    {sectionId.replace(/-/g, " ")}
                  </span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Standards</CardSubtitle>
            <CardTitle>Evidence Quality</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Use RAM validation and admissibility checklists before relying on exhibits.
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/evidence-standards"
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                RAM Validator
              </a>
              <a
                href="/video-admissibility"
                className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-semibold text-amber-200"
              >
                Video Admissibility
              </a>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Filters</CardSubtitle>
            <CardTitle>Tag Filter</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {["", "police-report", "medical", "video", "witness"].map((tag) => (
                <button
                  key={tag || "all"}
                  type="button"
                  onClick={() => setTagFilter(tag)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    tagFilter === tag ? "bg-amber-500 text-slate-900" : "border border-white/10 text-slate-300"
                  }`}
                >
                  {tag || "All"}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {[...new Set([...EVIDENCE_CATEGORIES, ...combinedIndex.map((i) => i.category)])].map((category) => {
          const items = tagFilteredIndex.filter((item) => item.category === category);
          return (
            <Card key={category}>
              <CardHeader>
                <CardSubtitle>Category</CardSubtitle>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="text-sm text-slate-400 mb-3">{items.length} items</div>
                <input
                  className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                  placeholder="Filter by name or path"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <ul className="space-y-3 text-sm text-slate-300">
                  {items.map((item) => {
                    const itemMeta = meta[item.path] || defaultMeta();
                    const isHighlighted = highlight && item.path === highlight;
                    return (
                      <li
                        key={item.path}
                        className={`rounded-md border border-white/5 bg-white/5 p-3 ${
                          isHighlighted ? "ring-2 ring-amber-400/60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs text-slate-500">.{item.ext}</span>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-3">
                          <input
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                            placeholder="Tags (comma separated)"
                            value={itemMeta.tags.join(", ")}
                            onChange={(e) =>
                              updateMeta(item.path, {
                                tags: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                              })
                            }
                          />
                          <select
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                            value={itemMeta.status}
                            onChange={(e) => updateMeta(item.path, { status: e.target.value as EvidenceMeta["status"] })}
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="linked">Linked</option>
                          </select>
                          <div className="text-xs text-slate-500">Path: {item.path}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
