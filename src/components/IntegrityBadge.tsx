import { useEffect, useState } from "react";
import { getAuthToken, getWorkspaceId, isAuthenticated } from "../services/authStorage";
import { getApiBase } from "../services/apiBase";

type LedgerStatus = "verified" | "unverified" | "offline";

export default function IntegrityBadge() {
  const [integrityHash, setIntegrityHash] = useState<string | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus>("unverified");
  const [copied, setCopied] = useState(false);
  const [proofCopied, setProofCopied] = useState(false);
  const [proofToast, setProofToast] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadIntegrity = async () => {
      const authed = isAuthenticated();
      if (!authed) {
        setIntegrityHash(null);
        setLedgerStatus("unverified");
        return;
      }
      const workspaceId = getWorkspaceId();
      if (!workspaceId) {
        setIntegrityHash(null);
        setLedgerStatus("unverified");
        return;
      }
      try {
        const urlBase = getApiBase().replace(/\/$/, "");
        const url = `${urlBase}/integrity/verify`;
        const headers: Record<string, string> = { Accept: "application/json" };
        headers["x-workspace-id"] = workspaceId;
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, { headers, credentials: "include" });
        if (!active) return;
        if (res.status === 401 || res.status === 403) {
          setIntegrityHash(null);
          setLedgerStatus("unverified");
          return;
        }
        if (!res.ok) {
          setIntegrityHash(null);
          setLedgerStatus("offline");
          return;
        }
        const data = await res.json().catch(() => ({}));
        const hash = typeof data?.integrityHash === "string" ? data.integrityHash : null;
        if (hash) {
          setIntegrityHash(hash);
          setLedgerStatus("verified");
          setVerifiedAt(new Date().toISOString());
        } else {
          setIntegrityHash(null);
          setLedgerStatus("unverified");
          setVerifiedAt(null);
        }
      } catch {
        if (!active) return;
        setIntegrityHash(null);
        setLedgerStatus("offline");
        setVerifiedAt(null);
      }
    };

    loadIntegrity();
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!integrityHash) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(integrityHash);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = integrityHash;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyProof = async () => {
    if (!integrityHash) return;
    const workspaceId = getWorkspaceId();
    const proof = `Integrity Hash: ${integrityHash} | ProvenAt: ${verifiedAt || new Date().toISOString()} | Workspace: ${workspaceId || "unknown"}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(proof);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = proof;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setProofCopied(true);
      setProofToast(true);
      window.setTimeout(() => setProofCopied(false), 1000);
      window.setTimeout(() => setProofToast(false), 1200);
    } catch {
      setProofCopied(false);
    }
  };

  const hashPreview = integrityHash ? `${integrityHash.slice(0, 6)}...${integrityHash.slice(-4)}` : "";
  const badgeTone =
    ledgerStatus === "verified"
      ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
      : ledgerStatus === "offline"
        ? "border-amber-400/40 text-amber-200 bg-amber-500/10"
        : "border-slate-500/40 text-slate-300 bg-slate-500/10";
  const badgeLabel =
    ledgerStatus === "verified"
      ? "Ledger PROVEN"
      : ledgerStatus === "offline"
        ? "Ledger withheld (backend unreachable)"
        : "Ledger UNVERIFIED";
  const verifiedAtLabel = verifiedAt ? `Verified at ${new Date(verifiedAt).toLocaleString()}` : "";
  const badgeTitle =
    ledgerStatus === "verified"
      ? `Integrity verified against the immutable ledger (court-ready).${verifiedAtLabel ? ` ${verifiedAtLabel}` : ""}`
      : "Integrity verification pending.";

  return (
    <div
      id="integrity-panel"
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${badgeTone}`}
      title={badgeTitle}
    >
      <span>{ledgerStatus === "verified" ? "OK" : "."}</span>
      <span>{badgeLabel}</span>
      {ledgerStatus === "verified" && hashPreview ? (
        <span className="mono text-[9px] tracking-normal">{hashPreview}</span>
      ) : null}
      <button
        type="button"
        onClick={handleCopy}
        disabled={!integrityHash}
        className="text-[9px] font-semibold uppercase tracking-widest text-slate-200/80 hover:text-white disabled:text-slate-500"
        aria-label="Copy integrity hash"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
      <button
        type="button"
        onClick={handleCopyProof}
        disabled={!integrityHash}
        className="text-[9px] font-semibold uppercase tracking-widest text-slate-200/80 hover:text-white disabled:text-slate-500"
        aria-label="Copy ledger proof clip"
        title="Copy court-ready proof clip"
      >
        {proofCopied ? "COPIED" : "CLIP"}
      </button>
      {proofToast ? (
        <div className="fixed top-6 right-6 z-50 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-emerald-100 shadow-lg">
          Court-ready proof clip copied.
        </div>
      ) : null}
    </div>
  );
}
