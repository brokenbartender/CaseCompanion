import React from "react";
import { GOVERNANCE_LABELS, GOVERNANCE_TONES, GovernanceLabelKey } from "./governance";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<GovernanceLabelKey, string> = {
  withheld: "bg-[#EF4444]/15 text-white border-[#EF4444]/40",
  proven: "bg-[#10B981]/15 text-white border-[#10B981]/40",
  releaseGate: "bg-[#F59E0B]/15 text-white border-[#F59E0B]/40",
};

export type GovernanceRibbonProps = React.HTMLAttributes<HTMLDivElement> & {
  label: GovernanceLabelKey;
};

export default function GovernanceRibbon({ label, className, ...props }: GovernanceRibbonProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] min-h-[28px]",
        toneStyles[label],
        className
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      <span>{GOVERNANCE_LABELS[label]}</span>
    </div>
  );
}
