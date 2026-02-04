import React from "react";
import { GOVERNANCE_LABELS, GOVERNANCE_TONES, GovernanceLabelKey } from "./governance";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<GovernanceLabelKey, string> = {
  withheld: "border-[#EF4444]/40 bg-[#EF4444]/10 text-white",
  proven: "border-[#10B981]/40 bg-[#10B981]/10 text-white",
  releaseGate: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-white",
};

export type GovernanceBannerProps = React.HTMLAttributes<HTMLDivElement> & {
  label: GovernanceLabelKey;
  subtitle?: string;
};

export default function GovernanceBanner({ label, subtitle, className, ...props }: GovernanceBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] min-h-[28px]",
        toneStyles[label],
        className
      )}
      {...props}
    >
      <span className="font-semibold">{GOVERNANCE_LABELS[label]}</span>
      {subtitle ? <span className="text-[11px] opacity-75 normal-case tracking-wide">{subtitle}</span> : null}
    </div>
  );
}
