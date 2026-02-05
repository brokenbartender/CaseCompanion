import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

export default function ProofReview() {
  const proofs = readJson<string[]>("case_companion_proof_uploads_v1", []);
  const [previewUrl, setPreviewUrl] = React.useState<string>("");
  const [previewName, setPreviewName] = React.useState<string>("");

  function handlePreview(file?: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewName(file.name);
  }

  return (
    <Page title="Proof of Service Review" subtitle="Review proof uploads and notes.">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardSubtitle>Proof Files</CardSubtitle>
            <CardTitle>Uploads</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-3">
              <input type="file" onChange={(e) => handlePreview(e.target.files?.[0])} className="text-sm text-slate-300" />
            </div>
            {proofs.length === 0 ? (
              <div className="text-sm text-slate-400">No proof files uploaded yet.</div>
            ) : (
              <ul className="space-y-2 text-sm text-slate-300">
                {proofs.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
            {previewUrl ? (
              <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400 mb-2">Preview: {previewName}</div>
                <iframe title="Proof preview" src={previewUrl} className="w-full h-72 rounded" />
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
