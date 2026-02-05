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
  const [defendantRegistered, setDefendantRegistered] = useState<"yes" | "no" | "unsure">("unsure");
  const [defendantType, setDefendantType] = useState("individual");

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
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="text-xs text-slate-400">Is the defendant registered in MiFILE?</div>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={defendantRegistered === "yes"}
                  onChange={() => setDefendantRegistered("yes")}
                />
                <span>Yes — registered in MiFILE</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={defendantRegistered === "no"}
                  onChange={() => setDefendantRegistered("no")}
                />
                <span>No — not registered</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={defendantRegistered === "unsure"}
                  onChange={() => setDefendantRegistered("unsure")}
                />
                <span>Not sure</span>
              </label>
              {defendantRegistered === "no" ? (
                <div className="text-xs text-amber-200">
                  Use manual service. E‑service alone is not enough if they are not registered.
                </div>
              ) : null}
              {defendantRegistered === "unsure" ? (
                <div className="text-xs text-amber-200">
                  Confirm with the clerk or MiFILE party list before relying on e‑service.
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Decision Helper</CardSubtitle>
            <CardTitle>Service Method</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="text-xs text-slate-400">Defendant type</div>
              <select
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={defendantType}
                onChange={(e) => setDefendantType(e.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="company">Company / business</option>
                <option value="government">Government entity</option>
              </select>
              <div className="text-xs text-amber-200">
                Suggested method:{" "}
                {defendantType === "individual"
                  ? "Personal service or alternate service with court approval."
                  : defendantType === "company"
                    ? "Serve registered agent or officer."
                    : "Serve the designated agent or clerk as required."}
              </div>
              <div className="text-[10px] text-slate-500">Verify rules under MCR 2.105.</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Rules</CardSubtitle>
            <CardTitle>MCR 2.102 / 2.104 / 2.105</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Summons issuance, service requirements, and proof of service rules apply here. Use official MCR text for
              exact details.
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
