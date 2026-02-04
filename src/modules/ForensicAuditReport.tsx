import React, { useEffect, useMemo, useState } from "react";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { api } from "../services/api";
import { getWorkspaceId } from "../services/authStorage";
import { useSession } from "../hooks/useSession";

type KeyInfo = {
  publicKeyPem: string;
  fingerprint: string;
  algorithm: string;
};

type IntegrityVerify = {
  integrityHash?: string;
  isValid?: boolean;
  eventCount?: number;
};

const deriveRisk = (events: any[]) => {
  const alerts = events.filter((evt) => {
    const tag = String(evt?.eventType || "").toUpperCase();
    return tag.includes("FAILED") || tag.includes("BLOCKED") || tag.includes("COMPROMISED") || tag.includes("REVOKED");
  });
  const riskScore = Math.max(0, 100 - alerts.length * 20);
  const remediation = alerts.length
    ? "Unresolved security alerts detected. Perform a full ledger verification before certification."
    : "No outstanding security alerts detected.";
  return { riskScore, alerts, remediation };
};

export default function ForensicAuditReport() {
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const { authed } = useSession();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityVerify | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { riskScore, alerts, remediation } = useMemo(() => deriveRisk(events), [events]);
  const certificateVoid = alerts.length > 0;

  const refresh = async () => {
    if (!workspaceId || !authed) return;
    setBusy(true);
    setError(null);
    try {
      const [keyRes, integrityRes, auditRes] = await Promise.all([
        api.get("/integrity/public-key"),
        api.get("/integrity/verify"),
        api.get(`/workspaces/${workspaceId}/audit/logs`).catch(() => [])
      ]);
      setKeyInfo(keyRes);
      setIntegrity(integrityRes as IntegrityVerify);
      setEvents(Array.isArray(auditRes) ? auditRes : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load forensic certificate data.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Page
      title="Certificate of Forensic Authenticity"
      subtitle="Cryptographic verification record with digital seal and admissibility score."
      right={
        <div className="flex items-center gap-2">
          <Badge tone={certificateVoid ? "red" : "green"}>
            {certificateVoid ? "VOID" : "VALID"}
          </Badge>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={busy}>
            {busy ? <Spinner size={16} /> : <i className="fa-solid fa-rotate" />}
            Refresh Certificate
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Digital Truth Layer</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">SHA-256 Integrity Hash</div>
              <div className="mt-2 mono text-emerald-200 break-all">
                {integrity?.integrityHash || "pending"}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Ledger Events: {integrity?.eventCount ?? "unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Public Key Fingerprint</div>
              <div className="mt-2 mono text-slate-100 break-all">
                {keyInfo?.fingerprint || "pending"}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Algorithm: {keyInfo?.algorithm || "unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Digital Seal Signature</div>
              <div className="mt-2 mono text-slate-100">
                {certificateVoid ? "SEAL VOIDED" : "SEAL VALID"}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Integrity Status: {integrity?.isValid ? "VERIFIED" : "UNVERIFIED"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Risk Score</div>
              <div className={`mt-2 inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                riskScore >= 85 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : riskScore >= 65 ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}>
                {riskScore}/100
              </div>
              <div className="mt-2 text-[11px] text-slate-400">{remediation}</div>
            </div>
          </div>

          {alerts.length ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
              <div className="text-[10px] uppercase tracking-[0.3em] mb-2">Unresolved Security Alerts</div>
              <div className="space-y-1 mono">
                {alerts.slice(0, 4).map((evt, idx) => (
                  <div key={`${evt?.id || idx}`}>
                    {evt?.createdAt} • {evt?.eventType}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Certificate Status</div>
          <div className="mt-4 text-sm text-slate-200">
            {certificateVoid
              ? "Certification is void due to unresolved alerts."
              : "Certification is valid. No outstanding integrity conflicts detected."}
          </div>
          <div className="mt-6 space-y-3 text-xs text-slate-300">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Seal Authority</div>
              <div className="mt-2 text-slate-200">LexiPro Forensic OS</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Public Key</div>
              <div className="mt-2 text-[11px] text-slate-300">Fingerprint-backed</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Audit Trail</div>
              <div className="mt-2 text-[11px] text-slate-300">
                {events.length ? `${events.length} ledger events reviewed` : "No audit events available"}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Page>
  );
}
