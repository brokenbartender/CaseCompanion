import React, { useEffect, useState } from "react";
import { validateCitationApi } from "../services/geminiService";

export type CitationLocator = {
  docId: string;
  pageId: number;
  anchorId?: string;
  startChar: number;
  endChar: number;
};

type Props = {
  locator: CitationLocator;
  label?: string;
  onTeleport?: (locator: CitationLocator) => void;
};

export default function CitationTeleport({ locator, label, onTeleport }: Props) {
  const [status, setStatus] = useState<"good" | "warn" | "overruled">("good");

  useEffect(() => {
    if (!label) return;
    let mounted = true;
    validateCitationApi(label)
      .then((res) => {
        if (mounted && res?.status) {
          setStatus(res.status);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [label]);

  const badgeTone =
    status === "good"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : status === "overruled"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
        : "border-amber-500/40 bg-amber-500/10 text-amber-200";

  return (
    <button
      type="button"
      onClick={() => onTeleport?.(locator)}
      className="inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-indigo-200 hover:bg-indigo-500/20"
      title={`Doc ${locator.docId} p.${locator.pageId} ${locator.startChar}-${locator.endChar}`}
    >
      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${badgeTone}`}>
        {status === "good" ? "G" : status === "overruled" ? "R" : "Y"}
      </span>
      {label || `Doc ${locator.docId} p.${locator.pageId}`}
    </button>
  );
}
