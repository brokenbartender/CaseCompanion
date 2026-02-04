import { readEnv } from '../utils/indexHelpers.js';

type CaseLawResult = {
  name: string;
  year: number;
  citation: string;
  jurisdiction: string;
  holding: string;
};

const MOCK_CASES: CaseLawResult[] = [
  { name: 'Miranda v. Arizona', year: 1966, citation: '384 U.S. 436', jurisdiction: 'US', holding: 'Custodial interrogation requires warnings.' },
  { name: 'Palsgraf v. Long Island R.R.', year: 1928, citation: '248 N.Y. 339', jurisdiction: 'NY', holding: 'Duty is limited to foreseeable plaintiffs.' },
  { name: 'International Shoe v. Washington', year: 1945, citation: '326 U.S. 310', jurisdiction: 'US', holding: 'Minimum contacts establish personal jurisdiction.' },
  { name: 'Brown v. Board of Education', year: 1954, citation: '347 U.S. 483', jurisdiction: 'US', holding: 'Separate educational facilities are inherently unequal.' },
  { name: 'Roe v. Wade', year: 1973, citation: '410 U.S. 113', jurisdiction: 'US', holding: 'Right to privacy encompasses abortion decisions.' },
  { name: 'Obergefell v. Hodges', year: 2015, citation: '576 U.S. 644', jurisdiction: 'US', holding: 'Same-sex marriage is a fundamental right.' },
  { name: 'Gideon v. Wainwright', year: 1963, citation: '372 U.S. 335', jurisdiction: 'US', holding: 'Right to counsel in criminal prosecutions.' },
  { name: 'Marbury v. Madison', year: 1803, citation: '5 U.S. 137', jurisdiction: 'US', holding: 'Established judicial review.' },
  { name: 'Mapp v. Ohio', year: 1961, citation: '367 U.S. 643', jurisdiction: 'US', holding: 'Exclusionary rule applies to states.' },
  { name: 'Terry v. Ohio', year: 1968, citation: '392 U.S. 1', jurisdiction: 'US', holding: 'Stop-and-frisk permitted on reasonable suspicion.' },
  { name: 'New York Times v. Sullivan', year: 1964, citation: '376 U.S. 254', jurisdiction: 'US', holding: 'Actual malice standard for public officials.' },
  { name: 'Chevron U.S.A. v. NRDC', year: 1984, citation: '467 U.S. 837', jurisdiction: 'US', holding: 'Agency interpretations get deference if reasonable.' },
  { name: 'Citizens United v. FEC', year: 2010, citation: '558 U.S. 310', jurisdiction: 'US', holding: 'Corporate political spending protected speech.' },
  { name: 'McCulloch v. Maryland', year: 1819, citation: '17 U.S. 316', jurisdiction: 'US', holding: 'Federal supremacy and implied powers.' },
  { name: 'Hadley v. Baxendale', year: 1854, citation: '9 Exch. 341', jurisdiction: 'UK', holding: 'Contract damages limited to foreseeable losses.' },
  { name: 'Carlill v. Carbolic Smoke Ball', year: 1893, citation: '[1893] 1 QB 256', jurisdiction: 'UK', holding: 'Unilateral contract enforceable by performance.' },
  { name: 'Donoghue v. Stevenson', year: 1932, citation: '[1932] AC 562', jurisdiction: 'UK', holding: 'Neighbor principle for negligence.' },
  { name: 'Johnson v. M’Intosh', year: 1823, citation: '21 U.S. 543', jurisdiction: 'US', holding: 'Doctrine of discovery for land title.' },
  { name: 'Katz v. United States', year: 1967, citation: '389 U.S. 347', jurisdiction: 'US', holding: 'Reasonable expectation of privacy.' },
  { name: 'Brady v. Maryland', year: 1963, citation: '373 U.S. 83', jurisdiction: 'US', holding: 'Prosecution must disclose exculpatory evidence.' },
  { name: 'Strickland v. Washington', year: 1984, citation: '466 U.S. 668', jurisdiction: 'US', holding: 'Ineffective assistance standard.' },
  { name: 'Batson v. Kentucky', year: 1986, citation: '476 U.S. 79', jurisdiction: 'US', holding: 'Race-based peremptory challenges prohibited.' },
  { name: 'Daubert v. Merrell Dow', year: 1993, citation: '509 U.S. 579', jurisdiction: 'US', holding: 'Gatekeeping for expert testimony.' },
  { name: 'Erie R.R. v. Tompkins', year: 1938, citation: '304 U.S. 64', jurisdiction: 'US', holding: 'Federal courts apply state substantive law.' },
  { name: 'Pennoyer v. Neff', year: 1878, citation: '95 U.S. 714', jurisdiction: 'US', holding: 'Territorial jurisdiction limits.' },
  { name: 'Kelo v. City of New London', year: 2005, citation: '545 U.S. 469', jurisdiction: 'US', holding: 'Public use includes economic development.' },
  { name: 'Lochner v. New York', year: 1905, citation: '198 U.S. 45', jurisdiction: 'US', holding: 'Substantive due process for contract.' },
  { name: 'Plessy v. Ferguson', year: 1896, citation: '163 U.S. 537', jurisdiction: 'US', holding: 'Separate but equal doctrine.' },
  { name: 'United States v. Nixon', year: 1974, citation: '418 U.S. 683', jurisdiction: 'US', holding: 'Executive privilege limited in criminal cases.' },
  { name: 'Texas v. Johnson', year: 1989, citation: '491 U.S. 397', jurisdiction: 'US', holding: 'Flag burning is protected speech.' },
  { name: 'Baker v. Carr', year: 1962, citation: '369 U.S. 186', jurisdiction: 'US', holding: 'Reapportionment is justiciable.' },
  { name: 'United States v. Lopez', year: 1995, citation: '514 U.S. 549', jurisdiction: 'US', holding: 'Limits on Commerce Clause.' },
  { name: 'McDonald v. City of Chicago', year: 2010, citation: '561 U.S. 742', jurisdiction: 'US', holding: 'Second Amendment incorporated.' },
  { name: 'Heller v. District of Columbia', year: 2008, citation: '554 U.S. 570', jurisdiction: 'US', holding: 'Individual right to bear arms.' },
  { name: 'Riley v. California', year: 2014, citation: '573 U.S. 373', jurisdiction: 'US', holding: 'Warrant required for cell phone searches.' },
  { name: 'Carpenter v. United States', year: 2018, citation: '585 U.S. 296', jurisdiction: 'US', holding: 'Cell-site data requires warrant.' },
  { name: 'Fisher v. United States', year: 1976, citation: '425 U.S. 391', jurisdiction: 'US', holding: 'Fifth Amendment limits on document production.' },
  { name: 'Bryant v. Shinseki', year: 2010, citation: '23 Vet. App. 488', jurisdiction: 'US', holding: 'Duty to assist in veterans claims.' },
  { name: 'Wheaton v. Peters', year: 1834, citation: '33 U.S. 591', jurisdiction: 'US', holding: 'No common law copyright.' },
  { name: 'Campbell v. Acuff-Rose', year: 1994, citation: '510 U.S. 569', jurisdiction: 'US', holding: 'Fair use parody.' },
  { name: 'Diamond v. Chakrabarty', year: 1980, citation: '447 U.S. 303', jurisdiction: 'US', holding: 'Patentable subject matter for life forms.' },
  { name: 'eBay v. MercExchange', year: 2006, citation: '547 U.S. 388', jurisdiction: 'US', holding: 'Permanent injunction test in patent cases.' },
  { name: 'KSR v. Teleflex', year: 2007, citation: '550 U.S. 398', jurisdiction: 'US', holding: 'Obviousness standard.' },
  { name: 'Bilski v. Kappos', year: 2010, citation: '561 U.S. 593', jurisdiction: 'US', holding: 'Business method patents limited.' },
  { name: 'Alice Corp. v. CLS Bank', year: 2014, citation: '573 U.S. 208', jurisdiction: 'US', holding: 'Abstract ideas not patentable.' },
  { name: 'TC Heartland v. Kraft', year: 2017, citation: '581 U.S. 258', jurisdiction: 'US', holding: 'Patent venue statute interpreted narrowly.' },
  { name: 'Ford v. Montana', year: 2021, citation: '592 U.S. 351', jurisdiction: 'US', holding: 'Specific jurisdiction requires relatedness.' },
  { name: 'Dobbs v. Jackson Women’s Health', year: 2022, citation: '597 U.S. 215', jurisdiction: 'US', holding: 'Overruled Roe/Casey.' },
  { name: 'SEC v. W.J. Howey Co.', year: 1946, citation: '328 U.S. 293', jurisdiction: 'US', holding: 'Investment contract test.' },
  { name: 'Ashcroft v. Iqbal', year: 2009, citation: '556 U.S. 662', jurisdiction: 'US', holding: 'Pleading plausibility standard.' },
  { name: 'Twombly v. Bell Atlantic', year: 2007, citation: '550 U.S. 544', jurisdiction: 'US', holding: 'Pleading must state plausible claim.' }
];

const overruledSet = new Set(["Roe v. Wade", "Plessy v. Ferguson"]);

function sanitizeQuery(query: string) {
  const value = String(query || "");
  const withoutEmails = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]");
  const withoutPhones = withoutEmails.replace(/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[redacted]");
  const withoutLongIds = withoutPhones.replace(/\b\d{6,}\b/g, "[redacted]");
  return withoutLongIds.replace(/\s+/g, " ").trim();
}

export async function searchCaseLaw(query: string) {
  const sanitizedQuery = sanitizeQuery(query);
  const apiKey = readEnv("COURTLISTENER_API_KEY");
  if (apiKey) {
    const url = new URL("https://www.courtlistener.com/api/rest/v3/search/");
    url.searchParams.set("q", sanitizedQuery);
    url.searchParams.set("type", "o");
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${apiKey}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return (data?.results || []).map((row: any) => ({
        name: row?.caseName || row?.case_name || row?.caseNameShort || "Unknown Case",
        year: row?.dateFiled ? Number(String(row.dateFiled).slice(0, 4)) : 0,
        citation: row?.citation || row?.citationString || row?.neutralCite || "",
        jurisdiction: row?.court || row?.court_id || "US",
        holding: row?.snippet || row?.summary || "No holding summary available."
      }));
    }
  }
  const q = String(sanitizedQuery || "").toLowerCase();
  return MOCK_CASES.filter((item) =>
    item.name.toLowerCase().includes(q) || item.holding.toLowerCase().includes(q) || item.citation.toLowerCase().includes(q)
  ).slice(0, 50);
}

export async function validateCitation(citation: string) {
  const target = MOCK_CASES.find((item) => item.citation === citation || item.name === citation);
  if (!target) {
    return { status: "warn", negative_treatment: [] };
  }
  if (overruledSet.has(target.name)) {
    return { status: "overruled", negative_treatment: ["Dobbs v. Jackson Women’s Health, 597 U.S. 215 (2022)"] };
  }
  return { status: "good", negative_treatment: [] };
}

export function getMockCases() {
  return MOCK_CASES;
}
