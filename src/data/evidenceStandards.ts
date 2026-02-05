export const RAM_CHECKLIST = [
  {
    title: "Relevant",
    description: "Does it make a fact more or less likely?",
    prompts: [
      "Connects to an element of assault or battery.",
      "Supports damages or credibility.",
      "Ties to a specific timeline event."
    ]
  },
  {
    title: "Authentic",
    description: "Can you prove it is what you claim it is?",
    prompts: [
      "Original file preserved and hashed.",
      "Source identified (who, where, when).",
      "Chain-of-custody notes are recorded."
    ]
  },
  {
    title: "Material",
    description: "Does it relate to what the judge must decide?",
    prompts: [
      "Directly supports liability or damages.",
      "Not merely cumulative or distracting.",
      "Links to a required element or defense."
    ]
  }
];

export const FORENSICS_WORKFLOW = [
  {
    title: "Intake and preservation",
    tasks: [
      "Record source device and file origin.",
      "Create a working copy and preserve the original.",
      "Compute and store hashes for original and working copy."
    ]
  },
  {
    title: "Processing log",
    tasks: [
      "Record tools and versions used for extraction.",
      "Store ffprobe/mediainfo outputs with timestamps.",
      "Preserve contact sheets, keyframes, and audio extracts."
    ]
  },
  {
    title: "Verification",
    tasks: [
      "Re-hash artifacts after processing.",
      "Log any discrepancies and explain them.",
      "Generate an integrity report for court use."
    ]
  }
];

export const CHAIN_OF_CUSTODY_TEMPLATE = [
  "Item name and exhibit ID",
  "Source and acquisition date",
  "Custodian name and role",
  "Storage location",
  "Hash values (SHA-256)",
  "Transfers or access events"
];
