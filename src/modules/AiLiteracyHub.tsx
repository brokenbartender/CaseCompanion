import React from "react";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "../components/ui/Card";
import Button from "../components/ui/Button";

const lessons = [
  { id: "verify", title: "Verify citations", description: "How to check Shepard’s signals and confirm authority." },
  { id: "prompts", title: "Writing strong prompts", description: "Jurisdiction, facts, goal, and format in one pass." },
  { id: "ethics", title: "Ethical AI use", description: "Transparency, confidentiality, and human‑in‑the‑loop review." },
  { id: "vault", title: "Knowledge vault", description: "Safe document storage, retention, and purge controls." }
];

export default function AiLiteracyHub() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">AI Literacy Hub</div>
        <div className="text-2xl font-semibold text-white mt-2">Learn to work safely with legal AI.</div>
        <div className="text-sm text-slate-400">Short guides, walkthroughs, and responsible‑use tips.</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map((lesson) => (
          <Card key={lesson.id} className="border border-white/10 bg-slate-900/60">
            <CardHeader>
              <CardTitle>{lesson.title}</CardTitle>
              <CardSubtitle>{lesson.description}</CardSubtitle>
            </CardHeader>
            <CardBody>
              <Button variant="secondary" size="sm">Open lesson</Button>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
        Tip: Always verify citations, and treat AI output as a draft until validated.
      </div>
    </div>
  );
}
