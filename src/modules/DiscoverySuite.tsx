import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { DISCOVERY_TEMPLATES } from "../data/discoveryTemplates";

const STORAGE_KEY = "case_companion_discovery_v1";

type DiscoveryEntry = {
  id: string;
  type: string;
  title: string;
  requestDate: string;
  dueDate: string;
  notes: string;
};

export default function DiscoverySuite() {
  const [entries, setEntries] = useState<DiscoveryEntry[]>(() => readJson(STORAGE_KEY, []));
  const [form, setForm] = useState<DiscoveryEntry>({
    id: "",
    type: "interrogatories",
    title: "",
    requestDate: "",
    dueDate: "",
    notes: ""
  });

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [entries]
  );

  function addEntry() {
    if (!form.title.trim()) return;
    const next: DiscoveryEntry[] = [
      ...entries,
      { ...form, id: `${Date.now()}` }
    ];
    setEntries(next);
    writeJson(STORAGE_KEY, next);
    setForm({ id: "", type: "interrogatories", title: "", requestDate: "", dueDate: "", notes: "" });
  }

  function templateFields(type: string) {
    const template = DISCOVERY_TEMPLATES.find((item) => item.id === type);
    return template?.fields || [];
  }

  return (
    <Page title="Discovery Suite" subtitle="Track interrogatories, production requests, and admissions.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardSubtitle>Oakland County Guidance</CardSubtitle>
            <CardTitle>Initial Disclosures</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm text-slate-300">
              <div>MCR 2.302(A) requires initial disclosures in Michigan civil cases.</div>
              <div>Initial disclosures are generally due within 14 days after the defendant files an answer.</div>
              <div className="text-xs text-slate-400">
                Follow the court’s scheduling order for additional discovery deadlines.
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardSubtitle>New Request</CardSubtitle>
            <CardTitle>Add Discovery</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {DISCOVERY_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Title (e.g., Interrogatories Set 1)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Request Date (YYYY-MM-DD)"
                value={form.requestDate}
                onChange={(e) => setForm({ ...form, requestDate: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Response Due Date (YYYY-MM-DD)"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
                Add Discovery
              </button>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Template fields: {templateFields(form.type).join(", ") || "None"}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardSubtitle>Discovery Tracker</CardSubtitle>
            <CardTitle>Active Requests</CardTitle>
          </CardHeader>
          <CardBody>
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-400">No discovery requests yet.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">{entry.title}</div>
                        <div className="text-xs text-slate-400">{entry.type}</div>
                      </div>
                      <div className="text-xs text-amber-200">Due: {entry.dueDate || "TBD"}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Requested: {entry.requestDate || "TBD"}
                    </div>
                    {entry.notes ? <div className="mt-2 text-sm text-slate-300">{entry.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
