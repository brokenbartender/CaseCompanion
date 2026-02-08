import React, { useEffect, useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { DAMAGES_CATEGORIES, DamagesEntry } from "../data/damagesTemplates";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_damages_v1";
const WAGE_LOSS_KEY = "case_companion_wage_loss_v1";
const WAGE_THEFT_KEY = "case_companion_wage_theft_v1";
const WC_BENEFITS_KEY = "case_companion_wc_benefits_v1";
const DAMAGES_SUMMARY_KEY = "case_companion_damages_summary_v1";

export default function ForensicFinance() {
  const [entries, setEntries] = useState<DamagesEntry[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState({ category: "Medical expenses", description: "", amount: "", evidence: "" });
  const [medicalItems, setMedicalItems] = useState<{ label: string; amount: string }[]>(
    () => readJson("case_companion_medical_items_v1", [])
  );
  const [medicalLabel, setMedicalLabel] = useState("");
  const [medicalAmount, setMedicalAmount] = useState("");
  const [wageLoss, setWageLoss] = useState(() => readJson(WAGE_LOSS_KEY, { aww: "", weeks: "", notes: "" }));
  const [wageTheft, setWageTheft] = useState(() =>
    readJson(WAGE_THEFT_KEY, {
      hourlyRate: "",
      unpaidHours: "",
      salaryPerPeriod: "",
      missingPayPeriods: "",
      deductions: "",
      liquidated: true
    })
  );
  const [wcBenefits, setWcBenefits] = useState(() => readJson(WC_BENEFITS_KEY, { rate: "", weeks: "", notes: "" }));
  const [nonEconomicMultiplier, setNonEconomicMultiplier] = useState(() =>
    readJson("case_companion_non_econ_multiplier_v1", 1.5)
  );

  const total = useMemo(
    () => entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [entries]
  );
  const medicalTotal = useMemo(
    () => medicalItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [medicalItems]
  );
  const wageLossTotal = useMemo(() => {
    const aww = Number(wageLoss.aww) || 0;
    const weeks = Number(wageLoss.weeks) || 0;
    return aww * weeks;
  }, [wageLoss]);
  const wageTheftTotal = useMemo(() => {
    const hourlyRate = Number(wageTheft.hourlyRate) || 0;
    const unpaidHours = Number(wageTheft.unpaidHours) || 0;
    const salaryPerPeriod = Number(wageTheft.salaryPerPeriod) || 0;
    const missingPayPeriods = Number(wageTheft.missingPayPeriods) || 0;
    const deductions = Number(wageTheft.deductions) || 0;
    const base = hourlyRate * unpaidHours + salaryPerPeriod * missingPayPeriods + deductions;
    return wageTheft.liquidated ? base * 2 : base;
  }, [wageTheft]);
  const wcBenefitsTotal = useMemo(() => {
    const rate = Number(wcBenefits.rate) || 0;
    const weeks = Number(wcBenefits.weeks) || 0;
    return rate * weeks;
  }, [wcBenefits]);

  const damagesSummaryText = useMemo(() => {
    const lines = [
      "DAMAGES SUMMARY",
      "",
      `Total damages ledger: $${total.toFixed(2)}`,
      `Medical totalizer: $${medicalTotal.toFixed(2)}`,
      `Wage loss (AWW): $${wageLossTotal.toFixed(2)}`,
      `Wage theft: $${wageTheftTotal.toFixed(2)}`,
      `Workers' comp benefits: $${wcBenefitsTotal.toFixed(2)}`,
      "",
      "Entries:",
      ...entries.map((entry) => `- ${entry.category}: ${entry.description} ($${Number(entry.amount || 0).toFixed(2)})`)
    ];
    return lines.join("\n");
  }, [entries, total, medicalTotal, wageLossTotal, wageTheftTotal, wcBenefitsTotal]);

  const scenarioBase = useMemo(
    () => medicalTotal + wageLossTotal + wageTheftTotal + wcBenefitsTotal,
    [medicalTotal, wageLossTotal, wageTheftTotal, wcBenefitsTotal]
  );
  const nonEconomicEstimate = scenarioBase * (Number(nonEconomicMultiplier) || 0);
  const scenarioTotal = total + nonEconomicEstimate;

  useEffect(() => {
    writeJson(DAMAGES_SUMMARY_KEY, damagesSummaryText);
  }, [damagesSummaryText]);

  useEffect(() => {
    writeJson("case_companion_non_econ_multiplier_v1", nonEconomicMultiplier);
  }, [nonEconomicMultiplier]);

  function exportDamagesSummaryHtml() {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Damages Summary</title>
    <style>
      body { font-family: "Times New Roman", serif; margin: 32px; color: #0a0a0a; }
      h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
      .total { margin-top: 12px; font-weight: bold; }
      ul { margin-top: 12px; }
    </style>
  </head>
  <body>
    <h1>Damages Summary</h1>
    <div class="total">Total damages ledger: $${total.toFixed(2)}</div>
    <div>Medical totalizer: $${medicalTotal.toFixed(2)}</div>
    <div>Wage loss (AWW): $${wageLossTotal.toFixed(2)}</div>
    <div>Wage theft: $${wageTheftTotal.toFixed(2)}</div>
    <div>Workers' comp benefits: $${wcBenefitsTotal.toFixed(2)}</div>
    <h2>Entries</h2>
    <ul>
      ${entries.map((entry) => `<li>${entry.category}: ${entry.description} ($${Number(entry.amount || 0).toFixed(2)})</li>`).join("")}
    </ul>
  </body>
</html>
    `.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "damages_summary.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function addEntry() {
    if (!form.description.trim()) return;
    const next: DamagesEntry[] = [
      ...entries,
      {
        id: `${Date.now()}`,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        evidence: form.evidence.trim()
      }
    ];
    setEntries(next);
    writeJson(STORAGE_KEY, next);
    setForm({ category: "Medical expenses", description: "", amount: "", evidence: "" });
  }

  function removeEntry(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    writeJson(STORAGE_KEY, next);
  }

  function pushDamagesEntry(category: string, description: string, amount: number) {
    const next: DamagesEntry[] = [
      ...entries,
      {
        id: `${Date.now()}`,
        category,
        description,
        amount,
        evidence: ""
      }
    ];
    setEntries(next);
    writeJson(STORAGE_KEY, next);
  }

  return (
    <Page title="Damages Calculator" subtitle="Quantify medical, wage, and business losses.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Add Entry</CardSubtitle>
            <CardTitle>Damages</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {DAMAGES_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <input
                type="number"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={form.evidence}
                onChange={(e) => setForm({ ...form, evidence: e.target.value })}
              >
                <option value="">Select evidence (optional)</option>
                {EVIDENCE_INDEX.map((item) => (
                  <option key={item.path} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addEntry}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Damages
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Summary</CardSubtitle>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-white">${total.toFixed(2)}</div>
            <div className="mt-2 text-xs text-slate-400">Medical bill totalizer: ${medicalTotal.toFixed(2)}</div>
            <div className="mt-2 text-sm text-slate-400">
              Use this as a working total for settlement demand planning.
            </div>
            <div className="mt-4 space-y-3">
              {entries.length === 0 ? (
                <div className="text-sm text-slate-400">No damages entries yet.</div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white">{entry.description}</div>
                        <div className="text-xs text-slate-400">
                          {entry.category} {entry.evidence ? `- Evidence: ${entry.evidence}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-amber-200">${entry.amount.toFixed(2)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="mt-2 text-xs text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={exportDamagesSummaryHtml}
              className="mt-4 rounded-md border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200"
            >
              Download Damages Summary (HTML)
            </button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Scenario</CardSubtitle>
            <CardTitle>Non-Economic Estimate</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs text-slate-400 mb-2">Multiplier</div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={nonEconomicMultiplier}
                  onChange={(e) => setNonEconomicMultiplier(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-slate-300 mt-2">x{Number(nonEconomicMultiplier).toFixed(1)}</div>
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <div>Scenario base (medical + wage + WC): ${scenarioBase.toFixed(2)}</div>
                <div>Non-economic estimate: ${nonEconomicEstimate.toFixed(2)}</div>
                <div className="text-emerald-200">Scenario total: ${scenarioTotal.toFixed(2)}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Medical Bills</CardSubtitle>
            <CardTitle>Totalizer</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Bill label"
                value={medicalLabel}
                onChange={(e) => setMedicalLabel(e.target.value)}
              />
              <input
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Amount"
                value={medicalAmount}
                onChange={(e) => setMedicalAmount(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (!medicalLabel.trim()) return;
                  const next = [...medicalItems, { label: medicalLabel, amount: medicalAmount }];
                  setMedicalItems(next);
                  writeJson("case_companion_medical_items_v1", next);
                  setMedicalLabel("");
                  setMedicalAmount("");
                }}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Bill
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {medicalItems.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span>${Number(item.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => pushDamagesEntry("Medical expenses", "Medical bills totalizer", medicalTotal)}
              className="mt-4 rounded-md border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200"
            >
              Add Medical Total to Damages
            </button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Wage Loss</CardSubtitle>
            <CardTitle>AWW Calculator</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Average Weekly Wage (AWW)"
                value={wageLoss.aww}
                onChange={(e) => {
                  const next = { ...wageLoss, aww: e.target.value };
                  setWageLoss(next);
                  writeJson(WAGE_LOSS_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Weeks of loss"
                value={wageLoss.weeks}
                onChange={(e) => {
                  const next = { ...wageLoss, weeks: e.target.value };
                  setWageLoss(next);
                  writeJson(WAGE_LOSS_KEY, next);
                }}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Notes"
                rows={3}
                value={wageLoss.notes}
                onChange={(e) => {
                  const next = { ...wageLoss, notes: e.target.value };
                  setWageLoss(next);
                  writeJson(WAGE_LOSS_KEY, next);
                }}
              />
              <div className="text-sm text-slate-300">
                Total: ${wageLossTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => pushDamagesEntry("Lost income", "Wage loss (AWW-based)", wageLossTotal)}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Wage Loss to Damages
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Wage Theft</CardSubtitle>
            <CardTitle>Loss Ledger</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Hourly rate"
                value={wageTheft.hourlyRate}
                onChange={(e) => {
                  const next = { ...wageTheft, hourlyRate: e.target.value };
                  setWageTheft(next);
                  writeJson(WAGE_THEFT_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Unpaid hours"
                value={wageTheft.unpaidHours}
                onChange={(e) => {
                  const next = { ...wageTheft, unpaidHours: e.target.value };
                  setWageTheft(next);
                  writeJson(WAGE_THEFT_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Salary per pay period"
                value={wageTheft.salaryPerPeriod}
                onChange={(e) => {
                  const next = { ...wageTheft, salaryPerPeriod: e.target.value };
                  setWageTheft(next);
                  writeJson(WAGE_THEFT_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Missing pay periods"
                value={wageTheft.missingPayPeriods}
                onChange={(e) => {
                  const next = { ...wageTheft, missingPayPeriods: e.target.value };
                  setWageTheft(next);
                  writeJson(WAGE_THEFT_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Unauthorized deductions"
                value={wageTheft.deductions}
                onChange={(e) => {
                  const next = { ...wageTheft, deductions: e.target.value };
                  setWageTheft(next);
                  writeJson(WAGE_THEFT_KEY, next);
                }}
              />
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-amber-400"
                  checked={Boolean(wageTheft.liquidated)}
                  onChange={(e) => {
                    const next = { ...wageTheft, liquidated: e.target.checked };
                    setWageTheft(next);
                    writeJson(WAGE_THEFT_KEY, next);
                  }}
                />
                Apply liquidated damages (double base)
              </label>
              <div className="text-sm text-slate-300">
                Total: ${wageTheftTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => pushDamagesEntry("Wage theft", "Wage theft ledger", wageTheftTotal)}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Wage Theft to Damages
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>Workers’ Comp</CardSubtitle>
            <CardTitle>Benefits Owed</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Weekly benefit rate"
                value={wcBenefits.rate}
                onChange={(e) => {
                  const next = { ...wcBenefits, rate: e.target.value };
                  setWcBenefits(next);
                  writeJson(WC_BENEFITS_KEY, next);
                }}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Weeks owed"
                value={wcBenefits.weeks}
                onChange={(e) => {
                  const next = { ...wcBenefits, weeks: e.target.value };
                  setWcBenefits(next);
                  writeJson(WC_BENEFITS_KEY, next);
                }}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Notes"
                rows={3}
                value={wcBenefits.notes}
                onChange={(e) => {
                  const next = { ...wcBenefits, notes: e.target.value };
                  setWcBenefits(next);
                  writeJson(WC_BENEFITS_KEY, next);
                }}
              />
              <div className="text-sm text-slate-300">
                Total: ${wcBenefitsTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => pushDamagesEntry("Workers' comp", "Workers' comp benefits owed", wcBenefitsTotal)}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add WC Benefits to Damages
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
