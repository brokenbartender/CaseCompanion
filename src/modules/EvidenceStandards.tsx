import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { RAM_CHECKLIST, FORENSICS_WORKFLOW, CHAIN_OF_CUSTODY_TEMPLATE } from "../data/evidenceStandards";

const STORAGE_KEY = "case_companion_ram_entries_v1";

type RamEntry = {
  id: string;
  name: string;
  notes: string;
  relevant: boolean;
  authentic: boolean;
  material: boolean;
};

function score(entry: RamEntry) {
  return [entry.relevant, entry.authentic, entry.material].filter(Boolean).length;
}

export default function EvidenceStandards() {
  const [entries, setEntries] = useState<RamEntry[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState({ name: "", notes: "" });

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.name.localeCompare(b.name)),
    [entries]
  );

  function addEntry() {
    if (!form.name.trim()) return;
    const next: RamEntry[] = [
      ...entries,
      {
        id: `${Date.now()}`,
        name: form.name.trim(),
        notes: form.notes.trim(),
        relevant: false,
        authentic: false,
        material: false
      }
    ];
    setEntries(next);
    writeJson(STORAGE_KEY, next);
    setForm({ name: "", notes: "" });
  }

  function updateEntry(id: string, patch: Partial<RamEntry>) {
    const next = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    setEntries(next);
    writeJson(STORAGE_KEY, next);
  }

  return (
    <Page title="Evidence Standards" subtitle="RAM evidence validation and forensic workflow checklists.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>RAM Validator</CardSubtitle>
            <CardTitle>Add Evidence Item</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Evidence name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button
                type="button"
                onClick={addEntry}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Item
              </button>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              RAM = Relevant, Authentic, Material. Use it to qualify each exhibit.
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>RAM Validator</CardSubtitle>
            <CardTitle>Evidence List</CardTitle>
          </CardHeader>
          <CardBody>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No evidence items yet.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">{entry.name}</div>
                        {entry.notes ? <div className="text-xs text-slate-400">{entry.notes}</div> : null}
                      </div>
                      <div className="text-xs text-amber-200">Score: {score(entry)}/3</div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                      {[
                        { key: "relevant", label: "Relevant" },
                        { key: "authentic", label: "Authentic" },
                        { key: "material", label: "Material" }
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-amber-400"
                            checked={Boolean((entry as any)[item.key])}
                            onChange={(e) => updateEntry(entry.id, { [item.key]: e.target.checked } as any)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                    {score(entry) < 3 ? (
                      <div className="mt-2 text-xs text-amber-200">
                        Missing RAM criteria. Add documentation before relying on this exhibit.
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>RAM Prompts</CardSubtitle>
            <CardTitle>Qualification Checklist</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {RAM_CHECKLIST.map((section) => (
                <div key={section.title} className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-white">{section.title}</div>
                  <div className="text-xs text-slate-400">{section.description}</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {section.prompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Forensic Workflow</CardSubtitle>
            <CardTitle>OSAC/SWGDE-Aligned Steps</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {FORENSICS_WORKFLOW.map((section) => (
                <div key={section.title} className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-white">{section.title}</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {section.tasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-400 mb-2">Chain of custody template</div>
              <ul className="space-y-1 text-xs text-slate-300">
                {CHAIN_OF_CUSTODY_TEMPLATE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
