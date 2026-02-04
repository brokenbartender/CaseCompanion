import React, { createContext, useContext, useMemo, useState } from "react";

export type UserRole = "Partner" | "Associate" | "Client";

type UserContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("Partner");
  const value = useMemo(() => ({ role, setRole }), [role]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
