import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson, writeJson } from "../utils/localStore";

const STORAGE_KEY = "case_companion_witness_prep_v1";

type Packet = { id: string; name: string; questions: string };

export default function WitnessPrepPackets() {
  const [packets, setPackets] = useState<Packet[]>(() => readJson(STORAGE_KEY, []));
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState("");

  function addPacket() {
    if (!name.trim()) return;
    const next = [...packets, { id: `${Date.now()}`, name, questions }];
    setPackets(next);
    writeJson(STORAGE_KEY, next);
    setName("");
    setQuestions("");
  }

  return (
    <Page title="Witness Prep Packets" subtitle="Create question packets per witness.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Create</CardSubtitle>
            <CardTitle>New Packet</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Witness name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              rows={6}
              placeholder="Questions"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
            />
            <button
              type="button"
              onClick={addPacket}
              className="mt-3 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Save Packet
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Packets</CardSubtitle>
            <CardTitle>Saved</CardTitle>
          </CardHeader>
          <CardBody>
            {packets.length === 0 ? (
              <div className="text-sm text-slate-400">No packets yet.</div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                {packets.map((packet) => (
                  <div key={packet.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="text-sm text-white">{packet.name}</div>
                    <div className="text-xs text-slate-400 whitespace-pre-wrap">{packet.questions}</div>
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
