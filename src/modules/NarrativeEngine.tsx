import React from "react";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function NarrativeEngine() {
  return (
    <div className="p-6 text-slate-100">
      <Card>
        <CardHeader>
          <CardTitle>Aigis Prime // Truth Engine</CardTitle>
          <CardSubtitle>Claims are released only after optical grounding passes.</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Runtime</div>
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />
            I am Aigis. I verify evidence coordinates.
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-200 leading-relaxed">
              The exhibit chronology confirms a controlled access event on 10/12/2025
              <span
                className="ml-2 inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-200"
                title="Text optically matched to source PDF"
              >
                [1]
              </span>{" "}
              with an additional verification of custody transfer on 10/14/2025
              <span
                className="ml-2 inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-200"
                title="Text optically matched to source PDF"
              >
                [2]
              </span>
              .
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Badge tone="blue">Verified Anchors</Badge>
              <span>Text optically matched to source PDF</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
