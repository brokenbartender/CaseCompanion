import React from "react";
import Badge from "./Badge";
import { GOVERNANCE_LABELS, GOVERNANCE_TONES, GovernanceLabelKey } from "./governance";

export type GovernanceBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  label: GovernanceLabelKey;
};

export default function GovernanceBadge({ label, className, ...props }: GovernanceBadgeProps) {
  return (
    <Badge tone={GOVERNANCE_TONES[label]} className={className} {...props}>
      {GOVERNANCE_LABELS[label]}
    </Badge>
  );
}

