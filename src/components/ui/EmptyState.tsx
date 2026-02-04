import React from "react";
import Button from "./Button";

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center text-slate-300">
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      <div className="mt-2 text-sm text-slate-400">{description}</div>
      {actionLabel ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
