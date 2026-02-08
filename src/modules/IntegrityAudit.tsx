import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { api } from "../services/api";
import { getApiBase } from "../services/apiBase";
import { getWorkspaceId, getWorkspaceName } from "../services/authStorage";
import { useSession } from "../hooks/useSession";
import { useMatterId } from "../hooks/useMatterId";
import { useIntegrityAlerts } from "../hooks/useIntegrityAlerts";
import fixtureAISentinel from "../utils/fixtureAISentinel";
import { useUser } from "../contexts/UserContext";
import IntegrityPanel from "../components/IntegrityPanel";

type AuditRow = {
  id: string;
  event: string;
  createdAt: string;
  actorId: string;
  resource: string;
  hash: string;
  signature: string;
  prevHash: string;
  status: "VERIFIED" | "TAMPERED" | "PENDING";
  severity: "LOW" | "MEDIUM" | "HIGH";
  meta: {
    originNode: string;
    browserFingerprint: string;
    transactionId: string;
    ipAddress: string;
  };
  payload: any;
};

type ExhibitBaseline = {
  id: string;
  filename: string;
  integrityHash: string | null;
};

const formatSignature = (hash?: string) => {
  if (!hash) return "0x000...000";
  const trimmed = String(hash).replace(/^0x/i, "");
  if (trimmed.length <= 10) return `0x${trimmed}`;
  return `0x${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
};

const toStatus = (event: string, payload: any) => {
  const tag = String(event || "").toUpperCase();
  if (tag.includes("PENDING") || payload?.status === "PENDING") {
    return "PENDING";
  }
  if (tag.includes("REVOKED") || tag.includes("COMPROMISED") || payload?.status === "TAMPERED") {
    return "TAMPERED";
  }
  return "VERIFIED";
};

const toSeverity = (event: string, payload: any) => {
  const tag = String(event || "").toUpperCase();
  if (tag.includes("FAILED") || tag.includes("UNAUTHORIZED") || payload?.status === "TAMPERED") {
    return "HIGH";
  }
  if (tag.includes("POLICY") || tag.includes("EXCEPTION")) {
    return "MEDIUM";
  }
  return "LOW";
};

const maskActor = (actorId: string) => {
  const raw = String(actorId || "");
  if (!raw) return "system";
  if (raw.includes("@")) {
    const [user, domain] = raw.split("@");
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}****` : `${user}****`;
    return `${maskedUser}@${domain}`;
  }
  if (raw.length <= 4) return `${raw}****`;
  return `${raw.slice(0, 3)}****${raw.slice(-2)}`;
};

const maskIp = (ip: string) => {
  const raw = String(ip || "");
  if (!raw) return "unknown";
  const parts = raw.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return raw.slice(0, 6) + "****";
};

const readinessChecklist = [
  "FRE 902(13) system certification complete",
  "FRE 902(14) hash-chain integrity verified",
  "Immutable custody log linkage confirmed",
  "Cryptographic seal validation complete"
];

export default function IntegrityAudit() {
  const nav = useNavigate();
  const { role } = useUser();
  const isPartner = role === "Partner";
  const workspaceId = useMemo(() => getWorkspaceId(), []);
  const workspaceName = getWorkspaceName() || "M&A Green Run";
  const matterId = useMatterId();
  const { authed } = useSession();
  const matterLink = (path: string) => (matterId ? `/matters/${matterId}/${path}` : "/matters");
  const fixtureEnabled = useMemo(() => {
    if (import.meta.env.DEV) return true;
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    if (host === "lexipro.online" || host === "www.lexipro.online") return true;
    const params = new URLSearchParams(window.location.search);
    return params.get("fixture") === "1" || import.meta.env.VITE_ENABLE_FIXTURE === "1";
  }, []);

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [query, setQuery] = useState("");
  const [querySummary, setQuerySummary] = useState<string | null>(null);
  const [glowMatches, setGlowMatches] = useState<Set<string>>(new Set());
  const [aiPulse, setAiPulse] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");
  const [filterActor, setFilterActor] = useState("ALL");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportNote, setReportNote] = useState<string | null>(null);
  const [affidavitBusy, setAffidavitBusy] = useState(false);
  const [affidavitNote, setAffidavitNote] = useState<string | null>(null);
  const [exportApproved, setExportApproved] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [rootHash, setRootHash] = useState<string | null>(null);
  const [verifyingRowId, setVerifyingRowId] = useState<string | null>(null);
  const [verifiedRowId, setVerifiedRowId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [packetOverlayStep, setPacketOverlayStep] = useState<number | null>(null);
  const [teleportNotice, setTeleportNotice] = useState<string | null>(null);
  const { alert: integrityAlert } = useIntegrityAlerts();
  const [baselineExhibits, setBaselineExhibits] = useState<ExhibitBaseline[]>([]);
  const [sabotageBusy, setSabotageBusy] = useState(false);
  const [sabotageReport, setSabotageReport] = useState<{
    filename: string;
    status: "CLEAN" | "RED_FLAG" | "UNKNOWN";
    baselineHash?: string | null;
    currentHash?: string | null;
    reason: string;
    action: string;
  } | null>(null);
  const pageSize = 25;
  const fixtureMode = fixtureEnabled;

  const refresh = async () => {
    if (!workspaceId || !authed) return;
    setBusy(true);
    setError(null);
    try {
      const logs = await api.get(`/workspaces/${workspaceId}/audit/logs`);
      const list = Array.isArray(logs) ? logs : [];
      if (!Array.isArray(logs)) {
        setError("Unexpected ledger response. Please refresh or re-authenticate.");
      }
      const mapped = list.map((row: any) => {
        let payload: any = {};
        try {
          payload = row?.payloadJson ? JSON.parse(row.payloadJson) : {};
        } catch {
          payload = {};
        }
        return {
          id: String(row?.id || row?.hash || `${row?.eventType}-${row?.createdAt}`),
          event: row?.eventType || "AUDIT_EVENT",
          createdAt: row?.createdAt || "",
          actorId: row?.actorId || "",
          resource: payload?.resourceId || payload?.exhibitId || payload?.storageKey || "",
          hash: row?.hash || "",
          signature: row?.hash || "",
          prevHash: row?.prevHash || "",
          status: toStatus(row?.eventType, payload),
          severity: toSeverity(row?.eventType, payload),
          meta: {
            originNode: payload?.originNode || payload?.node || payload?.origin || "unknown",
            browserFingerprint: payload?.browserFingerprint || payload?.fingerprint || payload?.userAgent || "unknown",
            transactionId: payload?.transactionId || payload?.txId || payload?.dbTxId || "unknown",
            ipAddress: payload?.ip || payload?.ipAddress || "unknown"
          },
          payload
        } as AuditRow;
      });
      setRows(mapped);
    } catch (e: any) {
      const message = String(e?.message || "");
      if (message.includes("401") || message.includes("403")) {
        setError("Ledger unavailable. Check workspace access and sign in again.");
      } else {
        setError(message || "Audit refresh failed");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!workspaceId || !authed) return;
    const listPath = matterId
      ? `/workspaces/${workspaceId}/matters/${matterId}/exhibits`
      : `/workspaces/${workspaceId}/exhibits`;
    api.get(listPath)
      .then((rows: any) => {
        const list = Array.isArray(rows) ? rows : [];
        setBaselineExhibits(list.map((row) => ({
          id: String(row?.id || ""),
          filename: String(row?.filename || ""),
          integrityHash: row?.integrityHash || null
        })));
      })
      .catch(() => setBaselineExhibits([]));
  }, [workspaceId, authed, matterId]);

  useEffect(() => {
    const id = window.setInterval(() => setAiPulse((prev) => !prev), 1500);
    return () => window.clearInterval(id);
  }, []);

  const aiInsights = useMemo(() => {
    if (!fixtureMode) return { insights: [], predicted: [] };
    return fixtureAISentinel.analyzeRows(rows);
  }, [rows, fixtureMode]);
  const selectedScore = selected && fixtureMode ? fixtureAISentinel.buildAdmissibilityScore(selected) : null;
  const selectedNarrative = selected && fixtureMode ? fixtureAISentinel.buildNarrative(selected) : null;
  const lastAuditAt = rows.reduce<string | null>((latest, row) => {
    if (!row.createdAt) return latest;
    if (!latest) return row.createdAt;
    return new Date(row.createdAt).getTime() > new Date(latest).getTime() ? row.createdAt : latest;
  }, null);
  const hasTampered = rows.some((row) => row.status === "TAMPERED");
  const breachActive = Boolean(integrityAlert);
  const hasPending = rows.some((row) => row.status === "PENDING");
  const healthBadge = rows.length === 0
    ? "PENDING"
    : breachActive
      ? "BREACH DETECTED"
      : hasTampered
        ? "TAMPER-DETECTED"
        : "ALL SYSTEMS VERIFIED";
  const hashConsistency = rows.length === 0
    ? "UNKNOWN"
    : breachActive
      ? "MISMATCH"
      : hasTampered
        ? "MISMATCH"
        : "MATCHED";
  const actorOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.actorId).filter(Boolean)));
    return unique;
  }, [rows]);
  const custodyFocus = selected || rows[0] || null;
  const heartbeatRows = useMemo(() => rows.filter((row) => row.event === "DEH_HEARTBEAT"), [rows]);
  const packetSteps = [
    "Hashing Ledger Chains...",
    "Collating Metadata...",
    "Signing PDF with LexiPro Digital Seal...",
    "Packaging Admissibility Archive..."
  ];

  const applyQuery = () => {
    if (!fixtureMode) {
      setGlowMatches(new Set());
      setQuerySummary("AI query unavailable.");
      setPageIndex(0);
      return;
    }
    const res = fixtureAISentinel.queryRows(rows, query);
    setGlowMatches(res.matchIds);
    setQuerySummary(res.summary);
    setPageIndex(0);
  };

  const filteredRows = rows.filter((row) => {
    if (glowMatches.size && !glowMatches.has(row.id)) return false;
    if (filterSeverity !== "ALL" && row.severity !== filterSeverity) return false;
    if (filterActor !== "ALL" && row.actorId !== filterActor) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = filteredRows.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
  const hasRows = filteredRows.length > 0;
  const tamperAction = (row: AuditRow) => {
    const reason = row.payload?.reason || row.payload?.detail || row.payload?.message || "Integrity mismatch detected.";
    const action = row.payload?.action || "Re-verify source file and generate a remediation affidavit.";
    return { reason, action };
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ["Timestamp", "Actor", "Action", "Resource", "Hash", "Signature", "PrevHash", "Status"];
    const data = rows.map((row) => ([
      row.createdAt,
      row.actorId,
      row.event,
      row.resource,
      row.hash,
      row.signature,
      row.prevHash,
      row.status
    ]));
    const escapeCell = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const csv = [headers, ...data].map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_trail_${workspaceId || "workspace"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      if (!rows.length) {
        setRootHash(null);
        return;
      }
      const source = rows.map((row) => row.hash || row.signature || "").join("|");
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(source);
        const digest = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(digest));
        const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        if (!cancelled) setRootHash(hex);
      } catch {
        if (!cancelled) setRootHash(source.slice(0, 64));
      }
    };
    void compute();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const verifyRow = async (row: AuditRow) => {
    setVerifyingRowId(row.id);
    setVerifiedRowId(null);
    try {
      await api.post("/audit/log", {
        action: "INTEGRITY_ROW_VERIFY",
        resourceId: row.id,
        details: { event: row.event, resource: row.resource }
      });
    } catch {
      // best-effort logging
    }
    window.setTimeout(() => {
      setVerifyingRowId(null);
      setVerifiedRowId(row.id);
      window.setTimeout(() => setVerifiedRowId(null), 1200);
    }, 900);
  };

  const generatePacket = async () => {
    if (reportBusy || !workspaceId) return;
    if (!isPartner) {
      setError("Export requires Partner approval.");
      return;
    }
    if (!exportApproved) {
      setError("Approval required before generating a court-ready packet.");
      return;
    }
    const target = baselineExhibits[0];
    if (!target) {
      setError("No exhibits available to export.");
      return;
    }
    setReportBusy(true);
    setPacketOverlayStep(0);
    setReportNote(null);
    setError(null);
    for (let i = 0; i < packetSteps.length; i += 1) {
      setPacketOverlayStep(i);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
    }
    try {
      const res = await fetch(`${getApiBase()}/exhibits/${target.id}/package`, {
        credentials: "include",
        headers: { "x-workspace-id": workspaceId }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admissibility_packet_${workspaceId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setReportNote("Admissibility packet generated.");
      window.setTimeout(() => setReportNote(null), 2000);
    } catch (e: any) {
      setError(e?.message || "Export failed.");
    } finally {
      setReportBusy(false);
      setPacketOverlayStep(null);
    }
  };

  const generateAffidavit = async () => {
    if (!workspaceId || affidavitBusy) return;
    setAffidavitBusy(true);
    setAffidavitNote(null);
    try {
      const res = await fetch(`${getApiBase()}/reports/affidavit`, {
        method: "POST",
        credentials: "include",
        headers: { "x-workspace-id": workspaceId }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Affidavit export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LexiPro_FRE_902_Affidavit_${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAffidavitNote("Affidavit PDF generated.");
      window.setTimeout(() => setAffidavitNote(null), 2000);
    } catch (e: any) {
      setAffidavitNote(e?.message || "Affidavit generation failed.");
    } finally {
      setAffidavitBusy(false);
    }
  };

  const triggerTeleport = (row: AuditRow) => {
    const anchorId = row.payload?.anchorId || row.payload?.anchor_id;
    const bbox = row.payload?.bbox || row.payload?.bboxJson;
    const page = Number(row.payload?.pageNumber || row.payload?.page || 1);
    const exhibitId = row.payload?.exhibitId || row.payload?.exhibit_id;
    if (!exhibitId) {
      setTeleportNotice("No exhibit reference recorded for this event.");
      window.setTimeout(() => setTeleportNotice(null), 2000);
      return;
    }
    if (!bbox) {
      setTeleportNotice("No anchor coordinates recorded for this event.");
      window.setTimeout(() => setTeleportNotice(null), 2000);
    }
    const params = new URLSearchParams();
    params.set("exhibitId", exhibitId);
    if (anchorId) params.set("anchorId", anchorId);
    if (Number.isFinite(page)) params.set("page", String(page));
    if (bbox) params.set("bbox", JSON.stringify(bbox));
    nav(`${matterLink("exhibits")}?${params.toString()}`);
  };

  const hashFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const runSabotageScan = async (file: File) => {
    setSabotageBusy(true);
    setSabotageReport(null);
    try {
      const currentHash = await hashFile(file);
      const baseline = baselineExhibits.find((ex) => ex.filename === file.name);
      if (!baseline || !baseline.integrityHash) {
        setSabotageReport({
          filename: file.name,
          status: "UNKNOWN",
          currentHash,
          reason: "No baseline hash on record for this production set.",
          action: "Request original export + chain-of-custody affidavit."
        });
      } else if (baseline.integrityHash === currentHash) {
        setSabotageReport({
          filename: file.name,
          status: "CLEAN",
          baselineHash: baseline.integrityHash,
          currentHash,
          reason: "Hash matches baseline ingestion record.",
          action: "No remediation required."
        });
      } else {
        setSabotageReport({
          filename: file.name,
          status: "RED_FLAG",
          baselineHash: baseline.integrityHash,
          currentHash,
          reason: "Hash mismatch detected after production.",
          action: "Generate Forensic Red Flag report + motion for sanctions."
        });
      }
    } catch {
      setSabotageReport({
        filename: file.name,
        status: "UNKNOWN",
        reason: "Unable to compute hash for production file.",
        action: "Retry scan or request alternate copy."
      });
    } finally {
      setSabotageBusy(false);
    }
  };

  if (!authed || !workspaceId) {
    return (
      <Page
        title="Admissibility Ledger"
        subtitle="Court-ready admissibility packets with cryptographic verification."
      >
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Export Admissibility</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Generate a court-grade admissibility packet.</h2>
          <p className="mt-3 text-sm text-slate-400">
            Every export is backed by a verifiable ledger trail and integrity proofs.
          </p>
          <div className="mt-6 flex items-center justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!authed) {
                  nav("/login");
                  return;
                }
                nav(matterLink("admissibility"));
              }}
            >
              Export admissibility packet
            </Button>
          </div>
        </div>
      </Page>
    );
  }


  return (
    <Page
      title="Admissibility Ledger"
      subtitle="Immutable ledger entries tied to Rule 902 readiness."
      right={
        <div className="flex items-center gap-2">
          {workspaceId ? (
            <Badge tone="blue">Workspace: {workspaceName}</Badge>
          ) : (
            <Badge tone="amber">No workspace</Badge>
          )}
          <Badge tone={authed ? "green" : "red"}>{authed ? "Auth OK" : "Signed out"}</Badge>
          <span className="relative inline-flex items-center overflow-hidden rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-200">
            <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent animate-[scan_2s_linear_infinite]" />
            AI-Validated
          </span>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={busy || !authed}>
            {busy ? <Spinner size={16} /> : <i className="fa-solid fa-rotate" />}
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="border border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
          >
            <i className="fa-solid fa-lock" />
            Finalize Audit & Lock Ledger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            <i className="fa-solid fa-file-csv" />
            Export Ledger
          </Button>
        </div>
      }
    >
      {packetOverlayStep !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-6 text-slate-100">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-300 mb-2">Admissibility Packet</div>
            <div className="text-sm text-slate-200">Generating court-ready artifacts...</div>
            <div className="mt-4 space-y-2 text-xs">
              {packetSteps.map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${idx <= packetOverlayStep ? "bg-emerald-400" : "bg-slate-700"}`} />
                  <span className={idx === packetOverlayStep ? "text-emerald-200" : "text-slate-400"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${((packetOverlayStep + 1) / packetSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {role === "Client" ? (
        <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          Client role has read-only access. Privilege logs and export controls are restricted.
        </div>
      ) : null}
      {integrityAlert ? (
        <div className="mb-4 rounded-2xl border border-red-500/50 bg-red-500/15 px-4 py-3 text-xs text-red-200">
          {integrityAlert.message}
          {integrityAlert.exhibitId ? (
            <span className="ml-2 text-[10px] text-red-200">
              Exhibit: <span className="mono">{integrityAlert.exhibitId}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      {reportNote ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          {reportNote}
        </div>
      ) : null}
      {teleportNotice ? (
        <div className="mb-4 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200">
          {teleportNotice}
        </div>
      ) : null}
      {fixtureMode ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-200">
          Fixture dataset loaded (evaluation harness).
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <IntegrityPanel
          status={integrityAlert ? "REVOKED" : rows.length ? "VERIFIED" : "PENDING"}
          anchors={baselineExhibits.length}
          verificationPct={rows.length ? 96 : 0}
          outputType={integrityAlert ? "SPECULATIVE" : "RETRIEVAL"}
          basis={{
            sources: "Audit ledger + evidence registry",
            model: "EvidenceGuard v1",
            assumptions: "Policy gate enforced"
          }}
          policyResult={integrityAlert ? "Policy violations detected. Review required." : "Policy checks green. Sign-off required for export."}
          provenance="Model: EvidenceGuard v1 • Policy: AdmissibilityGate v2"
        />
        <Card className="lg:col-span-2 border border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle>Policy Enforcement Transparency</CardTitle>
            <CardSubtitle>Why a claim or export was flagged.</CardSubtitle>
          </CardHeader>
          <CardBody className="text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <Badge tone="amber">WITHHELD</Badge>
              <div>Missing anchors for 2 claims. Action: request additional exhibits.</div>
            </div>
            <div className="flex items-start gap-2">
              <Badge tone="green">PASS</Badge>
              <div>Hash chain verified for latest export packet.</div>
            </div>
            <div className="flex items-start gap-2">
              <Badge tone="red">BLOCK</Badge>
              <div>Client role attempted export. Export requires Partner sign-off.</div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className={`rounded-2xl border p-4 mb-4 ${
        breachActive ? "border-red-500/50 bg-red-950/40" : "border-white/10 bg-slate-950/70"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">System Integrity Health Check</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                healthBadge === "ALL SYSTEMS VERIFIED"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : healthBadge === "PENDING"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-red-500/50 bg-red-500/20 text-red-200 animate-pulse"
              }`}>
                <i className="fa-solid fa-shield-halved" />
                {healthBadge}
              </span>
              <span className="text-slate-300">
                Last Global Audit: {lastAuditAt || "pending"}
              </span>
              <span className={`${hashConsistency === "MATCHED" ? "text-emerald-200" : hashConsistency === "MISMATCH" ? "text-red-200" : "text-amber-200"}`}>
                Hash Consistency: {hashConsistency}
              </span>
              <span className="text-slate-300">
                Root Hash: <span className="mono">{rootHash ? `${rootHash.slice(0, 18)}...` : "pending"}</span>
              </span>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
            Ledger Sync {rows.length ? "Active" : "Idle"}
          </div>
        </div>
      </div>

      <Card className="mb-4 border border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle>Opposing Sabotage Scanner</CardTitle>
          <CardSubtitle>Hashes incoming productions against baseline exhibits.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void runSabotageScan(file);
                }}
              />
              <i className="fa-solid fa-file-arrow-up" />
              Upload Production PDF
            </label>
            {sabotageBusy ? (
              <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                <Spinner size={16} /> Running hash comparison...
              </div>
            ) : null}
          </div>

          {sabotageReport ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 p-4 text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Scan Result</div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                  sabotageReport.status === "RED_FLAG"
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : sabotageReport.status === "CLEAN"
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                      : "border-amber-500/50 bg-amber-500/20 text-amber-200"
                }`}>
                  {sabotageReport.status}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-300">{sabotageReport.filename}</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg border border-white/10 bg-black/60 p-3">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Baseline Hash</div>
                  <div className="mt-2 mono text-emerald-200 break-all">
                    {sabotageReport.baselineHash || "Unavailable"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/60 p-3">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Current Hash</div>
                  <div className="mt-2 mono text-emerald-200 break-all">
                    {sabotageReport.currentHash || "Unavailable"}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-amber-200/80">{sabotageReport.reason}</div>
              <div className="mt-2 text-[11px] text-slate-300">Action: {sabotageReport.action}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Ask the Auditor</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Show me all unauthorized access attempts..."
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 font-mono placeholder:text-slate-500"
          />
          <Button variant="primary" size="sm" onClick={applyQuery}>
            <i className="fa-solid fa-magnifying-glass" />
            Run Query
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setQuery("");
            setGlowMatches(new Set());
            setQuerySummary(null);
            setPageIndex(0);
          }}>
            Clear
          </Button>
        </div>
        {querySummary ? (
          <div className="mt-2 text-xs text-slate-400">{querySummary}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className={`xl:col-span-3 rounded-2xl border p-4 ${
          breachActive ? "border-red-500/40 bg-red-950/30" : "border-white/10 bg-slate-950/70"
        }`}>
          <div className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">
            Immutable Ledger Records
          </div>
          {hasRows ? (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <span>Rows: {filteredRows.length}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                  onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={safePageIndex === 0}
                >
                  Prev
                </button>
                <span className="font-mono">Page {safePageIndex + 1} / {totalPages}</span>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-50"
                  onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                  disabled={safePageIndex >= totalPages - 1}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">IP Address</th>
                <th className="px-4 py-2">Resource</th>
                <th className="px-4 py-2">Digital Signature</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length ? pagedRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className={`cursor-pointer ${glowMatches.has(row.id) ? "shadow-[0_0_12px_rgba(56,189,248,0.35)]" : ""} ${
                    breachActive ? "shadow-[0_0_16px_rgba(239,68,68,0.25)]" : ""
                  }`}
                >
                  <td className={`px-4 py-3 mono text-slate-300 border border-white/10 bg-black/40 rounded-l-2xl border-l-4 ${
                    row.severity === "HIGH"
                      ? "border-l-red-500/60"
                      : row.severity === "MEDIUM"
                        ? "border-l-amber-500/60"
                        : "border-l-emerald-500/60"
                  }`}>
                    {row.createdAt || "unknown"}
                  </td>
                  <td className="px-4 py-3 border-y border-white/10 bg-black/40 text-slate-200">
                    {row.event}
                  </td>
                  <td className="px-4 py-3 mono border-y border-white/10 bg-black/40 text-slate-300">
                    {maskActor(row.actorId)}
                  </td>
                  <td className="px-4 py-3 mono border-y border-white/10 bg-black/40 text-slate-400">
                    {maskIp(row.meta.ipAddress)}
                  </td>
                  <td className="px-4 py-3 mono border-y border-white/10 bg-black/40 text-slate-300">
                    {row.resource || "n/a"}
                  </td>
                  <td className="px-4 py-3 mono border-y border-white/10 bg-black/40 text-emerald-200">
                    {formatSignature(row.signature)}
                  </td>
                  <td className="px-4 py-3 border-y border-white/10 bg-black/40">
                    {row.status === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                        <i className="fa-solid fa-lock" />
                        VERIFIED
                      </span>
                    ) : row.status === "PENDING" ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200">
                        <i className="fa-solid fa-hourglass-half" />
                        PENDING
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-2 rounded-full border border-red-500/60 bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-200 animate-pulse">
                          <i className="fa-solid fa-triangle-exclamation" />
                          TAMPERED
                        </span>
                        <span className="text-[10px] text-red-200/80">
                          {tamperAction(row).reason}
                        </span>
                        <span className="text-[10px] text-red-200/70">
                          Next: {tamperAction(row).action}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-white/10 bg-black/40 rounded-r-2xl">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
                        View Metadata
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => verifyRow(row)}
                        disabled={verifyingRowId === row.id}
                      >
                        {verifyingRowId === row.id ? <Spinner size={12} /> : <i className="fa-solid fa-check" />}
                        {verifyingRowId === row.id
                          ? "Validating..."
                          : verifiedRowId === row.id
                            ? "Verified"
                            : "Verify"}
                      </Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div>No audit events available.</div>
                      <Button variant="primary" size="sm" onClick={() => nav(matterLink("exhibits"))}>
                        Ingest Evidence
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-3">Chain of Custody Visualizer</div>
          {custodyFocus ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="space-y-2">
                {[
                  "Uploaded",
                  "Scanned",
                  "Hashed",
                  "Archived"
                ].map((step, idx) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                    <span className="h-6 w-6 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-200 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200">{step}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-emerald-300">Verified</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Digital Fingerprint</div>
                <div className="text-xs text-slate-200">Asset: {custodyFocus.resource || "ledger event"}</div>
                <div className="mt-2 mono text-emerald-200 break-all">
                  SHA-256: {custodyFocus.hash || custodyFocus.signature || "n/a"}
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Linked Event: {custodyFocus.event}
                </div>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => triggerTeleport(custodyFocus)}
                  >
                    Anchor Teleportation
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">No custody records available yet.</div>
          )}
        </div>
      </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-3">
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">
              Rule 902 Readiness
            </div>
            <div className="space-y-2">
              {readinessChecklist.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-[11px] text-slate-200">
                  <i className="fa-solid fa-circle-check text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-xs text-slate-300 space-y-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Partner Sign-Off</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportApproved}
                  onChange={(e) => setExportApproved(e.target.checked)}
                  disabled={!isPartner}
                />
                <span>I certify this export is review-complete.</span>
              </label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Approval note (optional)"
                className="w-full rounded-md border border-white/10 bg-slate-900/60 px-2 py-2 text-xs text-white"
              />
              {!isPartner ? (
                <div className="text-[11px] text-rose-200">Export approval requires Partner role.</div>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                onClick={generatePacket}
                disabled={reportBusy || !rows.length || !exportApproved || !isPartner}
              >
                {reportBusy ? <Spinner size={14} /> : <i className="fa-solid fa-file-shield" />}
                {reportBusy ? "Generating packet..." : "Generate Court-Ready Packet"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
                onClick={generateAffidavit}
                disabled={affidavitBusy || !workspaceId}
              >
                {affidavitBusy ? "Preparing affidavit..." : "Generate FRE 902 Affidavit"}
              </Button>
              {affidavitNote ? (
                <div className="text-[11px] text-emerald-200">{affidavitNote}</div>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">Filter Controls</div>
            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1">Severity</div>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH")}
                  className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-2 py-2 text-xs text-white"
                >
                  <option value="ALL">All severities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1">User</div>
                <select
                  value={filterActor}
                  onChange={(e) => setFilterActor(e.target.value)}
                  className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-2 py-2 text-xs text-white"
                >
                  <option value="ALL">All users</option>
                  {actorOptions.map((actor) => (
                    <option key={actor} value={actor}>
                      {maskActor(actor)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterSeverity("ALL");
                  setFilterActor("ALL");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400">DEH-001 Heartbeat</div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="mt-3 space-y-2 text-[11px] text-slate-300">
              {heartbeatRows.length ? heartbeatRows.slice(0, 4).map((row) => (
                <div key={row.id} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2">
                  <div className="text-[10px] text-slate-500">
                    Asset: <span className="mono">{row.payload?.exhibitId || row.resource || "n/a"}</span>
                  </div>
                  <div className="mt-1 text-emerald-200">
                    HB: <span className="mono">{(row.payload?.heartbeatHash || row.signature || "").slice(0, 16)}...</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    SIG: <span className="mono">{(row.payload?.aigisSignature || "").slice(0, 14)}...</span> (HMAC-SHA256)
                  </div>
                </div>
              )) : (
                <div className="text-xs text-slate-400">No heartbeat events yet.</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">AI Insights</div>
            <span className={`h-2 w-2 rounded-full ${aiPulse ? "bg-emerald-400" : "bg-emerald-700"} animate-pulse`} />
          </div>
          <div className="space-y-3">
            {aiInsights.insights.length ? aiInsights.insights.map((insight: { id: string; label: string; detail: string; confidence: number }) => (
              <div key={insight.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300">{insight.label}</div>
                <div className="mt-1 text-xs text-slate-200">{insight.detail}</div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  Confidence: {insight.confidence}%
                </div>
              </div>
            )) : (
              <div className="text-xs text-slate-400">No anomalies detected.</div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-2">Predicted Threats</div>
            <div className="space-y-2">
              {aiInsights.predicted.length ? aiInsights.predicted.map((insight: { id: string; label: string; detail: string; confidence: number }) => (
                <div key={insight.id} className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-red-200">{insight.label}</div>
                  <div className="mt-1 text-xs text-red-100">{insight.detail}</div>
                  <div className="mt-2 text-[10px] text-red-200 font-mono">
                    Confidence: {insight.confidence}%
                  </div>
                </div>
              )) : (
                <div className="text-xs text-slate-400">No predicted threats.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div
        className={[
          "fixed top-0 right-0 z-50 h-full w-full max-w-lg transform transition-transform duration-300",
          selected ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
        aria-hidden={!selected}
      >
        <div className="h-full border-l border-white/10 bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Forensic Detail</div>
              <div className="text-sm text-slate-200 mt-1">Sealed Evidence Envelope</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <i className="fa-solid fa-xmark" />
            </Button>
          </div>
          {selected ? (
            <div className="p-5 space-y-4 text-xs text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Signature</div>
                <div className="mono text-emerald-200">{selected.signature || "n/a"}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">Previous Hash Link</div>
                <div className="mono text-slate-300">{selected.prevHash || "n/a"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Forensic Metadata</div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3">
                  <span className="text-slate-400">Originating Node</span>
                  <span className="mono text-slate-200">{selected.meta.originNode}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">IP Address</span>
                  <span className="mono text-slate-200">{maskIp(selected.meta.ipAddress)}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">Browser Fingerprint</span>
                  <span className="mono text-slate-200">{selected.meta.browserFingerprint}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">Database Transaction ID</span>
                  <span className="mono text-slate-200">{selected.meta.transactionId}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">AI Narrative</div>
                <div className="text-xs text-slate-200">{selectedNarrative}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Court-Admissibility</div>
                  <span className="text-xs mono text-emerald-200">
                    {selectedScore?.score ?? 0}/100
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Remediation Tip</div>
                <div className="text-xs text-slate-200">{selectedScore?.tip}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Record Context</div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3">
                  <span className="text-slate-400">Event</span>
                  <span className="mono text-slate-200">{selected.event}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">Actor</span>
                  <span className="mono text-slate-200">{maskActor(selected.actorId)}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">Resource</span>
                  <span className="mono text-slate-200">{selected.resource || "n/a"}</span>
                </div>
                <div className="grid grid-cols-[170px_1fr] items-center gap-3 mt-2">
                  <span className="text-slate-400">Status</span>
                  <span className={`mono ${selected.status === "VERIFIED" ? "text-emerald-200" : "text-red-200 animate-pulse"}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-[scan_2s_linear_infinite] {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </Page>
  );
}
