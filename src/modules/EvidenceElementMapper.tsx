import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_element_map_v1";
const ELEMENTS = [
  "Intentional act",
  "Harmful or offensive contact",
  "Apprehension of contact",
  "Damages"
];

type Mapping = Record<string, string[]>;

export default function EvidenceElementMapper() {
  const [mapping, setMapping] = useState<Mapping>(() => readJson(STORAGE_KEY, {}));
  const dynamicEvidence = readJson<{ name: string; path: string }[]>("case_companion_dynamic_evidence_v1", []);
  const combinedIndex = [...dynamicEvidence, ...EVIDENCE_INDEX];

  function toggle(path: string, element: string) {
    const current = mapping[path] || [];
    const next = current.includes(element)
      ? current.filter((e) => e !== element)
      : [...current, element];
    const updated = { ...mapping, [path]: next };
    setMapping(updated);
    writeJson(STORAGE_KEY, updated);
  }

  return (
    <Page title="Evidence to Elements" subtitle="Map exhibits to assault/battery elements.">
      <div className="grid gap-6">
        {combinedIndex.map((item) => (
          <Card key={item.path}>
            <CardHeader>
              <CardSubtitle>Exhibit</CardSubtitle>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2 md:grid-cols-2 text-sm text-slate-300">
                {ELEMENTS.map((element) => (
                  <label key={element} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-amber-400"
                      checked={(mapping[item.path] || []).includes(element)}
                      onChange={() => toggle(item.path, element)}
                    />
                    <span>{element}</span>
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
