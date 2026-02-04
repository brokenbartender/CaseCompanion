import React, { useMemo, useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { RULE_INDEX } from "../data/rulesIndex";

export default function RulesIndex() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RULE_INDEX.slice(0, 100);
    return RULE_INDEX.filter((entry) => entry.text.toLowerCase().includes(q)).slice(0, 200);
  }, [query]);

  return (
    <Page title="Rules Index" subtitle="Search across procedural rule headings.">
      <Card>
        <CardHeader>
          <CardSubtitle>Search</CardSubtitle>
          <CardTitle>Rule Headings</CardTitle>
        </CardHeader>
        <CardBody>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
            placeholder="Search rule headings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-4 space-y-2 text-sm text-slate-300 max-h-[500px] overflow-auto">
            {results.map((entry, idx) => (
              <div key={`${entry.source}-${idx}`} className="rounded-md border border-white/5 bg-white/5 p-3">
                <div className="text-xs text-slate-500">{entry.source}</div>
                <div className="text-sm text-slate-100">{entry.text}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
