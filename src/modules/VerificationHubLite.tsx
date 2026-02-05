import React, { useState } from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { readJson } from "../utils/localStore";

const SETTINGS_KEY = "case_companion_settings_v1";

type CaseSettings = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

export default function VerificationHubLite() {
  const settings = readJson<CaseSettings>(SETTINGS_KEY, { apiBase: "", workspaceId: "", authToken: "" });
  const [exhibitId, setExhibitId] = useState("");
  const [status, setStatus] = useState("");

  async function downloadCertificate() {
    if (!settings.apiBase || !settings.workspaceId || !settings.authToken) {
      setStatus("Set API base, workspace ID, and auth token in Case Settings.");
      return;
    }
    try {
      setStatus("Preparing certificate...");
      const res = await fetch(
        `${settings.apiBase}/api/workspaces/${encodeURIComponent(settings.workspaceId)}/exhibits/${encodeURIComponent(exhibitId)}/certificate`,
        { headers: { Authorization: `Bearer ${settings.authToken}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate_${exhibitId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded.");
    } catch (err: any) {
      setStatus(err?.message || "Download failed.");
    }
  }

  return (
    <Page title="Verification Hub" subtitle="Download integrity certificates.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Certificate</CardSubtitle>
            <CardTitle>Download</CardTitle>
          </CardHeader>
          <CardBody>
            <input
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
              placeholder="Exhibit ID"
              value={exhibitId}
              onChange={(e) => setExhibitId(e.target.value)}
            />
            <button
              type="button"
              onClick={downloadCertificate}
              className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              Download Certificate
            </button>
            {status ? <div className="mt-2 text-xs text-amber-200">{status}</div> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Purpose</CardSubtitle>
            <CardTitle>Why This Matters</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-sm text-slate-300">
              Certificates provide hash verification and audit context for authenticity claims.
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
