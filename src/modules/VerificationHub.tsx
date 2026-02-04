import React, { useState } from "react";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Spinner from "../components/ui/Spinner";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { api } from "../services/api";
import { useSession } from "../hooks/useSession";

export default function VerificationHub() {
  const { authed } = useSession();
  const [caseName, setCaseName] = useState("LexiPro Verification Report");
  const [claimsJson, setClaimsJson] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const validateClaims = (raw: unknown) => {
    if (!Array.isArray(raw)) return false;
    return raw.every((item) => {
      if (!item || typeof item !== "object") return false;
      const anyItem = item as any;
      const text = String(anyItem.text || "").trim();
      if (!text) return false;
      const anchorIds = anyItem.anchorIds;
      if (!Array.isArray(anchorIds) || anchorIds.length === 0) return false;
      return anchorIds.every((id: any) => typeof id === "string" && id.trim().length > 0);
    });
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const parsed = JSON.parse(claimsJson);
      if (!validateClaims(parsed)) {
        throw new Error("WITHHELD: Claims are not anchored.");
      }

      // download PDF
      const url = await api.downloadBlobUrl("/reports/verification", {
        caseName,
        claims: parsed,
      });
      setDownloadUrl(url);
      // auto-open in new tab
      window.open(url, "_blank");
    } catch (e: any) {
      setError(e?.message || "Failed to generate report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Verification Hub"
      subtitle="Export a lender-ready, auditor-friendly PDF that proves every claim is anchored to a real source line."
      right={<Badge tone={authed ? "green" : "red"}>{authed ? "Auth OK" : "Signed out"}</Badge>}
    >
      {error ? <div className="mb-4"><Badge tone="red">{error}</Badge></div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Report inputs</CardTitle>
            <CardSubtitle>Case name + anchored claims array.</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <label className="block text-sm text-slate-300">
              Case / Report title
              <Input value={caseName} onChange={(e) => setCaseName(e.target.value)} className="mt-1" />
            </label>

            <div className="flex flex-wrap gap-2">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline text-slate-200"
                >
                  Open latest PDF
                </a>
              ) : null}
            </div>

            <Button variant="primary" onClick={generate} disabled={!authed || busy}>
              {busy ? <Spinner size={16} /> : <i className="fa-solid fa-file-pdf" />}
              Generate verification PDF
            </Button>

            <div className="text-xs text-slate-400 leading-relaxed">
              This endpoint is restricted to <span className="text-slate-200">admin</span> in the backend.
              If your evaluation user is not admin, you'll receive a 403.
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Claims JSON</CardTitle>
            <CardSubtitle>
              Expected shape: <span className="text-slate-200">[{`{ text, anchorIds, confidence? }`}]</span>
            </CardSubtitle>
          </CardHeader>
          <CardBody>
            <Textarea
              rows={18}
              value={claimsJson}
              onChange={(e) => setClaimsJson(e.target.value)}
              placeholder='[{"text":"...","anchorIds":["..."],"confidence":"high"}]'
            />
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
