import React from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "slate" | "green" | "red" | "blue" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-[#334155] text-[#E2E8F0] border-[#475569]",
    green: "bg-[#10B981] text-white border-[#10B981]",
    red: "bg-[#EF4444] text-white border-[#EF4444]",
    blue: "bg-[#1E293B] text-white border-[#1E293B] font-semibold",
    amber: "bg-[#F59E0B] text-white border-[#F59E0B]",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs", tones[tone], className)}
      {...props}
    />
  );
}
