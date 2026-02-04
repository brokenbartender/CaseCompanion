import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SplitPaneViewerProps = {
  left: React.ReactNode;
  right: React.ReactNode;
};

const STORAGE_KEY = "lexipro.splitpane.ratio";
const DEFAULT_RATIO = 0.4;
const MIN_RATIO = 0.3;
const MAX_RATIO = 0.7;

function clampRatio(value: number) {
  if (Number.isNaN(value)) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value));
}

export default function SplitPaneViewer({ left, right }: SplitPaneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_RATIO;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RATIO;
    const parsed = Number(raw);
    return clampRatio(Number.isFinite(parsed) ? parsed : DEFAULT_RATIO);
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  const updateRatioFromEvent = useCallback((event: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    const next = clampRatio((event.clientX - rect.left) / rect.width);
    setRatio(next);
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: MouseEvent) => updateRatioFromEvent(event);
    const handleUp = (event: MouseEvent) => {
      updateRatioFromEvent(event);
      setDragging(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, updateRatioFromEvent]);

  const leftStyle = useMemo(() => ({ flexBasis: `${ratio * 100}%` }), [ratio]);
  const rightStyle = useMemo(() => ({ flexBasis: `${(1 - ratio) * 100}%` }), [ratio]);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full min-w-0 items-stretch">
      <div className="flex min-h-0 min-w-0 flex-col pr-2" style={leftStyle}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className={`w-2 cursor-col-resize rounded-full bg-slate-800 hover:bg-yellow-500/50 ${
          dragging ? "bg-yellow-500/70" : ""
        }`}
      />
      <div className="flex min-h-0 min-w-0 flex-col pl-2" style={rightStyle}>
        {right}
      </div>
    </div>
  );
}
