import React, { useState } from "react";
import IntegrityOverview from "./IntegrityOverview";

export default function IntegrityOverviewPage() {
  const [role, setRole] = useState<"INVESTIGATOR" | "OPPOSING_COUNSEL">("INVESTIGATOR");
  return <IntegrityOverview userRole={role} setUserRole={setRole} />;
}
