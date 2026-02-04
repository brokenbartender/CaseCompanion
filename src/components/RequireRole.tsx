import React from "react";
import { useSession } from "../hooks/useSession";

export default function RequireRole({
  role,
  children
}: {
  role: "partner" | "associate";
  children: React.ReactNode;
}) {
  const { role: current } = useSession();
  if (current !== role) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
        Unauthorized: requires {role} role.
      </div>
    );
  }
  return <>{children}</>;
}
