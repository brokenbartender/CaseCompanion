import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Page from "../components/ui/Page";
import Badge from "../components/ui/Badge";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { api } from "../services/api";
import { getWorkspaceId } from "../services/authStorage";

type AuditEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  actorId: string;
  resourceId?: string | null;
  hash?: string | null;
  prevHash?: string | null;
};

type SecurityAuditPayload = {
  workspaceId: string;
  integrityMode: string;
  signing: {
    status: "signed" | "unsigned";
    signerKeyId: string | null;
    algorithm: string | null;
  };
  lifecycle: Array<{
    stage: string;
    count: number;
    lastSeen: string | null;
    eventTypes: string[];
  }>;
  chainOfCustody: AuditEvent[];
  modelTrainingEvidence: {
    modelTrainingDisabled: boolean;
    flags: Record<string, string>;
    evidenceLocations: string[];
  };
  logShipping: {
    status: string;
    mode: string;
    destination: string;
  };
};

export default function SecurityAudit() {
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const location = useLocation();
  const auditEventId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("auditEventId") || "";
  }, [location.search]);
  const [data, setData] = useState<SecurityAuditPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    api.get("/security/audit")
      .then((payload) => {
        setData(payload as SecurityAuditPayload);
      })
      .catch((err: any) => setError(err?.message || "Security audit failed."))
      .finally(() => setBusy(false));
  }, [workspaceId]);

  return (
    <Page
      title="Security Audit"
      subtitle="Verifiable governance, signatures, and chain-of-custody evidence."
      right={<Badge tone={data?.signing.status === "signed" ? "green" : "amber"}>{data?.signing.status || "pending"}</Badge>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {auditEventId ? (
          <Card className="xl:col-span-3">
            <CardBody>
              <div className="text-xs text-slate-200">
                Audit event requested: <span className="mono text-emerald-200">{auditEventId}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Locate the entry in the chain-of-custody timeline below.
              </div>
            </CardBody>
          </Card>
        ) : null}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Integrity & Signing</CardTitle>
            <CardSubtitle>Current cryptographic posture for exported proof packets.</CardSubtitle>
          </CardHeader>
          <CardBody>
            {busy && !data ? (
              <div className="text-xs text-slate-400">Loading security posture...</div>
            ) : error ? (
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">
                {error}
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-200">
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <span className="text-slate-400">Integrity mode</span>
                  <Badge tone={data?.integrityMode === "signed" ? "green" : "amber"}>
                    {data?.integrityMode || "unknown"}
                  </Badge>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <span className="text-slate-400">Signing status</span>
                  <span className="font-semibold">{data?.signing.status || "unknown"}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <span className="text-slate-400">Signer key id</span>
                  <span className="mono text-[11px] break-all">{data?.signing.signerKeyId || "n/a"}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <span className="text-slate-400">Algorithm</span>
                  <span className="mono text-[11px]">{data?.signing.algorithm || "n/a"}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <span className="text-slate-400">Log shipping</span>
                  <span className="text-[11px] text-slate-300">
                    {data?.logShipping.status} ({data?.logShipping.destination})
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Lifecycle Summary</CardTitle>
            <CardSubtitle>Evidence processing trace from ingest to export.</CardSubtitle>
          </CardHeader>
          <CardBody>
            {data?.lifecycle?.length ? (
              <div className="space-y-3">
                {data.lifecycle.map((row) => (
                  <div key={row.stage} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{row.stage}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span>Events</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Last seen: {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : "n/a"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">No lifecycle events yet.</div>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>No Model Training</CardTitle>
            <CardSubtitle>Evidence of training disabled configuration.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="text-xs text-slate-200">This system does not train on client data.</div>
            <div className="mt-3 space-y-2 text-[11px] text-slate-300">
              {data?.modelTrainingEvidence?.flags ? (
                Object.entries(data.modelTrainingEvidence.flags).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <span className="text-slate-400">{key}</span>
                    <span className="mono">{value}</span>
                  </div>
                ))
              ) : null}
            </div>
            <div className="mt-3 text-[11px] text-slate-400">Evidence locations:</div>
            <div className="mt-2 space-y-1 text-[11px] text-slate-300">
              {data?.modelTrainingEvidence?.evidenceLocations?.map((loc) => (
                <div key={loc} className="mono break-all">{loc}</div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Chain-of-Custody Timeline</CardTitle>
            <CardSubtitle>Recent audit events for this workspace.</CardSubtitle>
          </CardHeader>
          <CardBody>
            {data?.chainOfCustody?.length ? (
              <div className="space-y-2">
                {data.chainOfCustody.map((evt) => (
                  <div
                    key={evt.id}
                    className={`rounded-lg border p-3 text-xs ${
                      auditEventId && evt.id === auditEventId
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-200"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{evt.eventType}</div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ""}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Resource: <span className="mono">{evt.resourceId || "n/a"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">No audit events available.</div>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Offline Verification</CardTitle>
            <CardSubtitle>How to validate a proof packet offline.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <ol className="list-decimal list-inside text-xs text-slate-200 space-y-2">
              <li>Extract the proof packet ZIP.</li>
              <li>Run: <span className="mono">node tools/verify-proof-packet.js &lt;folder&gt;</span></li>
              <li>Confirm PASS and review the manifest digests.</li>
            </ol>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
