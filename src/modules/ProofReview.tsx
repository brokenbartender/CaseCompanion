import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

export default function ProofReview() {
  const proofs = readJson<string[]>("case_companion_proof_uploads_v1", []);

  return (
    <Page title="Proof of Service Review" subtitle="Review proof uploads and notes.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Proof Files</CardSubtitle>
            <CardTitle>Uploads</CardTitle>
          </CardHeader>
          <CardBody>
            {proofs.length === 0 ? (
              <div className="text-sm text-slate-400">No proof files uploaded yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {proofs.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
