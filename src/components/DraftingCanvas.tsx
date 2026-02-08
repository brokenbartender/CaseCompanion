import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { api } from "../services/api";
import { useAiStatus } from "../hooks/useAiStatus";
import { useSession } from "../hooks/useSession";
import { parseCitations } from "../utils/citationParser";
import { insertClause, validateContract } from "../services/clauseLibrary";
import { logForensicEvent } from "../services/forensicLogger";
import Button from "./ui/Button";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type RiskAssessment = {
  clauseId: string;
  clauseType: string;
  severity: RiskSeverity;
  redlineSuggestion: string;
  citation_found: boolean;
  clauseText: string;
  citations: Array<{
    chunkId: string;
    exhibitId: string;
    pageNumber: number;
    text: string;
  }>;
};

type Playbook = {
  id: string;
  name: string;
};

type Props = {
  workspaceId: string;
  exhibitId?: string | null;
  matterId?: string | null;
  onDocCitationClick?: (label: string, page: number) => void;
  onMediaCitationClick?: (label: string, seconds: number) => void;
};

type HighlightRange = {
  id: string;
  from: number;
  to: number;
};

type ShepardSignal = {
  code: "POSITIVE" | "CAUTION" | "WARNING" | "NEUTRAL";
  label: string;
  badge: string;
  classes: string;
  tooltip: string;
};

const getShepardSignal = (label: string): ShepardSignal => {
  const seed = Array.from(label || "").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bucket = seed % 4;
  if (bucket === 0) {
    return {
      code: "POSITIVE",
      label: "Positive",
      badge: "G",
      classes: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
      tooltip: "Shepard's Signal: Positive treatment"
    };
  }
  if (bucket === 1) {
    return {
      code: "CAUTION",
      label: "Caution",
      badge: "Y",
      classes: "border-amber-400/50 bg-amber-500/15 text-amber-200",
      tooltip: "Shepard's Signal: Distinguished / questioned"
    };
  }
  if (bucket === 2) {
    return {
      code: "WARNING",
      label: "Warning",
      badge: "R",
      classes: "border-red-400/60 bg-red-500/15 text-red-200",
      tooltip: "Shepard's Signal: Overruled / negative"
    };
  }
  return {
    code: "NEUTRAL",
    label: "Neutral",
    badge: "A",
    classes: "border-blue-400/50 bg-blue-500/15 text-blue-200",
    tooltip: "Shepard's Signal: Neutral analysis"
  };
};

const getCitationPreview = (label: string, detail: string) => {
  const short = label.length > 42 ? `${label.slice(0, 42)}...` : label;
  return {
    title: short || "Citation",
    cite: detail || "Citation detail unavailable",
    summary: "Hover preview: treatment signals and citing decisions.",
    action: "Open Shepardize"
  };
};

const severityTone: Record<RiskSeverity, string> = {
  LOW: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  MEDIUM: "border-amber-400/40 text-amber-200 bg-amber-500/10",
  HIGH: "border-red-500/40 text-red-200 bg-red-500/10",
  CRITICAL: "border-red-600/60 text-red-100 bg-red-600/20"
};

const severityColor: Record<RiskSeverity, string> = {
  LOW: "#34d399",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#ef4444"
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function buildHtmlFromText(text: string) {
  const parts = String(text || "").split(/\n\n+/g).filter(Boolean);
  if (!parts.length) return "<p></p>";
  return parts.map((part) => `<p>${escapeHtml(part)}</p>`).join("");
}

function buildNormalizedIndex(doc: any) {
  const chars: Array<{ char: string; pos: number }> = [];
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = String(node.text || "");
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (/\s/.test(ch)) continue;
      chars.push({ char: ch.toLowerCase(), pos: pos + i });
    }
  });
  return {
    text: chars.map((c) => c.char).join(""),
    positions: chars.map((c) => c.pos)
  };
}

export default function DraftingCanvas({
  workspaceId,
  exhibitId,
  matterId,
  onDocCitationClick,
  onMediaCitationClick
}: Props) {
  const { authed } = useSession();
  const { status: aiStatus, loading: aiLoading } = useAiStatus(authed);
  const [docText, setDocText] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [outlineMode, setOutlineMode] = useState(true);
  const [pluginMode, setPluginMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [playbookViolation, setPlaybookViolation] = useState<string | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>("");
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string>("");
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);
  const highlightRangesRef = useRef<HighlightRange[]>([]);
  const [versionHistory, setVersionHistory] = useState<Array<{ id: string; label: string; timestamp: string; content: string }>>(
    []
  );
  const collaborators = [
    { id: "u1", name: "Alicia Grant", role: "Partner" },
    { id: "u2", name: "Noah Patel", role: "Associate" },
    { id: "u3", name: "Riley Chen", role: "Paralegal" }
  ];

  const saveVersion = () => {
    const content = editor?.getText() || docText || "";
    const next = {
      id: `v-${Date.now()}`,
      label: `Snapshot ${versionHistory.length + 1}`,
      timestamp: new Date().toLocaleTimeString(),
      content
    };
    setVersionHistory((prev) => [next, ...prev].slice(0, 8));
    logForensicEvent("draft.version.saved", { label: next.label });
  };

  const restoreVersion = (content: string) => {
    editor?.commands.setContent(buildHtmlFromText(content || ""));
    setDocText(content || "");
    logForensicEvent("draft.version.restored", { length: content?.length || 0 });
  };

  const diffLines = (base: string, next: string) => {
    const baseLines = (base || "").split(/\r?\n/);
    const nextLines = (next || "").split(/\r?\n/);
    const result: Array<{ type: "add" | "del" | "same"; text: string }> = [];
    const max = Math.max(baseLines.length, nextLines.length);
    for (let i = 0; i < max; i += 1) {
      const a = baseLines[i];
      const b = nextLines[i];
      if (a === b) {
        if (a) result.push({ type: "same", text: a });
      } else {
        if (a) result.push({ type: "del", text: a });
        if (b) result.push({ type: "add", text: b });
      }
    }
    return result;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true })
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[500px] focus:outline-none text-sm leading-relaxed"
      },
      handleClick: (_view, pos) => {
        const range = highlightRangesRef.current.find((item) => pos >= item.from && pos <= item.to);
        if (range) {
          setSelectedRiskId(range.id);
        }
        return false;
      }
    }
  });

  const selectedRisk = useMemo(
    () => risks.find((risk) => risk.clauseId === selectedRiskId) || risks[0],
    [risks, selectedRiskId]
  );
  const outlineSections = useMemo(() => {
    const lines = String(docText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const headings = lines.filter((line) => {
      const short = line.length <= 70;
      const endsWithColon = line.endsWith(":");
      const allCaps = line.length <= 50 && line === line.toUpperCase() && /[A-Z]/.test(line);
      return short && (endsWithColon || allCaps);
    });
    return headings.slice(0, 10);
  }, [docText]);

  useEffect(() => {
    if (!workspaceId || !authed) return;
    api.get(`/workspaces/${workspaceId}/playbooks`)
      .then((data: any) => {
        const list = Array.isArray(data?.playbooks) ? data.playbooks : [];
        if (list.length) {
          setPlaybooks(list);
          if (!selectedPlaybookId) {
            setSelectedPlaybookId(list[0].id);
          }
          return;
        }
        setPlaybooks([]);
      })
      .catch(() => {
        setPlaybooks([]);
      });
  }, [workspaceId, authed, selectedPlaybookId]);

  useEffect(() => {
    if (!workspaceId || !exhibitId || !matterId) return;
    setDocLoading(true);
    setDocError(null);
    api.get(`/workspaces/${workspaceId}/matters/${matterId}/exhibits/${exhibitId}/document-chunks`)
      .then((data: any) => {
        const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
        const combined = chunks.map((chunk: any) => String(chunk?.text || "")).join("\n\n");
        setDocText(combined);
      })
      .catch((err: any) => {
        setDocError(err?.message || "Unable to load document text.");
        setDocText("");
      })
      .finally(() => setDocLoading(false));
  }, [workspaceId, exhibitId, matterId]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(buildHtmlFromText(docText));
  }, [editor, docText]);

  useEffect(() => {
    if (!editor) return;
    highlightRangesRef.current = [];
    const doc = editor.state.doc;
    const selection = editor.state.selection;
    const textIndex = buildNormalizedIndex(doc);

    editor.commands.setTextSelection({ from: 0, to: doc.content.size });
    editor.commands.unsetMark("highlight");
    editor.commands.setTextSelection(selection);

    for (const risk of risks) {
      const clauseText = String(risk.clauseText || "").replace(/\s+/g, "").toLowerCase();
      if (!clauseText) continue;
      const idx = textIndex.text.indexOf(clauseText);
      if (idx === -1) continue;
      const startPos = textIndex.positions[idx];
      const endPos = textIndex.positions[idx + clauseText.length - 1];
      if (!Number.isFinite(startPos) || !Number.isFinite(endPos)) continue;
      const from = startPos;
      const to = endPos + 1;
      editor.commands.setTextSelection({ from, to });
      editor.commands.setMark("highlight", { color: severityColor[risk.severity] });
      highlightRangesRef.current.push({ id: risk.clauseId, from, to });
    }

    editor.commands.setTextSelection(selection);
  }, [editor, risks]);

  const runReview = async () => {
    if (!workspaceId || !exhibitId || !matterId || !selectedPlaybookId) return;
    setRunLoading(true);
    setRunError(null);
    setSafetyWarning(null);
    try {
      const payload = await api.post(`/workspaces/${workspaceId}/matters/${matterId}/exhibits/${exhibitId}/risk-assess`, {
        playbookId: selectedPlaybookId
      });
      const assessments = Array.isArray(payload?.assessments) ? payload.assessments : [];
      setRisks(assessments);
      setSelectedRiskId(assessments[0]?.clauseId || "");
      if (!assessments.length) {
        setRunError("No admissible clauses found for this playbook.");
      }
    } catch (err: any) {
      const message = String(err?.message || "Risk assessment failed.");
      if (/NO_CITATION_FOUND|WITHHELD|citation/i.test(message)) {
        setSafetyWarning("Analysis Halted: Claims cannot be grounded in evidence.");
      } else {
        setRunError(message);
      }
      setRisks([]);
    } finally {
      setRunLoading(false);
    }
  };

  const handleInsertClause = async (category: string) => {
    const clause = insertClause(category);
    if (!clause || !editor) return;
    editor.commands.insertContent(`\n\n${clause}\n`);
    await logForensicEvent("drafting.insert.clause", { category });
  };

  const handleValidatePlaybook = async () => {
    const current = editor ? editor.getText() : docText;
    const result = validateContract(current || "");
    setPlaybookViolation(result.ok ? null : result.message);
    await logForensicEvent("drafting.validate.playbook", { ok: result.ok });
  };

  const renderCitationText = (text: string) => {
    const segments = parseCitations(text);
    return segments.map((segment, idx) => {
      if (segment.type === "text") {
        return <span key={`t-${idx}`}>{segment.value}</span>;
      }
      if (segment.type === "doc") {
        const signal = getShepardSignal(segment.label);
        const preview = getCitationPreview(segment.label, `p.${segment.page}`);
        return (
          <span key={`d-${idx}`} className="group relative inline-flex items-center">
            <button
              type="button"
              onClick={() => onDocCitationClick?.(segment.label, segment.page)}
              className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2"
            >
              {segment.raw}
            </button>
            <span className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-semibold uppercase tracking-wide ${signal.classes}`}>
              {signal.badge}
            </span>
            <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-xl opacity-0 transition group-hover:opacity-100">
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Shepardize</div>
              <div className="mt-2 text-sm text-white">{preview.title}</div>
              <div className="text-[10px] text-slate-400">{preview.cite}</div>
              <div className="mt-2 text-[11px] text-slate-300">{preview.summary}</div>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>{signal.label}</span>
                <span>{preview.action}</span>
              </div>
            </span>
          </span>
        );
      }
      const signal = getShepardSignal(segment.label);
      const preview = getCitationPreview(segment.label, `${Math.round(segment.seconds)}s`);
      return (
        <span key={`m-${idx}`} className="group relative inline-flex items-center">
          <button
            type="button"
            onClick={() => onMediaCitationClick?.(segment.label, segment.seconds)}
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            {segment.raw}
          </button>
          <span className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-semibold uppercase tracking-wide ${signal.classes}`}>
            {signal.badge}
          </span>
          <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-xl opacity-0 transition group-hover:opacity-100">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Shepardize</div>
            <div className="mt-2 text-sm text-white">{preview.title}</div>
            <div className="text-[10px] text-slate-400">{preview.cite}</div>
            <div className="mt-2 text-[11px] text-slate-300">{preview.summary}</div>
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <span>{signal.label}</span>
              <span>{preview.action}</span>
            </div>
          </span>
        </span>
      );
    });
  };

  return (
    <div
      className={`relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 ${
        pluginMode ? "max-w-[360px]" : ""
      }`}
    >
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 relative">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Admissibility Canvas</div>
            <div className="text-sm text-white font-semibold mt-2">Contract Draft</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <button
              type="button"
              onClick={() => setPluginMode((prev) => !prev)}
              className="rounded-full border border-white/10 px-2 py-1 uppercase tracking-[0.2em] text-slate-300 hover:border-white/30"
            >
              {pluginMode ? "Full" : "Plugin Mode"}
            </button>
            <button
              type="button"
              onClick={() => setOutlineMode((prev) => !prev)}
              className="rounded-full border border-white/10 px-2 py-1 uppercase tracking-[0.2em] text-slate-300 hover:border-white/30"
            >
              {outlineMode ? "Outline" : "Full Draft"}
            </button>
            <button
              type="button"
              onClick={() => setReviewMode((prev) => !prev)}
              className="rounded-full border border-white/10 px-2 py-1 uppercase tracking-[0.2em] text-slate-300 hover:border-white/30"
            >
              {reviewMode ? "Edit" : "Review"}
            </button>
            <span>{docLoading ? "Loading document..." : docError ? "Document unavailable" : "Loaded"}</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/40 p-4 min-h-[520px]">
          {docError ? (
            <div className="text-sm text-red-200">{docError}</div>
          ) : reviewMode ? (
            <div className="space-y-2 text-xs text-slate-200">
              {diffLines(docText, editor?.getText() || docText).map((line, idx) => (
                <div
                  key={`diff-${idx}`}
                  className={
                    line.type === "add"
                      ? "text-emerald-300 underline"
                      : line.type === "del"
                      ? "text-rose-300 line-through"
                      : "text-slate-300"
                  }
                >
                  {line.text}
                </div>
              ))}
            </div>
          ) : outlineMode ? (
            <div className="text-sm text-slate-200 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Outline First</div>
              {outlineSections.length ? (
                <ul className="space-y-2">
                  {outlineSections.map((section) => (
                    <li key={section} className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
                      {section.replace(/:$/, "")}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-400">No headings detected yet. Expand to full draft to edit.</div>
              )}
              <button
                type="button"
                onClick={() => setOutlineMode(false)}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200 hover:bg-indigo-500/20"
              >
                Expand to Draft
              </button>
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Risk Analysis</div>
            <div className="text-xs text-slate-300 mt-1">
              {aiLoading ? "Checking AI status..." : aiStatus ? `${aiStatus.activeProvider} (${aiStatus.health})` : "AI status unavailable"}
            </div>
          </div>
          <button
            type="button"
            onClick={runReview}
            disabled={runLoading || !selectedPlaybookId || !authed}
            className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
          >
            {runLoading ? "Running..." : "Run Review"}
          </button>
        </div>

        <div className="mt-3">
          <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Playbook</label>
          <select
            value={selectedPlaybookId}
            onChange={(e) => setSelectedPlaybookId(e.target.value)}
            id="drafting-playbook"
            data-testid="drafting-playbook"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 px-2 py-2 text-xs text-slate-100"
          >
            <option value="">Select playbook</option>
            {playbooks.map((pb) => (
              <option key={pb.id} value={pb.id}>{pb.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-slate-300">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Playbook Rule Trace</div>
          <div className="mt-2">Order: preferred match → clause type detect → trigger rules.</div>
          <div className="mt-1">Example trigger: Venue must be Michigan. Non-standard venues route for approval.</div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Clause Library</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Indemnification", "Force Majeure", "Venue"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleInsertClause(cat)}
                className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 hover:border-white/30"
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleValidatePlaybook}
            className="mt-3 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200 hover:bg-amber-500/20"
          >
            Validate Playbook
          </button>
          {playbookViolation ? (
            <div className="mt-2 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-200">
              {playbookViolation}
            </div>
          ) : null}
        </div>

        {runError ? (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
            {runError}
          </div>
        ) : null}

        <div className="mt-4 flex-1 overflow-y-auto space-y-2">
          {risks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-black/30 p-3 text-xs text-slate-400">
              No assessments yet. Run a review to populate risks.
            </div>
          ) : (
            risks.map((risk) => {
              const signal = getShepardSignal(risk.clauseType || risk.clauseId);
              return (
              <button
                key={risk.clauseId}
                type="button"
                onClick={() => setSelectedRiskId(risk.clauseId)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                  selectedRisk?.clauseId === risk.clauseId
                    ? "border-white/30 bg-slate-900/70 text-white"
                    : "border-white/10 bg-black/30 text-slate-300 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{risk.clauseType}</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${severityTone[risk.severity]}`}>
                      {risk.severity}
                    </span>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold uppercase ${signal.classes}`}
                      title={signal.tooltip}
                    >
                      {signal.badge}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 line-clamp-2">{risk.clauseText}</div>
              </button>
            );
            })
          )}
        </div>

        {selectedRisk ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Risk Detail</div>
            <div className="mt-2 text-xs text-white font-semibold">{selectedRisk.clauseType}</div>
            <div className="mt-1 text-[10px] text-slate-400">Clause Version: v2.1 (playbook)</div>
            <div className="mt-2 text-[10px] text-slate-400">Severity</div>
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <span>{selectedRisk.severity}</span>
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold uppercase ${
                  getShepardSignal(selectedRisk.clauseType || selectedRisk.clauseId).classes
                }`}
                title={getShepardSignal(selectedRisk.clauseType || selectedRisk.clauseId).tooltip}
              >
                {getShepardSignal(selectedRisk.clauseType || selectedRisk.clauseId).badge}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Redline Suggestion</div>
            <div className="text-xs text-slate-200">{renderCitationText(selectedRisk.redlineSuggestion)}</div>
            <button
              type="button"
              className="mt-3 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200 hover:bg-indigo-500/20"
            >
              Verify Citation
            </button>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Version History</div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={saveVersion}
          >
            Save Version
          </Button>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            {versionHistory.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-slate-500">
                No saved versions yet.
              </div>
            ) : (
              versionHistory.map((ver) => (
                <div key={ver.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                  <div>
                    <div className="text-slate-200">{ver.label}</div>
                    <div className="text-[10px] text-slate-500">{ver.timestamp}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => restoreVersion(ver.content)}>
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Collaboration</div>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            {collaborators.map((person) => (
              <div key={person.id} className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 py-2">
                <div>
                  <div className="text-slate-100">{person.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">{person.role}</div>
                </div>
                <span className="text-[10px] text-emerald-200">Online</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {runLoading ? (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-slate-200">
            Generating embeddings and running risk analysis...
          </div>
        </div>
      ) : null}

      {safetyWarning ? (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-300 mb-2">Safety Warning</div>
            <div className="text-sm text-red-100">{safetyWarning}</div>
            <button
              type="button"
              onClick={() => setSafetyWarning(null)}
              className="mt-4 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-red-100 hover:bg-red-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
