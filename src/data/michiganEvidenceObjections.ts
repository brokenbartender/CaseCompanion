export type ObjectionCard = {
  id: string;
  title: string;
  rule: string;
  whenToUse: string[];
  sources: { label: string; url: string }[];
};

export const MICHIGAN_OBJECTION_CARDS: ObjectionCard[] = [
  {
    id: "relevance",
    title: "Relevance",
    rule: "MRE 401 / 402",
    whenToUse: [
      "Evidence does not make a fact of consequence more or less probable.",
      "Evidence is not tied to any issue in the case."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Relevancy (MRE 401/402)",
        url: "https://www.courts.michigan.gov/4a50d8/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_2_Relevancy/Relevancy-.htm"
      }
    ]
  },
  {
    id: "unfair-prejudice",
    title: "Unfair Prejudice / Confusion / Waste of Time",
    rule: "MRE 403",
    whenToUse: [
      "Probative value is substantially outweighed by unfair prejudice.",
      "Evidence is likely to confuse, mislead, or waste time."
    ],
    sources: [
      {
        label: "Benchbook – Photographic Evidence (MRE 403)",
        url: "https://www.courts.michigan.gov/49da59/siteassets/publications/benchbooks/cpp/cppresponsivehtml5.zip/CPP/Ch_11_Evidentiary_Issues/Photographic_Evidence-.htm"
      }
    ]
  },
  {
    id: "character",
    title: "Character / Other-Acts Evidence",
    rule: "MRE 404(b)",
    whenToUse: [
      "Evidence is offered to show someone acted in conformity with a bad character.",
      "Other-acts evidence is used only to imply propensity."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Character Evidence (MRE 404)",
        url: "https://staging.courts.michigan.gov/49325e/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_2_Relevancy/Character_Evidence.htm"
      }
    ]
  },
  {
    id: "hearsay",
    title: "Hearsay",
    rule: "MRE 801 / 802",
    whenToUse: [
      "Out-of-court statement offered for the truth of the matter asserted.",
      "No applicable hearsay exclusion or exception."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Hearsay (MRE 801/802)",
        url: "https://www.courts.michigan.gov/4a187e/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_5_Hearsay/Chapter_5__58__Hearsay.htm"
      }
    ]
  },
  {
    id: "personal-knowledge",
    title: "Lack of Personal Knowledge",
    rule: "MRE 602",
    whenToUse: [
      "Witness did not observe or perceive the event or condition.",
      "Testimony is based on what others told the witness."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Foundation (MRE 602)",
        url: "https://www.courts.michigan.gov/4a271f/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_1_General/Foundation.htm"
      }
    ]
  },
  {
    id: "lay-opinion",
    title: "Lay Opinion / Speculation",
    rule: "MRE 701",
    whenToUse: [
      "Opinion is not based on the witness's perception.",
      "Opinion is not helpful to understanding testimony or a fact in issue."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Lay Testimony (MRE 701)",
        url: "https://staging.courts.michigan.gov/4a50d8/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_3_Testimony/Lay_Testimony.htm"
      }
    ]
  },
  {
    id: "expert-opinion",
    title: "Improper Expert Opinion",
    rule: "MRE 702",
    whenToUse: [
      "Witness lacks expert qualifications.",
      "Opinion not based on sufficient facts or reliable methods."
    ],
    sources: [
      {
        label: "Evidence Benchbook – Expert Testimony (MRE 702)",
        url: "https://www.courts.michigan.gov/4a7fe2/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_4_Experts_and_Scientific_Evidence/Chapter_4__58__Expert_Witnesses_and_Scientific_Evidence.htm"
      }
    ]
  },
  {
    id: "authentication",
    title: "Authentication / Foundation",
    rule: "MRE 901",
    whenToUse: [
      "Item is not shown to be what it is claimed to be.",
      "No witness or method establishes authenticity."
    ],
    sources: [
      {
        label: "Benchbook – Photographic Evidence (MRE 901)",
        url: "https://www.courts.michigan.gov/49da59/siteassets/publications/benchbooks/cpp/cppresponsivehtml5.zip/CPP/Ch_11_Evidentiary_Issues/Photographic_Evidence-.htm"
      },
      {
        label: "Evidence Benchbook – Foundation (MRE 901)",
        url: "https://www.courts.michigan.gov/4a271f/siteassets/publications/benchbooks/evidence/evidenceresponsivehtml5.zip/Evidence/Ch_1_General/Foundation.htm"
      }
    ]
  }
];
