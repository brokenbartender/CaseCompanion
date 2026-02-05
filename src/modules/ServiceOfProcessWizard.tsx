import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { SERVICE_OF_PROCESS_GUIDE } from "../data/serviceOfProcess";
import { useState } from "react";
import { readJson, writeJson } from "../utils/localStore";

export default function ServiceOfProcessWizard() {
  const [useEService, setUseEService] = useState(false);
  const [proofs, setProofs] = useState<string[]>(() => readJson("case_companion_proof_uploads_v1", []));
  const [uploadStatus, setUploadStatus] = useState("");

  function handleProofUpload(file?: File | null) {
    if (!file) return;
    const next = [file.name, ...proofs].slice(0, 6);
    setProofs(next);
    writeJson("case_companion_proof_uploads_v1", next);
    setUploadStatus(`Saved: ${file.name}`);
  }

  return (
    <Page title="Service of Process" subtitle="Rule-aligned guidance and checklist.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Service Mode</CardSubtitle>
            <CardTitle>E‑Service vs Manual</CardTitle>
          </CardHeader>
          <CardBody>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={useEService}
                onChange={(e) => setUseEService(e.target.checked)}
              />
              I used e‑service through MiFILE
            </label>
            <div className="mt-2 text-xs text-slate-400">
              E‑service only works if the other party is registered in MiFILE. Otherwise you must serve manually.
            </div>
          </CardBody>
        </Card>
        {SERVICE_OF_PROCESS_GUIDE.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardSubtitle>Step</CardSubtitle>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">{step.detail}</div>
              <div className="mt-3 text-xs text-slate-500">Sources: {step.sources.join(", ")}</div>
            </CardBody>
          </Card>
        ))}
        {useEService ? (
          <Card>
            <CardHeader>
              <CardSubtitle>E‑Service</CardSubtitle>
              <CardTitle>Proof Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">
                MiFILE can generate proof of service when e‑service is used. Save the confirmation.
              </div>
            </CardBody>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardSubtitle>Proof of Service</CardSubtitle>
            <CardTitle>Upload Slot</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              type="file"
              onChange={(e) => handleProofUpload(e.target.files?.[0])}
              className="text-sm text-slate-300"
            />
            {uploadStatus ? <div className="mt-2 text-xs text-amber-200">{uploadStatus}</div> : null}
            {proofs.length ? (
              <div className="mt-3 text-xs text-slate-400">
                Recent uploads: {proofs.join(", ")}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">No proof files saved yet.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
