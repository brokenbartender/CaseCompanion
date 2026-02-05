import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";

const STORAGE_KEY = "case_companion_redaction_v1";

type RedactionState = {
  terms: string;
  selected: string[];
};

export default function BatesRedactionSuiteLite() {
  const [state, setState] = useState<RedactionState>(() =>
    readJson(STORAGE_KEY, { terms: "", selected: [] })
  );

  function toggle(path: string) {
    const has = state.selected.includes(path);
    const next = has ? state.selected.filter((p) => p !== path) : [...state.selected, path];
    const updated = { ...state, selected: next };
    setState(updated);
    writeJson(STORAGE_KEY, updated);
  }

  function saveTerms(value: string) {
    const updated = { ...state, terms: value };
    setState(updated);
    writeJson(STORAGE_KEY, updated);
  }

  return (
    <Page title="Bates + Redaction Suite" subtitle="Prepare redaction terms and target exhibits.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Redaction</CardSubtitle>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={6}
              placeholder="Enter terms to redact (comma or newline separated)"
              value={state.terms}
              onChange={(e) => saveTerms(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-400">
              This is a local planner. Use redaction tools before filing.
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Targets</CardSubtitle>
            <CardTitle>Select Exhibits</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="max-h-64 overflow-auto space-y-2 text-sm text-slate-300">
              {EVIDENCE_INDEX.map((item) => (
                <label key={item.path} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-400"
                    checked={state.selected.includes(item.path)}
                    onChange={() => toggle(item.path)}
                  />
                  <span className="truncate">{item.name}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
