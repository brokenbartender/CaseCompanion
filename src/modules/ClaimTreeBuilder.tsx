import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_claim_tree_v1";

type ClaimElement = {
  id: string;
  label: string;
  anchors: string[];
  contradictions: string;
};

type Claim = {
  id: string;
  type: string;
  elements: ClaimElement[];
};

const CLAIM_TEMPLATES: Record<string, string[]> = {
  "Assault": [
    "Intentional act",
    "Reasonable apprehension of imminent contact",
    "Causation",
    "Damages"
  ],
  "Battery": [
    "Intentional contact",
    "Harmful or offensive touching",
    "Causation",
    "Damages"
  ],
  "Negligence": [
    "Duty",
    "Breach",
    "Causation",
    "Damages"
  ]
};

export default function ClaimTreeBuilder() {
  const [claims, setClaims] = useState<Claim[]>(() => readJson(STORAGE_KEY, []));
  const [template, setTemplate] = useState("Assault");
  const dynamicEvidence = readJson<{ name: string; path: string }[]>("case_companion_dynamic_evidence_v1", []);
  const evidenceList = [...dynamicEvidence, ...EVIDENCE_INDEX];

  function addClaim() {
    const elements = (CLAIM_TEMPLATES[template] || []).map((label, idx) => ({
      id: `${template}-${idx}-${Date.now()}`,
      label,
      anchors: [],
      contradictions: ""
    }));
    const next = [...claims, { id: `${template}-${Date.now()}`, type: template, elements }];
    setClaims(next);
    writeJson(STORAGE_KEY, next);
  }

  function updateClaim(id: string, updater: (claim: Claim) => Claim) {
    const next = claims.map((claim) => (claim.id === id ? updater(claim) : claim));
    setClaims(next);
    writeJson(STORAGE_KEY, next);
  }

  function removeClaim(id: string) {
    const next = claims.filter((claim) => claim.id !== id);
    setClaims(next);
    writeJson(STORAGE_KEY, next);
  }

  return (
    <Page title="Claim Tree Builder" subtitle="Map claim elements to evidence anchors and contradictions.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>New Claim</CardSubtitle>
            <CardTitle>Add Claim Template</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {Object.keys(CLAIM_TEMPLATES).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addClaim}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add Claim
              </button>
            </div>
          </CardBody>
        </Card>

        {claims.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-sm text-slate-400">No claims yet. Add a claim template above.</div>
            </CardBody>
          </Card>
        ) : null}

        {claims.map((claim) => {
          const missing = claim.elements.filter((el) => el.anchors.length === 0);
          return (
            <Card key={claim.id}>
              <CardHeader>
                <CardSubtitle>Claim</CardSubtitle>
                <CardTitle>{claim.type}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="mb-3 text-xs text-slate-400">
                  Status: {missing.length === 0 ? "Anchored" : `Missing anchors for ${missing.length} element(s)`}
                </div>
                <div className="grid gap-4">
                  {claim.elements.map((el) => (
                    <div key={el.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white">{el.label}</div>
                        <div className="text-xs text-slate-400">
                          {el.anchors.length ? "Anchored" : "No anchors"}
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2">
                        <select
                          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs text-slate-100"
                          value=""
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!value) return;
                            updateClaim(claim.id, (current) => ({
                              ...current,
                              elements: current.elements.map((item) =>
                                item.id === el.id
                                  ? { ...item, anchors: Array.from(new Set([...item.anchors, value])) }
                                  : item
                              )
                            }));
                          }}
                        >
                          <option value="">Add evidence anchor</option>
                          {evidenceList.map((item) => (
                            <option key={`${item.path}-${item.name}`} value={item.name}>{item.name}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                          {el.anchors.map((anchor) => (
                            <button
                              key={anchor}
                              type="button"
                              onClick={() =>
                                updateClaim(claim.id, (current) => ({
                                  ...current,
                                  elements: current.elements.map((item) =>
                                    item.id === el.id
                                      ? { ...item, anchors: item.anchors.filter((a) => a !== anchor) }
                                      : item
                                  )
                                }))
                              }
                              className="rounded-full border border-white/10 px-2 py-1"
                            >
                              {anchor} (remove)
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100"
                          rows={2}
                          placeholder="Contradictions or weaknesses"
                          value={el.contradictions}
                          onChange={(e) =>
                            updateClaim(claim.id, (current) => ({
                              ...current,
                              elements: current.elements.map((item) =>
                                item.id === el.id ? { ...item, contradictions: e.target.value } : item
                              )
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeClaim(claim.id)}
                  className="mt-4 rounded-md border border-rose-500/50 px-3 py-2 text-xs text-rose-200"
                >
                  Remove Claim
                </button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
