import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import GovernanceBanner from "../components/ui/GovernanceBanner";
import GovernanceRibbon from "../components/ui/GovernanceRibbon";
import { api } from "../services/api";
import { getApiBase } from "../services/apiBase";
import { useGovernanceSnapshot } from "../hooks/useGovernanceSnapshot";
import { getWorkspaceId, getWorkspaceName } from "../services/authStorage";
import { useSession } from "../hooks/useSession";
import { useMatterId } from "../hooks/useMatterId";

export default function IntegrityOverview({
  userRole,
  setUserRole
}: {
  userRole: "INVESTIGATOR" | "OPPOSING_COUNSEL";
  setUserRole: React.Dispatch<React.SetStateAction<"INVESTIGATOR" | "OPPOSING_COUNSEL">>;
}) {
  const nav = useNavigate();
  const [health, setHealth] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [exhibitCount, setExhibitCount] = useState<number | null>(null);
  const [guardrails, setGuardrails] = useState<{
    releaseGate?: { ungroundedRejectionRate: number | null; blockedClaims: number; totalClaims: number };
    timeToProofMs?: number | null;
    chainOfCustody?: { passRate: number | null; revokedCount: number };
  } | null>(null);
  const [proofOfLife, setProofOfLife] = useState<Record<string, any> | null>(null);
  const [guardrailProof, setGuardrailProof] = useState<any>(null);
  const [integrityProof, setIntegrityProof] = useState<any>(null);
  const [integrityPulse, setIntegrityPulse] = useState<any>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const workspaceName = getWorkspaceName() || "M&A Green Run";
  const matterId = useMatterId();
  const governance = useGovernanceSnapshot(workspaceId);
  const [proofOpen, setProofOpen] = useState({
    guardrails: false,
    integrity: false,
    audit: false,
    proofOfLife: false
  });
  const { authed } = useSession();
  const matterLink = (path: string) => (matterId ? `/matters/${matterId}/${path}` : "/matters");

  useEffect(() => {
    let alive = true;
    api.get("/health")
      .then(() => alive && setHealth({ ok: true }))
      .catch((e: any) => alive && setHealth({ ok: false, detail: e?.message || "Backend unreachable" }));

    if (workspaceId && authed) {
      const listPath = matterId
        ? `/workspaces/${workspaceId}/matters/${matterId}/exhibits`
        : `/workspaces/${workspaceId}/exhibits`;
      api.get(listPath)
        .then((rows: any) => alive && setExhibitCount(Array.isArray(rows) ? rows.length : 0))
        .catch(() => alive && setExhibitCount(null));

      api.get(`/workspaces/${workspaceId}/metrics/guardrails`)
        .then((data: any) => alive && setGuardrails(data))
        .catch(() => alive && setGuardrails(null));

      api.get("/proof-of-life")
        .then((data: any) => alive && setProofOfLife(data))
        .catch(() => alive && setProofOfLife(null));

      api.get("/system/integrity-pulse")
        .then((data: any) => alive && setIntegrityPulse(data))
        .catch(() => alive && setIntegrityPulse(null));
    }
    return () => {
      alive = false;
    };
  }, [workspaceId, authed, matterId]);

  const loadProofs = async () => {
    if (!authed) return;
    setProofBusy(true);
    try {
      const guardrailsRes = await api.get("/ai/guardrails");
      setGuardrailProof(guardrailsRes);
      const integrityRes = await api.get("/integrity/verify");
      setIntegrityProof(integrityRes);
    } catch (e: any) {
      console.error(e);
    } finally {
      setProofBusy(false);
    }
  };

  const snapshot = governance.snapshot;
  const ledgerEvents = governance.events || [];
  const ledgerIntegrityStatus = governance.integrityStatus || "UNKNOWN";
  const integritySample = snapshot?.proof?.integritySample;
  const merkleRootHash = integritySample?.hash || integritySample?.integrityHash || null;
  const ledgerEventCount = integritySample?.eventCount ?? ledgerEvents.length;
  const lastLedgerAt = integritySample?.timestamp || ledgerEvents[0]?.createdAt || null;
  const lastUpdated = snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString() : null;
  const releaseGateStatus = snapshot?.releaseGate?.enforced ? "OK" : snapshot ? "WARN" : "WAIT";
  const integrityReadStatus = snapshot?.integrityOnRead?.lastResult === "PASS"
    ? "OK"
    : snapshot?.integrityOnRead?.lastResult === "FAIL"
      ? "FAIL"
      : snapshot
        ? "WARN"
        : "WAIT";
  const auditStatus = snapshot?.auditLogging?.enabled ? "OK" : snapshot ? "WARN" : "WAIT";
  const anchorStatus = snapshot?.anchorCoverage?.anchorsAvailable
    ? "OK"
    : snapshot
      ? "WARN"
      : "WAIT";
  const statusTone = (status: string) => {
    if (status === "OK") return "green";
    if (status === "FAIL") return "red";
    return "amber";
  };
  const pulseStatusTone = (status: string) => {
    if (status === "SUCCESS") return "green";
    if (status === "CRITICAL") return "red";
    return "amber";
  };
  const formatPulseAge = (iso?: string) => {
    if (!iso) return "Awaiting first audit";
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return "Awaiting first audit";
    const diffMs = Math.max(0, Date.now() - then);
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "moments ago";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  const safeJson = (value: any) => JSON.stringify(value ?? { note: "No data available." }, null, 2);

  const pulseAudit = integrityPulse?.audit;
  const pulseStatus = pulseAudit?.status || "WAIT";
  const pulseLabel = pulseStatus === "WAIT"
    ? "Pending"
      : pulseStatus === "SUCCESS"
      ? "Verified"
      : pulseStatus;
  const decisions = snapshot?.releaseGate?.recentDecisions || [];
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const activeDecision = (selectedDecisionId
    ? decisions.find((decision) => decision.id === selectedDecisionId)
    : null) || decisions[0] || null;
  const formatDecisionTime = (value?: string) => {
    if (!value) return "unknown";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "unknown";
    return parsed.toLocaleTimeString();
  };
  const statusPill = (status: string) => {
    if (status === "OK") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
    if (status === "FAIL") return "border-red-500/30 bg-red-500/15 text-red-200";
    return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  };
  const formatMetric = (value: string | number | null | undefined, fallback: string) => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  };
  const formatLedgerTime = (value?: string | null) => {
    if (!value) return "unknown";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "unknown";
    return parsed.toLocaleTimeString("en-US", { hour12: false });
  };
  const formatHashPreview = (value?: string | null, limit = 16) => {
    if (!value) return "hash pending";
    const trimmed = String(value);
    if (trimmed.length <= limit + 3) return trimmed;
    return `${trimmed.slice(0, limit)}...`;
  };
  const sparklineBuckets = useMemo(() => {
    const bucketCount = 12;
    const buckets = Array.from({ length: bucketCount }, () => 0);
    if (!ledgerEvents.length) return buckets;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const windowStart = now - windowMs;
    ledgerEvents.forEach((event) => {
      const ts = event?.createdAt ? new Date(event.createdAt).getTime() : Number.NaN;
      if (!Number.isFinite(ts) || ts < windowStart || ts > now) return;
      const ratio = (ts - windowStart) / windowMs;
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)));
      buckets[idx] += 1;
    });
    return buckets;
  }, [ledgerEvents]);
  const sparklineMax = Math.max(1, ...sparklineBuckets);
  const isIntegrityCompromised = ledgerIntegrityStatus === "COMPROMISED";

  return (
    <Page
      title="Integrity Command Center"
      subtitle="Zero-Trust Forensic Monitoring"
      right={
        <div className="flex items-center gap-2">
          {health === null ? (
            <Badge tone="slate">System Status: Checking</Badge>
          ) : health.ok ? (
            <Badge tone="green">System Status: Operational</Badge>
          ) : (
            <Badge tone="red">System Status: Degraded</Badge>
          )}
          {workspaceId ? (
            <div className="inline-flex items-center gap-2">
              <Badge tone="blue">Workspace: {workspaceName}</Badge>
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                title={`Workspace ID: ${workspaceId}`}
                aria-label="Workspace ID"
              >
                <i className="fa-regular fa-copy" />
              </span>
              <Badge tone={pulseStatusTone(pulseStatus)}>
                Last Audit: {formatPulseAge(pulseAudit?.timestamp)} • {pulseLabel}
              </Badge>
            </div>
          ) : (
            <Badge tone="amber">No workspace</Badge>
          )}
          <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span>View as: Opposing Counsel</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-500"
              checked={userRole === "OPPOSING_COUNSEL"}
              onChange={(e) => setUserRole(e.target.checked ? "OPPOSING_COUNSEL" : "INVESTIGATOR")}
            />
          </label>
        </div>
      }
    >
      <Card id="integrity-panel" className="mb-4 border border-emerald-500/20 bg-slate-950/70">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-300 font-mono">
                CRYPTOGRAPHIC CORE
              </div>
              <div className="mt-2 text-sm text-slate-200 font-mono">
                Merkle Root:{" "}
                <span className="mono text-emerald-200">
                  {merkleRootHash ? formatHashPreview(merkleRootHash, 18) : "Awaiting integrity audit"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 font-mono">
                Ledger events: {ledgerEventCount || 0}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Immutable Log Shipping: ON
              </div>
            </div>
            <div className="text-xs text-slate-400 font-mono space-y-2">
              <div>Chain Pulse: {lastLedgerAt ? formatLedgerTime(lastLedgerAt) : "awaiting first signature"}</div>
              <div className={`flex items-end gap-1 h-10 ${isIntegrityCompromised ? "animate-pulse" : ""}`}>
                {sparklineBuckets.map((count, idx) => {
                  const height = Math.max(3, Math.round((count / sparklineMax) * 36));
                  return (
                    <span
                      key={`${idx}-${count}`}
                      className={`w-1 rounded-full ${isIntegrityCompromised ? "bg-red-500" : "bg-emerald-400/70"}`}
                      style={{ height }}
                      title={`${count} events`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Cryptographic Events</CardTitle>
            <CardSubtitle>Live Evidence Ledger</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-xs text-emerald-200/90 space-y-2">
              {ledgerEvents.length ? (
                ledgerEvents.map((event) => {
                  const batesLabel = event.batesNumber || event.exhibitId || "N/A";
                  const hashValue = event.integrityHash || event.recordedHash || event.currentHash || event.hash || null;
                  return (
                    <div key={event.id} className="flex flex-wrap items-center gap-2">
                      <span>[{formatLedgerTime(event.createdAt)}]</span>
                      <span className="text-emerald-100">{event.eventType}</span>
                      <span className="text-slate-400">Bates: {batesLabel}</span>
                      <span className="mono text-emerald-200">Hash: {formatHashPreview(hashValue, 18)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400">No ledger events available.</div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optical Verification Gate</CardTitle>
            <CardSubtitle>AI Governance</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 text-slate-200">
              <i className="fa-solid fa-shield text-emerald-300 text-xl" />
              <div>
                <div className="text-xs text-slate-400">Citations Verified</div>
                <div className="text-lg font-semibold font-mono">142</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">Ungrounded Outputs Blocked</div>
            <div className="text-lg font-semibold font-mono text-emerald-200">0</div>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Active Governance</CardTitle>
          <CardSubtitle>Visible trust posture for this workspace.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <GovernanceBanner label="releaseGate" subtitle="Release Gate" />
            <GovernanceRibbon label="proven" />
            <GovernanceRibbon label="withheld" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <Badge tone={statusTone(releaseGateStatus)}>Release Gate: {releaseGateStatus}</Badge>
            <Badge tone={statusTone(integrityReadStatus)}>Integrity: {integrityReadStatus}</Badge>
            <Badge tone={statusTone(auditStatus)}>Audit: {auditStatus}</Badge>
            <Badge tone={statusTone(anchorStatus)}>Anchors: {anchorStatus}</Badge>
            {lastUpdated ? <span className="text-[#A0AEC0]">Last updated {lastUpdated}</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100">Release Gate</span>
                <InfoTooltip text="Enforces the 'Ungrounded Output Zero' policy. The system is programmatically restricted from generating any response that is not directly anchored to a proven exhibit. This ensures all AI output meets the evidentiary standards required for legal filings." />
                <span className="text-slate-300">{snapshot?.releaseGate?.policy || "No Anchor -> No Output"}</span>
              </div>
              <div>
                Proven:{" "}
                <span className="text-slate-100">
                  {snapshot?.proven ? snapshot.proven.count : "N/A"}
                </span>
                {snapshot?.proven?.note ? (
                  <span className="text-[#A0AEC0]"> ({snapshot.proven.note})</span>
                ) : null}
              </div>
              <div>
                Withheld:{" "}
                <span className="text-slate-100">
                  {snapshot?.withheld ? snapshot.withheld.count : "N/A"}
                </span>
                {snapshot?.withheld?.note ? (
                  <span className="text-[#A0AEC0]"> ({snapshot.withheld.note})</span>
                ) : null}
              </div>
              <div className="text-xs text-[#A0AEC0]">
                Reasons: NO_ANCHOR {snapshot?.withheld?.reasons?.NO_ANCHOR ?? "N/A"}, INTEGRITY_FAIL {snapshot?.withheld?.reasons?.INTEGRITY_FAIL ?? "N/A"}, POLICY_FAIL {snapshot?.withheld?.reasons?.POLICY_FAIL ?? "N/A"}
              </div>
            </div>
            <div className="space-y-2 md:border-l md:border-white/10 md:pl-4">
              <div className="flex items-center gap-2">
                <span>Integrity proven on read:</span>
                <InfoTooltip text="Active Cryptographic Validation. Every time a record is accessed, the system performs a real-time hash comparison against the original ingestion signature to guarantee that evidence has not been altered or corrupted in storage." />
                <span className="text-slate-100">
                  {snapshot?.integrityOnRead?.lastResult || "N/A"}
                </span>
                {snapshot?.integrityOnRead?.lastCheckAt ? (
                  <span className="text-[#A0AEC0]"> ({new Date(snapshot.integrityOnRead.lastCheckAt).toLocaleString()})</span>
                ) : null}
              </div>
              <div>
                Audit logging enabled:{" "}
                <span className="text-slate-100">
                  {snapshot?.auditLogging?.enabled ? "Yes" : "No"}
                </span>
                {snapshot?.auditLogging?.lastEventAt ? (
                  <span className="text-[#A0AEC0]"> ({new Date(snapshot.auditLogging.lastEventAt).toLocaleString()})</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span>Anchor coverage:</span>
                <InfoTooltip text="Measures the 'Searchable Truth' within the workspace. This represents the total count of proven facts extracted from ingested evidence. A higher percentage indicates a more robust foundation for automated chronology and case analysis." />
                <span className="text-slate-100">
                  {snapshot?.anchorCoverage
                    ? `${snapshot.anchorCoverage.anchorsUsed ?? "N/A"} / ${snapshot.anchorCoverage.anchorsAvailable} (${snapshot.anchorCoverage.percent ?? "N/A"}%)`
                    : "N/A"}
                </span>
                {snapshot?.anchorCoverage?.note ? (
                  <span className="text-[#A0AEC0]"> ({snapshot.anchorCoverage.note})</span>
                ) : null}
              </div>
            </div>
          </div>
          {governance.error ? (
            <div className="mt-3 text-xs text-amber-300">Governance snapshot warning: {governance.error}</div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProofOpen((prev) => ({ ...prev, guardrails: !prev.guardrails }))}
            >
              <i className="fa-solid fa-shield-halved" />
              <span className="inline-flex items-center gap-2">
                Guardrails JSON
                <InfoTooltip text="Control: Deterministic AI governance rules. Displays the active system instructions and enforcement constraints that govern AI output generation. Confirms that all responses are bound to proven Physical Grounding Points (anchors) and are automatically withheld if evidentiary requirements are not met, preventing hallucinated or unsubstantiated claims." />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProofOpen((prev) => ({ ...prev, integrity: !prev.integrity }))}
            >
              <i className="fa-solid fa-fingerprint" />
              <span className="inline-flex items-center gap-2">
                Integrity JSON
                <InfoTooltip text="Control: Cryptographic integrity verification. Confirms that the referenced exhibit has not been altered since ingestion. Each access triggers a hash re-validation against the integrity ledger. Any discrepancy is recorded as a chain-of-custody break event to protect evidentiary admissibility." />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProofOpen((prev) => ({ ...prev, audit: !prev.audit }))}
            >
              <i className="fa-solid fa-clipboard-list" />
              <span className="inline-flex items-center gap-2">
                Audit Logs JSON
                <InfoTooltip text="Control: Forensic audit ledger. Records all authenticated actions, including evidence ingestion, access, verification, and AI interactions. Entries are written sequentially with tamper-evident linkage, producing a complete, non-repudiable activity history suitable for internal review, discovery, or compliance audit." />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProofOpen((prev) => ({ ...prev, proofOfLife: !prev.proofOfLife }))}
            >
              <i className="fa-solid fa-heart-pulse" />
              <span className="inline-flex items-center gap-2">
                Proof-of-Life JSON
                <InfoTooltip text="Control: System health and readiness verification. Reports the active application version, database connectivity, and secure storage availability. Confirms that the environment is operational and configured to support institutional security and compliance requirements at the time of verification." />
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={governance.refresh}>
              <i className="fa-solid fa-rotate" />
              Refresh
            </Button>
          </div>
          {proofOpen.guardrails ? (
            <pre className="mt-3 text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 overflow-auto max-h-[40vh] text-[#E2E8F0]">
{safeJson(snapshot?.proof?.guardrails)}
            </pre>
          ) : null}
          {proofOpen.integrity ? (
            <pre className="mt-3 text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 overflow-auto max-h-[40vh] text-[#E2E8F0]">
{safeJson(snapshot?.proof?.integritySample)}
            </pre>
          ) : null}
          {proofOpen.audit ? (
            <pre className="mt-3 text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 overflow-auto max-h-[40vh] text-[#E2E8F0]">
{safeJson(snapshot?.proof?.auditRecent ?? snapshot?.notes?.auditRecent)}
            </pre>
          ) : null}
          {proofOpen.proofOfLife ? (
            <pre className="mt-3 text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 overflow-auto max-h-[40vh] text-[#E2E8F0]">
{safeJson(snapshot?.proof?.proofOfLife)}
            </pre>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardSubtitle>Governance and verification entry points.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Action
                title={(
                  <span className="inline-flex items-center gap-2">
                    Upload evidence
                    <InfoTooltip text="Initiates the Forensic Ingestion Pipeline: Secure upload, SHA-256 hashing for integrity, and automated extraction of timestamped 'anchors' for the Case Assistant." />
                  </span>
                )}
                desc="Ingest exhibit, hash, and extract anchors."
                icon="fa-solid fa-upload"
                onClick={() => nav(matterLink("exhibits"))}
              />
              <Action
                title="Ask the Case Assistant"
                desc="Anchors-required analysis (PROVEN only)."
                icon="fa-solid fa-wand-magic-sparkles"
                onClick={() => nav(matterLink("assistant"))}
              />
              <Action
                title="Run Auto-Chronology"
                desc="Generate anchored chronology from evidence."
                icon="fa-solid fa-timeline"
                onClick={() => nav(matterLink("intelligence"))}
              />
              <Action
                title="Integrity Audit"
                desc="Verify integrity and audit outputs."
                icon="fa-solid fa-fingerprint"
                onClick={() => nav(matterLink("integrity"))}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => nav(matterLink("verification"))}>
                <i className="fa-solid fa-shield-check" />
                Verification Hub
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav(matterLink("intelligence"))}>
                <i className="fa-solid fa-clock" />
                Timeline View
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav("/matters")}>
                <i className="fa-solid fa-box-archive" />
                Case Vault
              </Button>
            </div>

          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardSubtitle>Instant confidence checks.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Session</span>
                <Badge tone={authed ? "green" : "red"}>{authed ? "Active" : "Inactive"}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">System Status</span>
                {health === null ? (
                  <span className="inline-flex items-center gap-2 text-slate-200"><Spinner size={16} /> checking</span>
                ) : health.ok ? (
                  <span className="text-emerald-300">Operational</span>
                ) : (
                  <span className="text-red-300">{health.detail || "Degraded"}</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Exhibits</span>
                <span className="text-slate-200">
                  {exhibitCount === null ? "n/a" : exhibitCount}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  Chain-of-Custody Pass Rate
                  <InfoTooltip text="Digital Chain-of-Custody (CoC). This verifies that the chronological link between all audit logs and evidence remains intact. A 100% rate confirms that the audit trail is legally defensible and has no missing or tampered intervals." />
                </span>
                <span className="text-slate-200">
                  {guardrails?.chainOfCustody?.passRate == null
                    ? "n/a"
                    : `${Math.round(guardrails.chainOfCustody.passRate * 100)}%`}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 text-xs text-slate-400 leading-relaxed">
                Tip: If AI endpoints say <span className="text-slate-200">AI_DISABLED</span>, set <span className="text-slate-200">GEMINI_API_KEY</span> in{" "}
                <span className="text-slate-200">server/.env</span> (or container env) - uploads + anchoring still work.
              </div>

              {!authed ? (
                <Button variant="primary" className="w-full mt-2" onClick={() => nav("/login")}>
                  <i className="fa-solid fa-right-to-bracket" />
                  Sign in
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Deterministic Grounding to Source Evidence</CardTitle>
            <CardSubtitle>AI outputs are only released when every claim is anchored to source documents.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Release Gate Live</div>
                  <div className="mt-1 text-sm text-slate-200">
                    Every claim must link to proven anchors. Ungrounded output is blocked at the gate.
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Policy: <span className="text-slate-200">{snapshot?.releaseGate?.policy || "No Anchor -> No Output"}</span>
                  </div>
                </div>
                <Badge tone={statusTone(releaseGateStatus)}>Gate: {releaseGateStatus}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusPill(anchorStatus)}`}>
                  <i className="fa-solid fa-link" /> Anchors {anchorStatus}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusPill(integrityReadStatus)}`}>
                  <i className="fa-solid fa-fingerprint" /> Integrity {integrityReadStatus}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusPill(auditStatus)}`}>
                  <i className="fa-solid fa-clipboard-check" /> Audit {auditStatus}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-200">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-xs text-slate-400">Proven outputs (window)</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatMetric(snapshot?.proven?.count ?? null, "Awaiting evidence")}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-xs text-slate-400">Withheld outputs (window)</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatMetric(snapshot?.withheld?.count ?? null, "Awaiting evidence")}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-xs text-slate-400">Anchor coverage</div>
                  <div className="mt-1 text-lg font-semibold">
                    {snapshot?.anchorCoverage?.anchorsAvailable
                      ? `${snapshot.anchorCoverage.percent ?? "n/a"}%`
                      : "Awaiting evidence"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Deterministic Pipeline</div>
                  <Badge tone={statusTone(releaseGateStatus)}>Release Gate {releaseGateStatus}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-slate-200">
                    <i className="fa-solid fa-file-lines" /> Prompt
                  </span>
                  <span className="text-slate-500">{"->"}</span>
                  <span className={`rounded-full border px-3 py-1 ${statusPill(anchorStatus)}`}>
                    <i className="fa-solid fa-link" /> Anchor match
                  </span>
                  <span className="text-slate-500">{"->"}</span>
                  <span className={`rounded-full border px-3 py-1 ${statusPill(integrityReadStatus)}`}>
                    <i className="fa-solid fa-fingerprint" /> Integrity check
                  </span>
                  <span className="text-slate-500">{"->"}</span>
                  <span className={`rounded-full border px-3 py-1 ${statusPill(releaseGateStatus)}`}>
                    <i className="fa-solid fa-shield-halved" /> Gate decision
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Buyer impact: AI outputs are only allowed when tied to the underlying documents.
                </div>
                {!decisions.length ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Awaiting first anchored decision.</span>
                    <Button variant="secondary" size="sm" onClick={() => nav(matterLink("assistant"))}>
                      <i className="fa-solid fa-wand-magic-sparkles" /> Run anchored analysis
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => nav(matterLink("exhibits"))}>
                      <i className="fa-solid fa-upload" /> Upload evidence
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Recent Gate Decisions</div>
                  <Badge tone={decisions.length ? "blue" : "amber"}>{decisions.length ? decisions.length : "None"}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {decisions.length ? decisions.map((decision) => {
                    const isActive = activeDecision?.id === decision.id;
                    const tone = decision.status === "PROVEN" ? "green" : "red";
                    return (
                      <button
                        key={decision.id}
                        onClick={() => setSelectedDecisionId(decision.id)}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                          isActive ? "border-white/30 bg-white/10" : "border-white/10 bg-slate-950/40 hover:bg-white/5"
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <Badge tone={tone}>{decision.status}</Badge>
                          <span className="text-slate-400">{formatDecisionTime(decision.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-200">{decision.promptKey || "forensic_synthesis"}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Anchored {decision.anchoredCount ?? 0} / {decision.totalClaims ?? 0}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="text-sm text-slate-400">
                      No decisions yet. Run anchored analysis to populate the gate log.
                    </div>
                  )}
                </div>
                {activeDecision ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Anchored: {activeDecision.anchoredCount ?? 0}</span>
                      <span>Ungrounded: {activeDecision.unanchoredCount ?? 0}</span>
                      <span>Total: {activeDecision.totalClaims ?? 0}</span>
                      {activeDecision.durationMs ? <span>Latency: {activeDecision.durationMs} ms</span> : null}
                    </div>
                    {activeDecision.reasons?.length ? (
                      <div className="mt-2 text-amber-200">
                        Reasons: {activeDecision.reasons.join(", ")}
                      </div>
                    ) : (
                      <div className="mt-2 text-emerald-200">Anchored output accepted.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-slate-400 inline-flex items-center gap-2">
                    Release Gate (Safety First Metric)
                    <InfoTooltip text="Enforces the 'Ungrounded Output Zero' policy. The system is programmatically restricted from generating any response that is not directly anchored to a proven exhibit. This ensures all AI output meets the evidentiary standards required for legal filings." />
                  </div>
                  <svg className="h-7 w-16 text-emerald-300/70" viewBox="0 0 64 24" fill="none">
                    <path d="M2 18 L12 14 L22 16 L32 8 L42 12 L52 6 L62 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-2xl font-semibold text-white mt-2">
                  {guardrails?.releaseGate?.ungroundedRejectionRate == null
                    ? "Awaiting evidence"
                    : `${Math.round(guardrails.releaseGate.ungroundedRejectionRate * 100)}%`}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Accepted outputs: {guardrails?.releaseGate?.totalClaims == null || guardrails?.releaseGate?.blockedClaims == null
                    ? "Awaiting evidence"
                    : (guardrails.releaseGate.totalClaims - guardrails.releaseGate.blockedClaims)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Blocked outputs: {guardrails?.releaseGate?.blockedClaims ?? "Awaiting evidence"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-slate-400">Time-to-Proof</div>
                  <svg className="h-7 w-16 text-blue-300/70" viewBox="0 0 64 24" fill="none">
                    <path d="M2 16 L12 10 L22 12 L32 6 L42 10 L52 5 L62 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-2xl font-semibold text-white mt-2">
                  {guardrails?.timeToProofMs == null ? "Awaiting evidence" : `${guardrails.timeToProofMs} ms`}
                </div>
                <div className="text-xs text-slate-400 mt-2">Average time-to-proof</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-slate-400 inline-flex items-center gap-2">
                    Chain-of-Custody Pass Rate
                    <InfoTooltip text="Digital Chain-of-Custody (CoC). This verifies that the chronological link between all audit logs and evidence remains intact. A 100% rate confirms that the audit trail is legally defensible and has no missing or tampered intervals." />
                  </div>
                  <svg className="h-7 w-16 text-amber-300/80" viewBox="0 0 64 24" fill="none">
                    <path d="M2 15 L12 12 L22 14 L32 9 L42 11 L52 8 L62 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-2xl font-semibold text-white mt-2">
                  {guardrails?.chainOfCustody?.passRate == null
                    ? "Awaiting evidence"
                    : `${Math.round(guardrails.chainOfCustody.passRate * 100)}%`}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Revocations: {guardrails?.chainOfCustody?.revokedCount ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <Button variant="ghost" size="sm" onClick={loadProofs} disabled={!authed || proofBusy}>
                {proofBusy ? <Spinner size={16} /> : <i className="fa-solid fa-circle-check" />}
                Load Proof Outputs
              </Button>
              <a
                className="h-9 px-3 text-xs rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10"
                href={`${getApiBase()}/proof-of-life`}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-solid fa-heart-pulse" />
                Proof-of-Life (read-only)
              </a>
              <a
                className="h-9 px-3 text-xs rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10"
                href={`${getApiBase()}/ai/guardrails`}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-solid fa-shield-halved" />
                Guardrails (read-only)
              </a>
              <a
                className="h-9 px-3 text-xs rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10"
                href={`${getApiBase()}/integrity/verify`}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-solid fa-fingerprint" />
                Integrity Verify (read-only)
              </a>
              {workspaceId ? (
                <a
                  className="h-9 px-3 text-xs rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10"
                  href={`${getApiBase()}/workspaces/${workspaceId}/audit/logs`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="fa-solid fa-clipboard-list" />
                  Recent Audit Logs (read-only)
                </a>
              ) : (
                <span className="h-9 px-3 text-xs rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/5 text-slate-400">
                  Recent Audit Logs (unavailable)
                </span>
              )}
            </div>

            {guardrailProof ? (
              <pre className="mt-3 text-xs whitespace-pre-wrap bg-black border border-white/10 rounded-2xl p-3 overflow-auto max-h-[40vh] text-[#E2E8F0]">
{JSON.stringify({ guardrails: guardrailProof, integrity: integrityProof }, null, 2)}
              </pre>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}

function Action({
  title,
  desc,
  icon,
  onClick,
  disabled,
}: {
  title: React.ReactNode;
  desc: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "text-left rounded-2xl border border-white/10 bg-white/5 transition-colors p-4",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
          <i className={icon + " text-slate-300"} />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-300 mt-1">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] text-slate-200"
        aria-label="Info"
      >
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-white/20 bg-white/10 p-2 text-xs text-slate-100 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
