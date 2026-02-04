import React, { forwardRef, useEffect, useState } from "react";

type Props = {
  bbox: number[];
  label?: string;
  isMediaReady?: boolean;
};

const SniperOverlay = forwardRef<HTMLDivElement, Props>(({ bbox, label, isMediaReady = true }, ref) => {
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (!isMediaReady) {
      setFlashOn(false);
      return;
    }
    setFlashOn(true);
    const t = window.setTimeout(() => setFlashOn(false), 1200);
    return () => window.clearTimeout(t);
  }, [isMediaReady]);

  const [x = 0, y = 0, w = 0, h = 0] = bbox;
  const left = `${x / 10}%`;
  const top = `${y / 10}%`;
  const width = `${w / 10}%`;
  const height = `${h / 10}%`;

  return (
    <div
      ref={ref}
      className={`absolute sniper-wash overflow-hidden ${flashOn ? "animate-pulse" : ""}`}
      style={{ left, top, width, height, zIndex: 3 }}
    >
      <div className="sniper-scan-line" />
      {label ? (
        <div className="absolute -top-5 left-0 bg-indigo-600 text-white text-[9px] font-mono font-bold px-1 rounded-sm">
          {label}
        </div>
      ) : null}
      <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 border-l-2 border-t-2 border-indigo-400" />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 border-r-2 border-t-2 border-indigo-400" />
      <span className="absolute -left-0.5 -bottom-0.5 h-2.5 w-2.5 border-l-2 border-b-2 border-indigo-400" />
      <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 border-r-2 border-b-2 border-indigo-400" />
    </div>
  );
});

SniperOverlay.displayName = "SniperOverlay";

export default SniperOverlay;
