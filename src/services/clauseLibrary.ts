export const CLAUSE_LIBRARY: Record<string, string> = {
  Indemnification:
    "Indemnification. Each party shall indemnify, defend, and hold harmless the other party from any claims, damages, or liabilities arising from its breach of this Agreement.",
  "Force Majeure":
    "Force Majeure. Neither party shall be liable for delays or failures due to events beyond reasonable control, including acts of God, strikes, or governmental actions.",
  Venue:
    "Venue. The parties agree that any dispute shall be resolved exclusively in the courts of Michigan and governed by Michigan law."
};

export function insertClause(category: string) {
  return CLAUSE_LIBRARY[category] || "";
}

export function validateContract(text: string) {
  if (/Arbitration in New York/i.test(text)) {
    return {
      ok: false,
      message: "Playbook Violation: Arbitration in New York detected. Preferred: Arbitration in Michigan."
    };
  }
  return { ok: true, message: "No playbook violations detected." };
}
