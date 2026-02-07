import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { SERVICE_OF_PROCESS_GUIDE } from "../data/serviceOfProcess";
import { useState } from "react";
import { readJson, writeJson } from "../utils/localStore";
import { createServiceAttempt, listServiceAttempts, uploadServiceAttemptProof } from "../services/caseApi";

export default function ServiceOfProcessWizard() {
  const [useEService, setUseEService] = useState(false);
  const [proofs, setProofs] = useState<string[]>(() => readJson("case_companion_proof_uploads_v1", []));
  const [uploadStatus, setUploadStatus] = useState("");
  const [defendantRegistered, setDefendantRegistered] = useState<"yes" | "no" | "unsure">("unsure");
  const [defendantType, setDefendantType] = useState("individual");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptForm, setAttemptForm] = useState({
    attemptedAt: "",
    address: "",
    method: "",
    outcome: "PENDING",
    notes: ""
  });
  const [attemptStatus, setAttemptStatus] = useState("");
  const [proofStatus, setProofStatus] = useState("");

  React.useEffect(() => {
    listServiceAttempts()
      .then((data: any) => setAttempts(Array.isArray(data?.attempts) ? data.attempts : []))
      .catch(() => null);
  }, []);

  async function saveAttempt() {
    if (!attemptForm.attemptedAt || !attemptForm.address || !attemptForm.method) {
      setAttemptStatus("Date, address, and method are required.");
      return;
    }
    try {
      const result: any = await createServiceAttempt(attemptForm);
      const next = [result.attempt, ...attempts].filter(Boolean);
      setAttempts(next);
      setAttemptStatus("Service attempt logged.");
      setAttemptForm({ attemptedAt: "", address: "", method: "", outcome: "PENDING", notes: "" });
    } catch (err: any) {
      setAttemptStatus(err?.message || "Failed to log service attempt.");
    }
  }

  async function attachProof(attemptId: string, file?: File | null) {
    if (!file) return;
    try {
      await uploadServiceAttemptProof(attemptId, file);
      setProofStatus("Proof uploaded.");
    } catch (err: any) {
      setProofStatus(err?.message || "Proof upload failed.");
    }
  }

  function handleProofUpload(file?: File | null) {
    if (!file) return;
    const next = [file.name, ...proofs].slice(0, 6);
    setProofs(next);
    writeJson("case_companion_proof_uploads_v1", next);
    setUploadStatus(`Saved: ${file.name}`);
    const evidence = readJson<any[]>("case_companion_dynamic_evidence_v1", []);
    const updated = [
      { name: file.name, path: file.name, ext: file.name.split(".").pop() || "file", category: "Proof of Service" },
      ...evidence.filter((e) => e.name !== file.name)
    ];
    writeJson("case_companion_dynamic_evidence_v1", updated);
  }

  return (
    <Page title="Service of Process" subtitle="Rule-aligned guidance and checklist.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Tracker</CardSubtitle>
            <CardTitle>Service Attempt Log</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Attempt Date</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="YYYY-MM-DD"
                  value={attemptForm.attemptedAt}
                  onChange={(e) => setAttemptForm({ ...attemptForm, attemptedAt: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Address</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={attemptForm.address}
                  onChange={(e) => setAttemptForm({ ...attemptForm, address: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Method</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  placeholder="Personal service, certified mail, etc."
                  value={attemptForm.method}
                  onChange={(e) => setAttemptForm({ ...attemptForm, method: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Outcome</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={attemptForm.outcome}
                  onChange={(e) => setAttemptForm({ ...attemptForm, outcome: e.target.value })}
                >
                  <option value="PENDING">Pending</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-slate-400">Notes</span>
                <textarea
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  rows={3}
                  value={attemptForm.notes}
                  onChange={(e) => setAttemptForm({ ...attemptForm, notes: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={saveAttempt}
              className="mt-4 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Log Service Attempt
            </button>
            {attemptStatus ? <div className="mt-2 text-xs text-amber-200">{attemptStatus}</div> : null}
            <div className="mt-4 text-xs text-slate-400">
              {attempts.length ? `Recent attempts: ${attempts.length}` : "No service attempts logged yet."}
            </div>
            {attempts.length ? (
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                {attempts.slice(0, 5).map((attempt) => (
                  <li key={attempt.id} className="rounded-md border border-white/10 bg-white/5 p-2">
                    <div>{attempt.attemptedAt?.slice(0, 10)} • {attempt.method} • {attempt.outcome}</div>
                    <label className="mt-2 block text-xs text-slate-400">
                      Attach proof file
                      <input
                        type="file"
                        onChange={(e) => attachProof(attempt.id, e.target.files?.[0])}
                        className="mt-1 text-xs text-slate-300"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {proofStatus ? <div className="mt-2 text-xs text-amber-200">{proofStatus}</div> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Service Mode</CardSubtitle>
            <CardTitle>E-Service vs Manual</CardTitle>
          </CardHeader>
          <CardBody>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-400"
                checked={useEService}
                onChange={(e) => setUseEService(e.target.checked)}
              />
              I used e-service through MiFILE
            </label>
            <div className="mt-2 text-xs text-slate-400">
              E-service only works if the other party is registered in MiFILE. Otherwise you must serve manually.
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
                <span>Yes - registered in MiFILE</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-amber-400"
                  checked={defendantRegistered === "no"}
                  onChange={() => setDefendantRegistered("no")}
                />
                <span>No - not registered</span>
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
                  Use manual service. E-service alone is not enough if they are not registered.
                </div>
              ) : null}
              {defendantRegistered === "unsure" ? (
                <div className="text-xs text-amber-200">
                  Confirm with the clerk or MiFILE party list before relying on e-service.
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
              <CardSubtitle>E-Service</CardSubtitle>
              <CardTitle>Proof Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">
                MiFILE can generate proof of service when e-service is used. Save the confirmation.
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
