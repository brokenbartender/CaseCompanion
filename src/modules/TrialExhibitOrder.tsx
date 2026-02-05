import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_exhibit_order_v1";

type ExhibitItem = { id: string; name: string };

function buildDefault(): ExhibitItem[] {
  return EVIDENCE_INDEX.map((item, idx) => ({ id: `${idx}-${item.path}`, name: item.name }));
}

export default function TrialExhibitOrder() {
  const [items, setItems] = useState<ExhibitItem[]>(() => readJson(STORAGE_KEY, buildDefault()));
  const [customName, setCustomName] = useState("");

  function move(index: number, delta: number) {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setItems(next);
    writeJson(STORAGE_KEY, next);
  }

  function addCustom() {
    if (!customName.trim()) return;
    const next = [...items, { id: `${Date.now()}`, name: customName }];
    setItems(next);
    writeJson(STORAGE_KEY, next);
    setCustomName("");
  }

  return (
    <Page title="Trial Exhibit Order" subtitle="Set the order you plan to present exhibits.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Custom Exhibit</CardSubtitle>
            <CardTitle>Add Item</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <input
                className="flex-1 min-w-[220px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Exhibit name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <button
                type="button"
                onClick={addCustom}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Order</CardSubtitle>
            <CardTitle>Exhibit List</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm text-slate-200">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <span>{index + 1}. {item.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs"
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
