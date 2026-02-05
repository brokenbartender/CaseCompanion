import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { DAMAGES_CATEGORIES, DamagesEntry } from "../data/damagesTemplates";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_damages_v1";

export default function ForensicFinance() {
  const [entries, setEntries] = useState<DamagesEntry[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState({ category: "Medical expenses", description: "", amount: "", evidence: "" });
  const [medicalItems, setMedicalItems] = useState<{ label: string; amount: string }[]>(
    () => readJson("case_companion_medical_items_v1", [])
  );
  const [medicalLabel, setMedicalLabel] = useState("");
  const [medicalAmount, setMedicalAmount] = useState("");

  const total = useMemo(
    () => entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [entries]
  );
  const medicalTotal = useMemo(
    () => medicalItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [medicalItems]
  );

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
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
