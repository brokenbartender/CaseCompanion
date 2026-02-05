export const FILING_CHECKLIST = [
  {
    title: "Court selection (Oakland County)",
    tasks: [
      "Choose 52nd District Court for claims up to $25,000.",
      "Choose 6th Circuit Court for claims above $25,000.",
      "Confirm venue based on where the incident occurred or defendant resides."
    ],
    sources: ["Civil Benchbook", "MCR Chapter 2"]
  },
  {
    title: "MiFILE account setup",
    tasks: [
      "Register as a pro se filer (file for myself).",
      "Add a payment method for filing fees.",
      "Confirm the correct court in the MiFILE portal."
    ],
    sources: ["MiFILE guidance", "Civil Benchbook"]
  },
  {
    title: "A-to-Z document pack",
    tasks: [
      "Summons (MC 01) prepared as a separate PDF.",
      "Complaint (MC 01a or custom complaint) prepared as a separate PDF.",
      "Fee waiver request (MC 20) if applicable.",
      "Protected PII form (MC 97) if sensitive data is needed."
    ],
    sources: ["MCR 2.101", "MCR 2.102", "Civil Benchbook"]
  },
  {
    title: "Initiate case in MiFILE",
    tasks: [
      "Select Initiate a New Case.",
      "Enter party data for plaintiff and defendant.",
      "Upload each filing as a separate PDF with correct labels.",
      "Pay fees or submit fee waiver request."
    ],
    sources: ["MiFILE guidance", "Civil Benchbook"]
  },
  {
    title: "Summons issuance tracking",
    tasks: [
      "Record issuance date and expiration window.",
      "Download stamped copies for service.",
      "Store stamped summons in the Evidence Vault."
    ],
    sources: ["MCR 2.102", "Civil Process Handbook"]
  },
  {
    title: "Service + Proof of Service",
    tasks: [
      "Use a qualified server and complete service.",
      "Record service date and method.",
      "File the Proof of Service in MiFILE."
    ],
    sources: ["MCR 2.105", "Service of Process Table"]
  }
];
