import React, { useEffect, useState } from "react";
import { useDemoDirector } from "./useDemoDirector";

const DEMO_DIRECTOR_FLAG = "lexipro_demo_director";

export default function DemoDirectorOverlay() {
  const director = useDemoDirector();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return false;
      return sessionStorage.getItem(DEMO_DIRECTOR_FLAG) === "1";
    };
    setActive(check());
    const interval = window.setInterval(() => setActive(check()), 500);
    return () => window.clearInterval(interval);
  }, []);

  if (!active || !director.active) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[80] rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-xs text-slate-200 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Demo Director</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-slate-400">Stage:</span>
        <span className="font-mono text-emerald-200">{director.stage}</span>
      </div>
      {director.error ? (
        <div className="mt-1 text-[11px] text-amber-200">{director.error}</div>
      ) : null}
    </div>
  );
}
