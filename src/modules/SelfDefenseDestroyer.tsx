import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { useModuleAI } from "../hooks/useModuleAI";

export default function SelfDefenseDestroyer() {
  const [defenseStory, setDefenseStory] = useState("");
  const [caseFacts, setCaseFacts] = useState("");
  const [focus, setFocus] = useState("Identify contradictions, missing facts, and counter-evidence.");
  const { loading, output, error, run } = useModuleAI("self_defense_destroyer");

  function handleRun() {
    if (!defenseStory.trim() && !caseFacts.trim()) return;
    const prompt = [
      "You are roleplaying the defendant claiming self-defense.",
      "Work only from the provided content. Flag every assumption.",
      "",
      "DEFENSE STORY:",
      defenseStory,
      "",
      "KNOWN CASE FACTS:",
      caseFacts,
      "",
      "FOCUS:",
      focus
    ]
      .filter(Boolean)
      .join("\n");
    run(prompt);
  }

  return (
    <Page title="Self-Defense Destroyer" subtitle="Stress-test self-defense claims (informational only).">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Input</CardSubtitle>
            <CardTitle>Defense Narrative & Case Facts</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                rows={6}
                placeholder="Paste the defendant’s self-defense narrative or expected talking points."
                value={defenseStory}
                onChange={(e) => setDefenseStory(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                rows={6}
                placeholder="Paste your known facts (timeline, exhibits, witness notes)."
                value={caseFacts}
                onChange={(e) => setCaseFacts(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                placeholder="Focus prompt"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
              <button
                type="button"
                onClick={handleRun}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Generate Counter-Analysis"}
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Output</CardSubtitle>
            <CardTitle>Counter-Argument Map</CardTitle>
          </CardHeader>
          <CardBody>
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            {!output && !error ? (
              <div className="text-sm text-slate-400">Run the analysis to see results.</div>
            ) : (
              <pre className="whitespace-pre-wrap rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-100">
                {output}
              </pre>
            )}
            <div className="mt-3 text-xs text-slate-500">
              Informational tool only. Validate against admissible evidence.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
