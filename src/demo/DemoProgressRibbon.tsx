import React from "react";
import { isAutoDemoEnabled, useAutoDemo } from "../../hooks/useAutoDemo";

export default function DemoProgressRibbon() {
  const demo = useAutoDemo();
  if (!isAutoDemoEnabled()) return null;
  if (!demo.active) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-slate-900 z-[100]">
      <div
        className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
        style={{ width: `${demo.stageProgress}%` }}
      />
      <div className="absolute top-2 right-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
        CURRENT_PHASE: {demo.stage.label}
      </div>
    </div>
  );
}
