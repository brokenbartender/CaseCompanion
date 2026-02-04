export type CaseLaw = {
  citation: string;
  name: string;
  year: number;
  holding: string;
  jurisdiction: string;
};

export const mockCaseLawDB: CaseLaw[] = [
  { citation: "410 U.S. 113", name: "Roe v. Wade", year: 1973, holding: "Privacy rights in reproductive decisions.", jurisdiction: "US Supreme Court" },
  { citation: "347 U.S. 483", name: "Brown v. Board", year: 1954, holding: "Segregation unconstitutional.", jurisdiction: "US Supreme Court" },
  { citation: "384 U.S. 436", name: "Miranda v. Arizona", year: 1966, holding: "Miranda warnings required.", jurisdiction: "US Supreme Court" },
  { citation: "163 U.S. 537", name: "Plessy v. Ferguson", year: 1896, holding: "Separate but equal (overruled).", jurisdiction: "US Supreme Court" },
  { citation: "489 U.S. 189", name: "Graham v. Connor", year: 1989, holding: "Objective reasonableness standard.", jurisdiction: "US Supreme Court" },
  { citation: "531 U.S. 32", name: "Bush v. Gore", year: 2000, holding: "Equal protection in recounts.", jurisdiction: "US Supreme Court" },
  { citation: "426 U.S. 229", name: "Gregg v. Georgia", year: 1976, holding: "Death penalty framework.", jurisdiction: "US Supreme Court" },
  { citation: "517 U.S. 806", name: "BMW v. Gore", year: 1996, holding: "Punitive damages limits.", jurisdiction: "US Supreme Court" },
  { citation: "570 U.S. 744", name: "Shelby County v. Holder", year: 2013, holding: "Voting Rights Act formula invalidated.", jurisdiction: "US Supreme Court" },
  { citation: "576 U.S. 644", name: "Obergefell v. Hodges", year: 2015, holding: "Same-sex marriage recognized.", jurisdiction: "US Supreme Court" },
  { citation: "138 S. Ct. 2392", name: "Carpenter v. United States", year: 2018, holding: "Cell-site location privacy.", jurisdiction: "US Supreme Court" },
  { citation: "141 S. Ct. 2228", name: "Fulton v. City of Philadelphia", year: 2021, holding: "Free exercise clause limits.", jurisdiction: "US Supreme Court" },
  { citation: "600 U.S. 570", name: "Students for Fair Admissions", year: 2023, holding: "Race-based admissions limits.", jurisdiction: "US Supreme Court" },
  { citation: "3 F.4th 122", name: "Bostock v. Clayton County", year: 2020, holding: "Title VII covers LGBTQ status.", jurisdiction: "US Supreme Court" },
  { citation: "815 F.3d 123", name: "Smith v. Jones", year: 2016, holding: "Duty of care in negligence.", jurisdiction: "6th Circuit" },
  { citation: "904 F.2d 456", name: "United States v. Miller", year: 1990, holding: "Good-faith exception applied.", jurisdiction: "9th Circuit" },
  { citation: "221 N.W.2d 543", name: "People v. Kline", year: 1974, holding: "Criminal intent inferred.", jurisdiction: "Michigan" },
  { citation: "12 Cal.4th 201", name: "Calderon v. Miller", year: 1996, holding: "Contract ambiguity standard.", jurisdiction: "California" },
  { citation: "89 N.Y.2d 321", name: "Johnson v. Metro", year: 1997, holding: "Tort proximate cause.", jurisdiction: "New York" },
  { citation: "52 Tex.3d 88", name: "Andrews v. Lone Star", year: 2015, holding: "Negligence per se.", jurisdiction: "Texas" },
  { citation: "210 Ill.2d 123", name: "Parker v. West", year: 2004, holding: "Strict product liability.", jurisdiction: "Illinois" },
  { citation: "287 F.3d 631", name: "Davis v. City", year: 2002, holding: "Qualified immunity analysis.", jurisdiction: "2nd Circuit" },
  { citation: "678 F.2d 911", name: "United States v. Barnes", year: 1982, holding: "Evidence suppression rules.", jurisdiction: "5th Circuit" },
  { citation: "300 F.3d 111", name: "Gomez v. State", year: 2001, holding: "Search incident to arrest.", jurisdiction: "7th Circuit" },
  { citation: "201 N.W. 42", name: "Lopez v. Auto", year: 1930, holding: "Duty to warn.", jurisdiction: "Michigan" },
  { citation: "98 So.3d 120", name: "Fletcher v. Gulf", year: 2012, holding: "Premises liability.", jurisdiction: "Florida" },
  { citation: "450 P.3d 909", name: "Carter v. Tech", year: 2019, holding: "Trade secret misappropriation.", jurisdiction: "Washington" },
  { citation: "71 A.3d 505", name: "Baker v. Union", year: 2010, holding: "Employment retaliation.", jurisdiction: "Pennsylvania" },
  { citation: "213 P.2d 430", name: "Harris v. Coast", year: 1950, holding: "Maritime negligence.", jurisdiction: "California" },
  { citation: "124 S.W.3d 987", name: "Knight v. Ranch", year: 2003, holding: "Assumption of risk.", jurisdiction: "Texas" },
  { citation: "601 N.E.2d 12", name: "Dunn v. Transit", year: 1992, holding: "Common carrier duty.", jurisdiction: "Indiana" },
  { citation: "901 P.2d 55", name: "Lee v. Pacific", year: 1995, holding: "Medical malpractice standard.", jurisdiction: "Oregon" },
  { citation: "77 N.C. App. 45", name: "Garcia v. Duke", year: 1987, holding: "Defamation elements.", jurisdiction: "North Carolina" },
  { citation: "411 Mass. 321", name: "Commonwealth v. Ryan", year: 1991, holding: "Evidentiary threshold.", jurisdiction: "Massachusetts" },
  { citation: "57 A.2d 88", name: "Nelson v. Harbor", year: 1948, holding: "Contract formation.", jurisdiction: "New Jersey" },
  { citation: "22 P.3d 77", name: "Howard v. Valley", year: 2001, holding: "Statutory interpretation.", jurisdiction: "Arizona" },
  { citation: "650 S.E.2d 12", name: "Young v. Energy", year: 2008, holding: "Utility liability.", jurisdiction: "Georgia" },
  { citation: "335 P.3d 21", name: "Adams v. City", year: 2014, holding: "Municipal immunity limits.", jurisdiction: "Colorado" },
  { citation: "111 So.2d 7", name: "Reed v. Parish", year: 1960, holding: "Governmental immunity.", jurisdiction: "Louisiana" },
  { citation: "17 P.2d 455", name: "Cruz v. Rail", year: 1934, holding: "Railway negligence.", jurisdiction: "New Mexico" },
  { citation: "703 N.W.2d 99", name: "State v. Owen", year: 2005, holding: "Search warrant scope.", jurisdiction: "Wisconsin" },
  { citation: "510 S.W.3d 299", name: "Phillips v. Market", year: 2017, holding: "Consumer fraud.", jurisdiction: "Missouri" },
  { citation: "900 P.2d 66", name: "Campbell v. State", year: 1991, holding: "Evidence chain of custody.", jurisdiction: "Nevada" },
  { citation: "444 S.E.2d 24", name: "Mason v. Coastal", year: 1994, holding: "Insurance bad faith.", jurisdiction: "South Carolina" },
  { citation: "12 P.3d 703", name: "Ortega v. West", year: 2000, holding: "Non-compete enforceability.", jurisdiction: "California" },
  { citation: "98 P.3d 1", name: "Stevens v. Media", year: 2004, holding: "First amendment limits.", jurisdiction: "Utah" },
  { citation: "24 N.E.3d 22", name: "Holt v. County", year: 2015, holding: "Procedural due process.", jurisdiction: "Ohio" },
  { citation: "610 N.W.2d 55", name: "Price v. Board", year: 2000, holding: "Public employment rights.", jurisdiction: "Minnesota" },
  { citation: "331 P.3d 400", name: "Diaz v. Health", year: 2012, holding: "Duty to warn.", jurisdiction: "Colorado" },
  { citation: "145 A.3d 77", name: "Khan v. Metro", year: 2018, holding: "Construction defect claims.", jurisdiction: "New York" },
  { citation: "411 P.3d 812", name: "Moore v. Rail", year: 2019, holding: "Common carrier duty.", jurisdiction: "Washington" },
  { citation: "291 P.3d 221", name: "Gibson v. River", year: 2011, holding: "Environmental negligence.", jurisdiction: "Oregon" },
  { citation: "214 F.3d 102", name: "United States v. Carter", year: 2000, holding: "Wire fraud elements.", jurisdiction: "11th Circuit" }
];

export function checkCitationValidity(citation: string) {
  const seed = citation.length % 3;
  if (seed === 0) {
    return {
      status: "Good Law" as const,
      negativeTreatment: []
    };
  }
  if (seed === 1) {
    return {
      status: "Distinguished" as const,
      negativeTreatment: ["Smith v. Jones (2019)"]
    };
  }
  return {
    status: "Overruled" as const,
    negativeTreatment: ["Brown v. Parker (2021)"]
  };
}

export function getStatute(state: string, issue: string) {
  const key = `${state}:${issue}`.toLowerCase();
  if (key.includes("california") || state === "CA") {
    return "CA Business & Professions Code § 16600";
  }
  if (state === "TX") {
    return "TX Bus. & Com. Code § 15.50";
  }
  if (state === "NY") {
    return "NY Lab. Law § 200";
  }
  if (state === "FL") {
    return "FL Stat. § 542.335";
  }
  return `${state} Code § 100.01`;
}
