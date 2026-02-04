export type JuryInstruction = {
  id: string;
  title: string;
  text: string[];
  sourcePath: string;
};

export const MCI_115: JuryInstruction[] = [
  {
    id: "115.01",
    title: "M Civ JI 115.01 Assault - Definition",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.01_Assault_-_Definition.htm",
    text: [
      "An assault is any intentional, unlawful threat or offer to do bodily injury to another by force, under circumstances which create a well-founded fear of imminent peril, coupled with the apparent present ability to carry out the act if not prevented.",
      "See Tinkler v Richter, 295 Mich 396; 295 NW 201 (1940)."
    ]
  },
  {
    id: "115.02",
    title: "M Civ JI 115.02 Battery - Definition",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.02_Battery_-_Definition.htm",
    text: [
      "A battery is the willful or intentional touching of a person against that person's will [by another / by an object or substance put in motion by another person].",
      "See Tinkler v Richter, 295 Mich 396; 295 NW 201 (1940)."
    ]
  },
  {
    id: "115.20",
    title: "M Civ JI 115.20 Assault - Burden of Proof",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.20_Assault_-_Burden_of_Proof.htm",
    text: [
      "Plaintiff has the burden of proving:",
      "(a) defendant made an intentional and unlawful threat or offer to do bodily injury to the plaintiff;",
      "(b) the threat or offer was made under circumstances which created in plaintiff a well-founded fear of imminent peril;",
      "(c) defendant had the apparent present ability to carry out the act if not prevented.",
      "Verdict for plaintiff if all elements proven (and any defense not proven); verdict for defendant if any element not proven."
    ]
  },
  {
    id: "115.21",
    title: "M Civ JI 115.21 Battery - Burden of Proof",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.21_Battery_-_Burden_of_Proof.htm",
    text: [
      "Plaintiff has the burden of proving that defendant willfully and intentionally touched the plaintiff against the plaintiff's will (or put in motion an object or substance that touched the plaintiff against the plaintiff's will).",
      "Verdict for plaintiff if all elements proven (and any defense not proven); verdict for defendant if any element not proven."
    ]
  },
  {
    id: "115.05",
    title: "M Civ JI 115.05 Assault and Battery - Defense of Self-Defense",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.05_Assault_and_Battery_-_Defense_of_Self-Defense.htm",
    text: [
      "A person who is assaulted may use such reasonable force as may be, or reasonably appears at the time to be, necessary to protect himself or herself from bodily harm in repelling the assault.",
      "See Anders v Clover, 198 Mich 763; 165 NW 640 (1917); Kent v Cole, 84 Mich 579; 48 NW 168 (1891)."
    ]
  },
  {
    id: "115.06",
    title: "M Civ JI 115.06 Assault and Battery - Defense of Consent (Mutual Affray)",
    sourcePath: "references/mci_civil/Model_Civil_Jury_Instructions/Civil_Chapter_115/M_Civ_JI_115.06_Assault_and_Battery_-_Defense_of_Consent_by_Voluntarily_Entering_a_Mutual_Affray.htm",
    text: [
      "If plaintiff voluntarily engaged in a fight for the sake of fighting (not self-defense), plaintiff may not recover unless defendant beat the plaintiff excessively or used unreasonable force.",
      "See Galbraith v Fleming, 60 Mich 403; 27 NW 581 (1886)."
    ]
  }
];
