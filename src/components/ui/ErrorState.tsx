import React from "react";

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
      {message}
    </div>
  );
}
