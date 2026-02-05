import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { EVIDENCE_INDEX } from "../data/evidenceIndex";
import { readJson } from "../utils/localStore";

export default function IntegrityOverviewLite() {
  const proofs = readJson<string[]>("case_companion_proof_uploads_v1", []);
  const timeline = readJson<any[]>("case_companion_timeline_v1", []);

  return (
    <Page title="Integrity Overview" subtitle="Quick status for evidence integrity.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardSubtitle>Evidence</CardSubtitle>
            <CardTitle>Exhibits Indexed</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-white">{EVIDENCE_INDEX.length}</div>
            <div className="mt-2 text-xs text-slate-400">Evidence entries indexed locally.</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Proof</CardSubtitle>
            <CardTitle>Service Proofs</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-white">{proofs.length}</div>
            <div className="mt-2 text-xs text-slate-400">Proof uploads saved.</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardSubtitle>Timeline</CardSubtitle>
            <CardTitle>Events Logged</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-white">{timeline.length}</div>
            <div className="mt-2 text-xs text-slate-400">Events in chronology.</div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
