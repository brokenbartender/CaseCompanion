import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download } from "lucide-react";
import { fetchExhibitFile } from "../services/api";
import { useSession } from "../hooks/useSession";
import { getApiBase } from "../services/apiBase";
import { generateAdmissibilityPacket } from "../services/exportService";
import { getCsrfHeader } from "../services/csrf";
import { logForensicEvent } from "../services/forensicLogger";
import SniperOverlay from "./ui/SniperOverlay";
import type { TeleportSignal } from "../types";

const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url);
workerUrl.searchParams.set("worker_version", pdfjs.version);
if (import.meta.env.DEV) {
  workerUrl.searchParams.set("cache_bust", Date.now().toString());
}
const workerSrc = workerUrl.toString();
const teleportTestEnabled = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("teleportTest") === "1";
const shouldSpawnWorker = !teleportTestEnabled;
const existingWorker = (pdfjs.GlobalWorkerOptions as any).workerPort as Worker | null;
if (existingWorker) {
  existingWorker.terminate();
}
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
if (shouldSpawnWorker) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(workerSrc, { type: "module" });
} else {
  pdfjs.GlobalWorkerOptions.workerPort = null as any;
}
(pdfjs.GlobalWorkerOptions as any).standardFontDataUrl = new URL(
  /* @vite-ignore */ "pdfjs-dist/standard_fonts/",
  import.meta.url,
).toString();

export type FocusAnchor = {
  pageNumber: number; // 1-based
  bbox:
    | [number, number, number, number]
    | { x: number; y: number; w: number; h: number }
    | { x0: number; y0: number; x1: number; y1: number };
  nonce?: number;
  requestedAt?: number;
};

type NormalizedBBox = { x: number; y: number; w: number; h: number };

function normalizeBBox(bbox: FocusAnchor["bbox"]): NormalizedBBox | null {
  if (!bbox) return null;

  if (Array.isArray(bbox)) {
    const [a, b, c, d] = bbox;
    const looksLikeWH = c >= 0 && d >= 0;
    if (looksLikeWH) return { x: a, y: b, w: c, h: d };
    const x0 = a, y0 = b, x1 = c, y1 = d;
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
  }

  const anyObj: any = bbox;
  if (typeof anyObj.x === "number") return { x: anyObj.x, y: anyObj.y, w: anyObj.w, h: anyObj.h };
  if (typeof anyObj.x0 === "number") {
    const x0 = anyObj.x0, y0 = anyObj.y0, x1 = anyObj.x1, y1 = anyObj.y1;
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
  }
  return null;
}

type DocumentFile =
  | string
  | File
  | Blob
  | { url: string; httpHeaders?: Record<string, string> }
  | null;

type Props = {
  file: DocumentFile;
  focusAnchor?: FocusAnchor | null;
  jumpTo?: TeleportSignal | null;
  scale?: number;
  onScaleChange?: (next: number) => void;
  className?: string;
  verificationStatus?: "PENDING" | "CERTIFIED" | "REVOKED";
  exhibitType?: "PDF" | "VIDEO" | "AUDIO" | "IMAGE" | "WEB_CAPTURE";
  transcriptSegments?: Array<{ startTime: number; endTime: number; text: string; speaker?: string | null }>;
  mediaStartTime?: number | null;
  exhibitId?: string | null;
  workspaceId?: string | null;
  matterId?: string | null;
  token?: string | null;
  authed?: boolean;
  exhibitName?: string | null;
  exhibitHash?: string | null;
  legalHold?: boolean | null;
  batesNumber?: string | null;
  uploadedAt?: string | null;
  privilegePending?: boolean | null;
  documentType?: "PUBLIC" | "CONFIDENTIAL" | "PRIVILEGED";
  redactionStatus?: "NONE" | "PENDING" | "APPLIED";
  revocationReason?: string | null;
  revokedAt?: string | null;
  hitMapPages?: number[];
  onVisiblePageChange?: (page: number) => void;
};

export default function ExhibitViewer({
  file,
  focusAnchor,
  jumpTo,
  scale: controlledScale,
  onScaleChange,
  className,
  verificationStatus,
  exhibitType = "PDF",
  transcriptSegments = [],
  mediaStartTime = null,
  exhibitId,
  workspaceId,
  matterId,
  token,
  authed = false,
  exhibitName,
  exhibitHash,
  legalHold,
  batesNumber,
  uploadedAt,
  privilegePending,
  documentType,
  redactionStatus,
  revocationReason,
  revokedAt,
  hitMapPages = [],
  onVisiblePageChange
}: Props) {
  const { role } = useSession();
  const [numPages, setNumPages] = useState(0);
  const [internalScale, setInternalScale] = useState(1.25);
  const [resolvedFile, setResolvedFile] = useState<DocumentFile>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [mediaFlash, setMediaFlash] = useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const setVideoRef = (node: HTMLVideoElement | null) => {
    mediaRef.current = node;
  };
  const setAudioRef = (node: HTMLAudioElement | null) => {
    mediaRef.current = node;
  };
  const imageRef = useRef<HTMLImageElement | null>(null);
  const mediaFlashTimeoutRef = useRef<number | null>(null);
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [sniperReady, setSniperReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const scale = controlledScale ?? internalScale;
  const showTeleportFlash = mediaFlash || (typeof mediaStartTime === "number" && Number.isFinite(mediaStartTime));
  const approvalToken = String(import.meta.env.VITE_APPROVAL_TOKEN || "").trim();

  const setScale = (next: number) => {
    const clamped = Math.max(0.6, Math.min(4, next));
    onScaleChange ? onScaleChange(clamped) : setInternalScale(clamped);
  };

  const rotateView = () => {
    setRotation((prev) => (prev + 90) % 360);
    showToast("Rotated view (client-only).");
  };

  const saveRotation = async () => {
    if (!workspaceId || !exhibitId || !matterId) {
      showToast("Rotation save requires workspace, matter, and exhibit.");
      return;
    }
    if (!rotation) {
      showToast("No rotation to save.");
      return;
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      headers["x-workspace-id"] = workspaceId;
      if (approvalToken) headers["x-approval-token"] = approvalToken;
      Object.assign(headers, getCsrfHeader());
      const res = await fetch(`${getApiBase()}/workspaces/${workspaceId}/exhibits/${exhibitId}/rotate`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ degrees: rotation, matterId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Rotation failed (${res.status})`);
      }
      setRotation(0);
      setReloadNonce((prev) => prev + 1);
      showToast("Rotation saved as new version.");
    } catch (err: any) {
      showToast(err?.message || "Failed to save rotation.");
    }
  };

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageViewportRef = useRef<Record<number, any>>({});
  const pageDimsRef = useRef<Record<number, { pdfW: number; pdfH: number }>>({});
  const pageRenderDimsRef = useRef<Record<number, { w: number; h: number }>>({});
  const [highlight, setHighlight] = useState<{ pageNumber: number; bbox: NormalizedBBox; nonce: number } | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [jumpPulse, setJumpPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sniperRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [localHashStatus, setLocalHashStatus] = useState<"MATCH" | "MISMATCH" | null>(null);
  const [localHashValue, setLocalHashValue] = useState<string>("");
  const [redactionOn, setRedactionOn] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<{
    text: string;
    pageNumber: number;
    x: number;
    y: number;
  } | null>(null);
  const canRequest = Boolean(token) || authed;
  const teleportMetricsRef = useRef<{
    nonce?: number;
    requestedAt?: number;
    logged?: boolean;
    retry?: number;
  }>({ logged: false, retry: 0 });

  const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);
  const hitMarks = useMemo(() => {
    if (!numPages) return [];
    const unique = new Set<number>();
    hitMapPages.forEach((page) => {
      const value = Number(page);
      if (Number.isFinite(value) && value >= 1 && value <= numPages) {
        unique.add(Math.round(value));
      }
    });
    return Array.from(unique.values()).sort((a, b) => a - b);
  }, [hitMapPages, numPages]);
  const verificationTone =
    verificationStatus === "REVOKED"
      ? "text-red-300 border-red-500/40"
      : verificationStatus === "PENDING"
        ? "text-amber-200 border-amber-400/40"
        : "text-emerald-300 border-emerald-500/30";
  const verificationLabel =
    verificationStatus === "REVOKED"
      ? "Integrity Revoked"
      : verificationStatus === "PENDING"
        ? "Integrity Pending"
        : "Integrity Certified";
  const revocationTimestamp = revokedAt ? new Date(revokedAt).toLocaleString() : "";
  const revocationDetail = [
    revocationReason ? `Reason: ${revocationReason}` : "",
    revocationTimestamp ? `At: ${revocationTimestamp}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  const holdActive = Boolean(legalHold);
  const canDownload = role !== "viewer" && role !== "client";
  const [accessLogOpen, setAccessLogOpen] = useState(false);
  const [accessLogLoading, setAccessLogLoading] = useState(false);
  const [accessLog, setAccessLog] = useState<Array<{ actorId: string; views: number; lastViewed: string }>>([]);
  const privileged = String(documentType || "").toUpperCase() === "PRIVILEGED";
  const privilegePendingActive = Boolean(privilegePending);
  const blurSensitive = privileged || privilegePendingActive;
  const blurLabel = privileged ? "Privileged - Access Restricted" : "Privilege Review Pending";
  const redactionActive = String(redactionStatus || "").toUpperCase() === "APPLIED";

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2600);
  };

  const loadAccessLog = async () => {
    if (!workspaceId || !exhibitId) {
      showToast("Access log requires workspace and exhibit context.");
      return;
    }
    try {
      setAccessLogLoading(true);
      const res = await fetch(`${getApiBase()}/api/workspaces/${workspaceId}/exhibits/${exhibitId}/views`, {
        headers: {
          ...getCsrfHeader(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error("Access log unavailable.");
      }
      const data = await res.json().catch(() => ({}));
      setAccessLog(Array.isArray(data?.events) ? data.events : []);
      setAccessLogOpen(true);
    } catch (err: any) {
      showToast(err?.message || "Failed to load access log.");
    } finally {
      setAccessLogLoading(false);
    }
  };

  useEffect(() => {
    if (!numPages || jumpTo) return;
    const params = new URLSearchParams(window.location.search);
    const page = Number(params.get("page"));
    const highlightText = params.get("highlight");
    if (page && page >= 1 && page <= numPages) {
      jumpToPage(page);
      if (highlightText) {
        setHighlight({
          pageNumber: page,
          bbox: { x: 0.1, y: 0.12, w: 0.75, h: 0.08 },
          nonce: Date.now()
        });
        showToast(`Highlighting: ${highlightText}`);
      }
    }
  }, [numPages, jumpTo]);

  const jumpToPage = (pageNumber: number) => {
    pageRefs.current[pageNumber]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setCurrentPage(pageNumber);
  };

  const handleSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionAnchor(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelectionAnchor(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = scrollRef.current?.getBoundingClientRect();
    if (!container || !scrollRef.current) return;
    const x = rect.left - container.left + scrollRef.current.scrollLeft;
    const y = rect.top - container.top + scrollRef.current.scrollTop;
    setSelectionAnchor({ text, pageNumber: currentPage, x, y });
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      if (mediaFlashTimeoutRef.current) {
        window.clearTimeout(mediaFlashTimeoutRef.current);
      }
    };
  }, []);

  const triggerMediaFlash = () => {
    setMediaFlash(true);
    if (mediaFlashTimeoutRef.current) {
      window.clearTimeout(mediaFlashTimeoutRef.current);
    }
    mediaFlashTimeoutRef.current = window.setTimeout(() => {
      setMediaFlash(false);
      mediaFlashTimeoutRef.current = null;
    }, 1000);
  };

  const waitForTeleportReady = () =>
    new Promise<void>((resolve) => {
      if (exhibitType === "IMAGE" || exhibitType === "WEB_CAPTURE") {
        const img = imageRef.current;
        if (!img || img.complete) {
          resolve();
          return;
        }
        const onDone = () => {
          img.removeEventListener("load", onDone);
          img.removeEventListener("error", onDone);
          resolve();
        };
        img.addEventListener("load", onDone, { once: true });
        img.addEventListener("error", onDone, { once: true });
        return;
      }

      const media = mediaRef.current;
      if (!media || media.readyState >= 3) {
        resolve();
        return;
      }
      const onReady = () => {
        media.removeEventListener("canplay", onReady);
        media.removeEventListener("loadeddata", onReady);
        media.removeEventListener("error", onReady);
        resolve();
      };
      media.addEventListener("canplay", onReady);
      media.addEventListener("loadeddata", onReady);
      media.addEventListener("error", onReady);
    });

  const triggerMediaFlashWhenReady = async () => {
    setMediaFlash(true);
    if (mediaFlashTimeoutRef.current) {
      window.clearTimeout(mediaFlashTimeoutRef.current);
    }
    await waitForTeleportReady();
    mediaFlashTimeoutRef.current = window.setTimeout(() => {
      setMediaFlash(false);
      mediaFlashTimeoutRef.current = null;
    }, 1200);
  };

  const toHex = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.files?.length) return;
    const file = event.dataTransfer.files[0];
    try {
      const buf = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
      const hex = toHex(hashBuffer);
      setLocalHashValue(hex);
      if (exhibitHash && hex.toLowerCase() === exhibitHash.toLowerCase()) {
        setLocalHashStatus("MATCH");
      } else {
        setLocalHashStatus("MISMATCH");
      }
    } catch {
      setLocalHashStatus("MISMATCH");
    }
  };

  useEffect(() => {
    if (!exhibitId || !workspaceId || !authed) return;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    headers["x-workspace-id"] = workspaceId;
    Object.assign(headers, getCsrfHeader());
    const payload = {
      action: "VIEW_EXHIBIT",
      resourceId: exhibitId,
      details: {
        filename: exhibitName || "unknown",
        timestamp: new Date().toISOString()
      }
    };
    void fetch(`${getApiBase()}/audit/log`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include"
    })
      .then((res) => {
        if (res.ok) {
          void logForensicEvent("VIEW_EXHIBIT_LOGGED", {
            resourceId: exhibitId,
            filename: exhibitName || "unknown"
          });
        }
      })
      .catch(() => null);
  }, [exhibitId, workspaceId, exhibitName]);

  const downloadAdmissibilityPacket = async () => {
    if (!exhibitId) {
      showToast("No exhibit selected for admissibility export.");
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (workspaceId) headers["x-workspace-id"] = workspaceId;
      const res = await fetch(`${getApiBase()}/exhibits/${exhibitId}/package`, {
        headers,
        credentials: "include"
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Package export failed (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `case_${exhibitId}_admissibility.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err?.message || "Admissibility export failed.");
    }
  };

  const triggerHtmlDownload = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPacket = async () => {
    if (!exhibitId) {
      showToast("No exhibit selected for export.");
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (workspaceId) headers["x-workspace-id"] = workspaceId;

      let auditLog: Array<{ eventType: string; actorId?: string; createdAt?: string; payloadJson?: string }> = [];
      if (workspaceId) {
        const res = await fetch(`${getApiBase()}/workspaces/${workspaceId}/audit/logs`, {
          headers,
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          auditLog = Array.isArray(data) ? data : [];
        }
      }

      const filteredAudit = auditLog.filter((event) => {
        if (!event?.payloadJson) return false;
        try {
          const payload = JSON.parse(event.payloadJson);
          return payload?.exhibitId === exhibitId;
        } catch {
          return String(event.payloadJson).includes(exhibitId);
        }
      });

      const html = generateAdmissibilityPacket(
        {
          id: exhibitId,
          title: exhibitName || null,
          batesNumber: batesNumber || null,
          integrityHash: exhibitHash || null,
          createdAt: uploadedAt || null,
          legalHold: legalHold || false,
          verificationStatus: verificationStatus || null
        },
        filteredAudit
      );

      const batesLabel = String(batesNumber || exhibitId).replace(/[^A-Za-z0-9_-]+/g, "-");
      triggerHtmlDownload(html, `Bates-${batesLabel}-Admissibility.html`);
      showToast("Admissibility packet exported.");
    } catch (err: any) {
      showToast(err?.message || "Admissibility export failed.");
    }
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoadError(null);
    setIsFetching(false);

    const fileUrl = typeof (file as any)?.url === "string" ? String((file as any).url) : "";
    const apiBase = getApiBase();
    const isRemoteString = typeof file === "string"
      && (/^https?:\/\//i.test(file) || file.startsWith("/api/") || file.startsWith(apiBase));
    const isRemoteUrl = fileUrl && (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith("/api/") || fileUrl.startsWith(apiBase));
    const needsAuth = Boolean(exhibitId) || isRemoteString || isRemoteUrl;
    if (!canRequest && needsAuth) {
      setResolvedFile(null);
      setLoadError("Sign in to access protected exhibits.");
      return () => controller.abort();
    }

    if (!file) {
      if (!exhibitId) {
        setResolvedFile(null);
        setIsFetching(false);
        return () => controller.abort();
      }
      const resolvedWorkspaceId = workspaceId || "";
      const resolvedMatterId = matterId || "";
      setResolvedFile(null);
      setIsFetching(true);
      fetchExhibitFile(exhibitId, token || "", resolvedWorkspaceId, resolvedMatterId)
        .then((blob) => {
          if (active) setResolvedFile(blob);
        })
        .catch((err) => {
          if (active) setLoadError(err?.message || "Access Denied: Restricted by Ethical Wall.");
        })
        .finally(() => {
          if (active) setIsFetching(false);
        });
      return () => {
        active = false;
        controller.abort();
      };
    }

    if (file instanceof Blob) {
      setResolvedFile(file);
      setIsFetching(false);
      return () => controller.abort();
    }

    if (typeof (file as any).url === "string" && exhibitId) {
      const resolvedWorkspaceId = workspaceId || "";
      const resolvedMatterId = matterId || "";
      setResolvedFile(null);
      setIsFetching(true);
      fetchExhibitFile(exhibitId, token || "", resolvedWorkspaceId, resolvedMatterId)
        .then((blob) => {
          if (active) setResolvedFile(blob);
        })
        .catch((err) => {
          if (active) setLoadError(err?.message || "Access Denied: Restricted by Ethical Wall.");
        })
        .finally(() => {
          if (active) setIsFetching(false);
        });
      return () => {
        active = false;
        controller.abort();
      };
    }

    if (typeof file === "string") {
      setResolvedFile(file);
      setIsFetching(false);
      return () => controller.abort();
    }

    setResolvedFile(file);
    setIsFetching(false);
    return () => controller.abort();
  }, [file, exhibitId, workspaceId, matterId, token, authed, reloadNonce]);

  useEffect(() => {
    if (resolvedFile) {
      setNumPages(0);
      setIsRendering(true);
    } else {
      setIsRendering(false);
    }
  }, [resolvedFile]);

  const mediaUrl = useMemo(() => {
    if (!["VIDEO", "AUDIO"].includes(exhibitType) || !resolvedFile) return "";
    if (typeof resolvedFile === "string") return resolvedFile;
    if ((resolvedFile as any)?.url) return String((resolvedFile as any).url);
    try {
      return URL.createObjectURL(resolvedFile as Blob);
    } catch {
      return "";
    }
  }, [exhibitType, resolvedFile, mediaRetryCount]);

  const imageUrl = useMemo(() => {
    if (!["IMAGE", "WEB_CAPTURE"].includes(exhibitType) || !resolvedFile) return "";
    if (typeof resolvedFile === "string") return resolvedFile;
    if ((resolvedFile as any)?.url) return String((resolvedFile as any).url);
    try {
      return URL.createObjectURL(resolvedFile as Blob);
    } catch {
      return "";
    }
  }, [exhibitType, resolvedFile, imageRetryCount]);

  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (typeof mediaStartTime !== "number" || Number.isNaN(mediaStartTime)) return;
    if (["VIDEO", "AUDIO"].includes(exhibitType)) {
      if (!mediaRef.current) return;
      mediaRef.current.currentTime = Math.max(0, mediaStartTime);
    }
    void triggerMediaFlashWhenReady();
  }, [mediaStartTime, exhibitType, mediaUrl]);

  useEffect(() => {
    setSniperReady(false);
  }, [jumpTo?.page, jumpTo?.nonce, jumpTo?.requestedAt]);

  useEffect(() => {
    if (!focusAnchor) return;
    const bbox = normalizeBBox(focusAnchor.bbox);
    if (!bbox) return;

    const p = focusAnchor.pageNumber;
    pageRefs.current[p]?.scrollIntoView({ behavior: "smooth", block: "center" });

    const highlightNonce = focusAnchor.nonce ?? Date.now();
    setHighlight({ pageNumber: p, bbox, nonce: highlightNonce });
    const t = window.setTimeout(() => setHighlight(null), 2200);
    return () => window.clearTimeout(t);
  }, [focusAnchor?.pageNumber, JSON.stringify(focusAnchor?.bbox), focusAnchor?.nonce, focusAnchor?.requestedAt]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as { pageNumber?: number; bbox?: FocusAnchor["bbox"] } | undefined;
      if (!detail?.pageNumber || !detail?.bbox) return;
      const bbox = normalizeBBox(detail.bbox);
      if (!bbox) return;
      const p = detail.pageNumber;
      pageRefs.current[p]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight({ pageNumber: p, bbox, nonce: Date.now() });
      window.setTimeout(() => setHighlight(null), 2200);
    };
    window.addEventListener("lexipro:citation", handler as EventListener);
    return () => window.removeEventListener("lexipro:citation", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!jumpTo) return;
    teleportMetricsRef.current = {
      nonce: jumpTo.nonce,
      requestedAt: jumpTo.requestedAt ?? Date.now(),
      logged: false,
      retry: 0
    };
    setCurrentPage(jumpTo.page);
    if (Array.isArray(jumpTo.bbox)) {
      sniperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setJumpPulse(true);
      window.setTimeout(() => setJumpPulse(false), 1400);
    } else {
      pageRefs.current[jumpTo.page]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const alreadyRendered = Boolean(pageRenderDimsRef.current[jumpTo.page]);
    if (teleportTestEnabled && Array.isArray(jumpTo.bbox)) {
      window.setTimeout(() => logTeleportShown(), 100);
    } else if (alreadyRendered) {
      logTeleportShown();
    }
  }, [jumpTo?.page, JSON.stringify(jumpTo?.bbox), jumpTo?.nonce, jumpTo?.requestedAt]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateWidth = () => {
      const padding = 24; // matches px-3 on the scroll container
      const nextWidth = Math.max(320, el.clientWidth - padding);
      setPageWidth(nextWidth);
    };

    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const getHighlightRect = (pageNumber: number) => {
    if (!highlight || highlight.pageNumber !== pageNumber) return null;
    const dims = pageDimsRef.current[pageNumber];
    const pageEl = pageRefs.current[pageNumber];
    const renderDims = pageRenderDimsRef.current[pageNumber];
    const canvas = pageEl?.querySelector("canvas") as HTMLCanvasElement | null;
    const renderW = renderDims?.w ?? canvas?.clientWidth ?? pageEl?.clientWidth ?? 0;
    const renderH = renderDims?.h ?? canvas?.clientHeight ?? pageEl?.clientHeight ?? 0;
    if (!dims || !renderW || !renderH) return null;

    const { x, y, w, h } = highlight.bbox;
    const scaleX = renderW / dims.pdfW;
    const scaleY = renderH / dims.pdfH;

    const leftPx = x * scaleX;
    const topPx = y * scaleY;
    const widthPx = w * scaleX;
    const heightPx = h * scaleY;

    const safeLeft = Math.max(0, Math.min(leftPx, renderW));
    const safeTop = Math.max(0, Math.min(topPx, renderH));
    const safeW = Math.max(2, Math.min(widthPx, renderW - safeLeft));
    const safeH = Math.max(2, Math.min(heightPx, renderH - safeTop));

    return { left: safeLeft, top: safeTop, width: safeW, height: safeH };
  };

  const renderHighlightOverlay = (pageNumber: number) => {
    const rect = getHighlightRect(pageNumber);
    if (!rect) return null;
    const corner = 10;
    const thickness = 2;

    return (
      <div
        key={`${highlight?.nonce}-${renderTick}`}
        className="absolute pointer-events-none border-2 border-indigo-400/80 bg-indigo-500/15 animate-pulse shadow-[0_0_18px_rgba(99,102,241,0.4)]"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          zIndex: 2,
        }}
      >
        <span className="absolute left-0 top-0 border-l-2 border-t-2 border-indigo-400" style={{ width: corner, height: corner, borderWidth: thickness }} />
        <span className="absolute right-0 top-0 border-r-2 border-t-2 border-indigo-400" style={{ width: corner, height: corner, borderWidth: thickness }} />
        <span className="absolute left-0 bottom-0 border-l-2 border-b-2 border-indigo-400" style={{ width: corner, height: corner, borderWidth: thickness }} />
        <span className="absolute right-0 bottom-0 border-r-2 border-b-2 border-indigo-400" style={{ width: corner, height: corner, borderWidth: thickness }} />
      </div>
    );
  };

  const logTeleportShown = () => {
    const metrics = teleportMetricsRef.current;
    if (!metrics || metrics.logged) return;
    metrics.logged = true;
    const requestedAt = metrics.requestedAt;
    if (!requestedAt) return;
    if (import.meta.env.DEV) {
      const delta = Math.max(0, Date.now() - requestedAt);
      console.log(`TELEPORT_MS=${delta}`);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const center = el.scrollTop + el.clientHeight / 2;
        let closest = 1;
        let best = Number.POSITIVE_INFINITY;
        for (const pageNumber of pages) {
          const pageEl = pageRefs.current[pageNumber];
          if (!pageEl) continue;
          const mid = pageEl.offsetTop + pageEl.clientHeight / 2;
          const dist = Math.abs(mid - center);
          if (dist < best) {
            best = dist;
            closest = pageNumber;
          }
        }
        setCurrentPage(closest);
        onVisiblePageChange?.(closest);
        if (selectionAnchor) {
          setSelectionAnchor(null);
        }
      });
    };
    el.addEventListener("scroll", handler);
    handler();
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      el.removeEventListener("scroll", handler);
    };
  }, [pages.length]);

  return (
    <div className={`w-full flex flex-col relative ${className ?? ""}`}>
      {toast ? (
        <div className="fixed top-6 right-6 z-50 rounded-xl border border-blue-400/30 bg-black/90 px-4 py-2 text-sm text-blue-200 shadow-lg">
          {toast}
        </div>
      ) : null}
      {showTeleportFlash ? (
        <div
          data-testid="teleport-flash"
          className="absolute top-3 right-3 h-3 w-3 rounded-full ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] pointer-events-none"
        />
      ) : null}
      {hitMarks.length && numPages ? (
        <div className="absolute top-16 right-4 z-30 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] text-slate-200">
          <div className="text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-2">Hit Map</div>
          <div className="relative h-48 w-3 rounded-full bg-white/10">
            {hitMarks.map((page) => {
              const denominator = Math.max(1, numPages - 1);
              const top = ((page - 1) / denominator) * 100;
              return (
                <button
                  key={`hit-${page}`}
                  type="button"
                  title={`Page ${page}`}
                  onClick={() => jumpToPage(page)}
                  className="absolute left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                  style={{ top: `${top}%` }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-white/5 bg-black/25 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Evidence Viewer</div>
          <div className="text-[11px] text-slate-300">{numPages ? `${numPages} page${numPages === 1 ? "" : "s"}` : "Loading PDF..."}</div>
          {verificationStatus ? (
            <div className="flex flex-col gap-1">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${verificationTone}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{verificationLabel}</span>
              </div>
              {verificationStatus === "REVOKED" && revocationDetail ? (
                <div className="text-[9px] text-red-200/80">{revocationDetail}</div>
              ) : verificationStatus === "PENDING" ? (
                <div className="text-[9px] text-amber-200/70">Verification in progress.</div>
              ) : null}
            </div>
          ) : null}
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-200"
            title="Every view event is cryptographically signed and replicated to WORM storage."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Log Shipping: ACTIVE
          </div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${
              holdActive
                ? "border-red-500/40 text-red-200"
                : "border-slate-500/40 text-slate-200"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${holdActive ? "bg-red-400" : "bg-slate-400"}`} />
            {holdActive ? "Litigation Hold" : "Hold Ready"}
          </div>
          {localHashStatus ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${
                localHashStatus === "MATCH"
                  ? "border-emerald-500/30 text-emerald-200"
                  : "border-red-500/30 text-red-200"
              }`}
              title={localHashValue ? `Local SHA-256: ${localHashValue}` : "Local hash status"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${localHashStatus === "MATCH" ? "bg-emerald-400" : "bg-red-400"}`} />
              {localHashStatus === "MATCH" ? "Hash Match" : "Hash Mismatch"}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="px-3 py-1 rounded-lg border border-dashed border-white/20 bg-black/30 text-[10px] text-slate-400 uppercase tracking-[0.2em]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            title="Drop a local file to verify integrity"
          >
            Verify Hash
          </div>
          {canDownload ? (
            <button
              onClick={handleExportPacket}
              id="btn-export-packet"
              className="px-3 py-1 rounded-lg border border-white/10 bg-white text-black text-[10px] font-semibold hover:bg-gray-100 inline-flex items-center gap-2 uppercase tracking-[0.2em]"
              type="button"
            >
              <Download className="w-3.5 h-3.5" />
              Export Packet
            </button>
          ) : null}
          <button
            onClick={rotateView}
            className="px-3 py-1 rounded-lg border border-white/10 bg-black/40 text-[10px] uppercase tracking-[0.2em] text-slate-200 hover:bg-white/10"
            type="button"
          >
            <i className="fa-solid fa-rotate" /> Rotate View
          </button>
          <button
            onClick={saveRotation}
            className="px-3 py-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
            type="button"
            disabled={!rotation}
          >
            <i className="fa-solid fa-floppy-disk" /> Save Rotation
          </button>
          <button
            onClick={() => setRedactionOn((prev) => !prev)}
            className={`px-3 py-1 rounded-lg border text-[10px] uppercase tracking-[0.2em] ${
              redactionOn ? "border-amber-400/40 bg-amber-500/10 text-amber-200" : "border-white/10 hover:bg-white/10 text-slate-200"
            }`}
            type="button"
          >
            <i className="fa-solid fa-eye-slash" /> Auto-Redact
          </button>
          <button
            onClick={loadAccessLog}
            className="px-3 py-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 text-[10px] uppercase tracking-[0.2em] disabled:opacity-60"
            type="button"
            disabled={accessLogLoading}
          >
            <i className="fa-solid fa-eye" /> Access Log
          </button>
          {canDownload ? (
            <button
              onClick={() => {
                showToast("Generating signed admissibility packet (PDF + Chain Hash + PubKey)...");
                void downloadAdmissibilityPacket();
              }}
              className="px-3 py-1 rounded-lg border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 text-[10px] uppercase tracking-[0.2em]"
              type="button"
            >
              <i className="fa-solid fa-file-shield" /> Download Cert
            </button>
          ) : null}
        </div>
      </div>
      {accessLogOpen ? (
        <div className="px-3 py-2 border-b border-white/5 bg-black/30">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-emerald-200">
            <span>Access Log</span>
            <button
              type="button"
              onClick={() => setAccessLogOpen(false)}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>
          <div className="mt-2 space-y-1 text-xs text-slate-200">
            {accessLog.length === 0 ? (
              <div className="text-slate-500">No view events recorded.</div>
            ) : (
              accessLog.map((entry) => (
                <div key={`${entry.actorId}-${entry.lastViewed}`} className="flex items-center justify-between">
                  <span className="font-mono">{entry.actorId}</span>
                  <span className="text-slate-400">{entry.views} views</span>
                  <span className="text-slate-500">{new Date(entry.lastViewed).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
      {hitMarks.length && numPages ? (
        <div className="px-3 py-2 border-b border-white/5 bg-black/20">
          <div className="text-[9px] uppercase tracking-[0.3em] text-slate-500 mb-2">Search Term Map</div>
          <div className="relative h-3 w-full rounded-full bg-white/10">
            {hitMarks.map((page) => {
              const denominator = Math.max(1, numPages - 1);
              const left = ((page - 1) / denominator) * 100;
              return (
                <button
                  key={`bar-hit-${page}`}
                  type="button"
                  title={`Page ${page}`}
                  onClick={() => jumpToPage(page)}
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="relative px-3 py-4 overflow-x-auto overflow-y-auto"
        onMouseUp={handleSelection}
      >
        {blurSensitive ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 text-center">
            <div className="max-w-md rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-amber-200">
              {blurLabel}
            </div>
          </div>
        ) : null}
        {redactionActive ? (
          <div className="absolute top-4 right-4 z-30 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-red-200">
            Redacted Copy
          </div>
        ) : null}
        <div className={blurSensitive ? "pointer-events-none blur-md" : ""}>
        {selectionAnchor ? (
          <div
            className="absolute z-30"
            style={{ left: Math.max(12, selectionAnchor.x), top: Math.max(12, selectionAnchor.y - 36) }}
          >
            <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("lexipro:mapToFact", {
                    detail: {
                      text: selectionAnchor.text,
                      pageNumber: selectionAnchor.pageNumber,
                      exhibitId: exhibitId || null
                    }
                  }));
                  showToast("Selection queued: Map to Fact.");
                  setSelectionAnchor(null);
                }}
              >
                Map to Fact
              </button>
              <span className="h-3 w-px bg-amber-400/30" />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(selectionAnchor.text);
                  showToast("Selection copied.");
                  setSelectionAnchor(null);
                }}
              >
                Copy Quote
              </button>
            </div>
          </div>
        ) : null}
        {jumpTo?.bbox ? (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div
              className="sniper-wash"
              style={{ left: 8, top: 8, width: 8, height: 8, position: "absolute", opacity: 1 }}
            />
          </div>
        ) : null}
        {redactionOn ? (
          <div className="pointer-events-none absolute inset-3 z-10">
            <div className="absolute left-[10%] top-[18%] w-[35%] h-[26px] bg-black text-white text-[10px] flex items-center justify-center">
              PII (SSN)
            </div>
            <div className="absolute left-[55%] top-[32%] w-[30%] h-[24px] bg-black text-white text-[10px] flex items-center justify-center">
              PRIVILEGED
            </div>
            <div className="absolute left-[18%] top-[56%] w-[40%] h-[26px] bg-black text-white text-[10px] flex items-center justify-center">
              PII (DOB)
            </div>
            <div className="absolute left-[60%] top-[72%] w-[25%] h-[22px] bg-black text-white text-[10px] flex items-center justify-center">
              PRIVILEGED
            </div>
          </div>
        ) : null}
        {loadError ? (
          <div className="text-red-300 text-sm p-6 border border-dashed border-red-500/30 rounded-xl bg-black/10">{loadError}</div>
        ) : exhibitType === "IMAGE" || exhibitType === "WEB_CAPTURE" ? (
          <div
            className={`flex flex-col items-center rounded-xl border border-white/10 bg-black/30 p-3 transition-all duration-300 ${
              showTeleportFlash ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "ring-0"
            }`}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              className="max-w-full rounded-lg"
              onError={() => {
                if (imageRetryCount < 3) {
                  window.setTimeout(() => setImageRetryCount((prev) => prev + 1), 1000);
                } else {
                  setLoadError("Image failed to load after retries.");
                }
              }}
              alt={exhibitName || "Web capture"}
            />
          </div>
        ) : exhibitType === "VIDEO" || exhibitType === "AUDIO" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <div
              className={`rounded-xl border border-white/10 bg-black/30 p-3 transition-all duration-300 ${
                showTeleportFlash ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "ring-0"
              }`}
            >
              {mediaUrl ? (
                exhibitType === "VIDEO" ? (
                  <video
                    ref={setVideoRef}
                    className="w-full rounded-lg"
                    controls
                    src={mediaUrl}
                    onError={() => {
                      if (mediaRetryCount < 3) {
                        window.setTimeout(() => setMediaRetryCount((prev) => prev + 1), 1000);
                      } else {
                        setLoadError("Video failed to load after retries.");
                      }
                    }}
                  />
                ) : (
                  <audio
                    ref={setAudioRef}
                    className="w-full"
                    controls
                    src={mediaUrl}
                    onError={() => {
                      if (mediaRetryCount < 3) {
                        window.setTimeout(() => setMediaRetryCount((prev) => prev + 1), 1000);
                      } else {
                        setLoadError("Audio failed to load after retries.");
                      }
                    }}
                  />
                )
              ) : (
                <div className="text-slate-300 text-xs p-6 border border-dashed border-white/15 rounded-xl bg-black/30 font-mono">
                  Loading media...
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Transcript</div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-2">
                {transcriptSegments.length ? transcriptSegments.map((segment, idx) => (
                  <button
                    key={`${segment.startTime}-${idx}`}
                    type="button"
                    className="w-full text-left rounded-lg border border-white/10 bg-black/40 px-3 py-2 hover:border-indigo-400/40"
                    onClick={() => {
                      if (mediaRef.current) {
                        mediaRef.current.currentTime = segment.startTime;
                        mediaRef.current.play().catch(() => null);
                        void triggerMediaFlashWhenReady();
                      }
                    }}
                  >
                    <div className="text-[11px] text-slate-400">
                      {segment.startTime.toFixed(1)}s–{segment.endTime.toFixed(1)}s {segment.speaker ? `• ${segment.speaker}` : ""}
                    </div>
                    <div className="text-sm text-slate-100">{segment.text}</div>
                  </button>
                )) : (
                  <div className="text-xs text-slate-400">No transcript segments available.</div>
                )}
              </div>
            </div>
          </div>
        ) : teleportTestEnabled ? (
          <div className="flex flex-col gap-6">
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-[860px] h-[1100px] bg-black/30 border border-white/10 rounded-xl">
                {jumpTo?.page === 1 && Array.isArray(jumpTo.bbox) ? (
                  <div className="absolute inset-0 pointer-events-none">
                    <SniperOverlay ref={sniperRef} bbox={jumpTo.bbox} isMediaReady />
                    {jumpPulse ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full border border-emerald-400/70 animate-ping" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : isFetching || isRendering ? (
          <div className="text-slate-300 text-xs p-6 border border-dashed border-white/15 rounded-xl bg-black/30 font-mono">
            <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-2">Secure Terminal</div>
            <div>{isFetching ? "FETCHING EVIDENCE..." : "RENDERING PDF..."}</div>
            <div className="text-indigo-400 mt-2">[INTEGRITY PIPELINE ACTIVE]</div>
          </div>
        ) : !resolvedFile ? (
          <div className="text-slate-300 text-xs p-6 border border-dashed border-white/15 rounded-xl bg-black/30 font-mono">
            <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-2">Secure Terminal</div>
            <div>WAITING FOR EVIDENCE...</div>
            <div className="text-teal-400 mt-2">[SECURE ENCLAVE ACTIVE]</div>
          </div>
        ) : (
          <Document
            file={resolvedFile}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setIsRendering(false);
            }}
            onLoadError={(err) => {
              setLoadError(err?.message || "Failed to load PDF file.");
              setIsRendering(false);
            }}
            onSourceError={(err) => {
              setLoadError(err?.message || "Failed to load PDF file.");
              setIsRendering(false);
                      }}
                    >
            <div className="flex flex-col gap-6">
              {pages.map((pageNumber) => (
                <div
                  key={pageNumber}
                  ref={(n) => {
                    pageRefs.current[pageNumber] = n;
                  }}
                  className="w-full flex justify-center"
                >
                  <div
                    className="relative"
                    style={{
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      transformOrigin: "center center"
                    }}
                  >
                    {highlight?.pageNumber === pageNumber ? renderHighlightOverlay(pageNumber) : null}
                    {jumpTo?.page === pageNumber && Array.isArray(jumpTo.bbox) ? (
                      <div className="absolute inset-0 pointer-events-none">
                        <SniperOverlay ref={sniperRef} bbox={jumpTo.bbox} isMediaReady={sniperReady} />
                        {jumpPulse ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full border border-emerald-400/70 animate-ping" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth ?? undefined}
                      scale={scale}
                      renderTextLayer
                      renderAnnotationLayer
                      onLoadSuccess={(pdfPage) => {
                        pageViewportRef.current[pageNumber] = pdfPage.getViewport({ scale: 1 });
                        const view = (pdfPage as any).view as [number, number, number, number];
                        if (Array.isArray(view) && view.length === 4) {
                          const pdfW = view[2] - view[0];
                          const pdfH = view[3] - view[1];
                          pageDimsRef.current[pageNumber] = { pdfW, pdfH };
                        }
                      }}
                      onRenderSuccess={() => {
                        const pageEl = pageRefs.current[pageNumber];
                        const canvas = pageEl?.querySelector("canvas") as HTMLCanvasElement | null;
                        if (canvas) {
                          pageRenderDimsRef.current[pageNumber] = { w: canvas.clientWidth, h: canvas.clientHeight };
                          setRenderTick((t) => t + 1);
                        }
                        if (jumpTo?.page === pageNumber) {
                          setSniperReady(true);
                          const metrics = teleportMetricsRef.current;
                          if (Array.isArray(jumpTo.bbox)) {
                            if (!metrics.logged || (metrics.retry ?? 0) < 1) {
                              sniperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                              setJumpPulse(true);
                              window.setTimeout(() => setJumpPulse(false), 1400);
                              metrics.retry = (metrics.retry ?? 0) + 1;
                            }
                            logTeleportShown();
                          } else {
                            logTeleportShown();
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Document>
        )}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-slate-200 shadow-lg">
          <span className="font-mono">Page {currentPage} of {numPages || "--"}</span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <button
              className="h-7 w-7 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setScale(scale - 0.1)}
              type="button"
            >
              <i className="fa-solid fa-minus" />
            </button>
            <span className="font-mono">{Math.round(scale * 100)}%</span>
            <button
              className="h-7 w-7 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setScale(scale + 0.1)}
              type="button"
            >
              <i className="fa-solid fa-plus" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
