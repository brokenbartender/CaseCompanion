import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_privacy_vault_v1";

export default function PrivacyVaultLite() {
  const [selected, setSelected] = useState<string[]>(() => readJson(STORAGE_KEY, []));

  function toggle(path: string) {
    const next = selected.includes(path) ? selected.filter((p) => p !== path) : [...selected, path];
    setSelected(next);
    writeJson(STORAGE_KEY, next);
  }

  return (
    <Page title="Privacy Vault" subtitle="Mark documents as sensitive.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Sensitive</CardSubtitle>
            <CardTitle>Document List</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="max-h-80 overflow-auto space-y-2 text-sm text-slate-300">
              {EVIDENCE_INDEX.map((item) => (
                <label key={item.path} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-400"
                    checked={selected.includes(item.path)}
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
