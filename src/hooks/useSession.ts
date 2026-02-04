import { useEffect, useState } from "react";
import { getWorkspaceRole, isAuthenticated, refreshSession } from "../services/authStorage";

export function useSession() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [role, setRole] = useState(getWorkspaceRole() || "partner");

  useEffect(() => {
    let active = true;
    refreshSession().then((ok) => {
      if (!active) return;
      setAuthed(ok);
      setRole(getWorkspaceRole() || "partner");
    });
    return () => {
      active = false;
    };
  }, []);

  return { authed, role };
}
