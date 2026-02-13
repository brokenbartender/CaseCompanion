#!/usr/bin/env python3
"""
Local-only evidence deep dive (inventory + entity map + timeline + gaps + EvidenceVault manifest).

Design goals:
- Never require evidence to be committed to git.
- PII-safe by default: do not emit raw document text into outputs.
- Ground outputs with "basis" fields (filename vs content) and stable identifiers (sha256).
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import re
import sys
import zipfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


DATE_PATTERNS: List[re.Pattern[str]] = [
    re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b"),
    re.compile(
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b"),
]


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk_size)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def safe_norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def tokenize_filename(name: str) -> List[str]:
    s = re.sub(r"[\\/_\.\(\)\[\]\{\}\-]+", " ", name)
    parts = [p for p in s.split() if p]
    return parts


def infer_category(name: str, rel_path: str) -> str:
    hay = (name + " " + rel_path).lower()
    if re.search(r"timeline|chronolog|summary", hay):
        return "Timelines"
    if re.search(r"witness|victim statement|testimony|impact statement|contact list", hay):
        return "Witnesses"
    if re.search(r"medical|er\b|hospital|trinity|injury|bill|diagnosis|therapy|ptsd", hay):
        return "Medical"
    if re.search(r"court|complaint|summons|motion|notice|filing|foia|police report|ocso|osco|mcl|mcr|micourt", hay):
        return "Filings & Notices"
    if re.search(r"\.(mov|mp4|mkv|avi|webm|wav|mp3|m4a|aac|flac|jpg|jpeg|png|heic)$", hay):
        return "Media"
    return "Other"


def extract_docx_text(path: Path, max_chars: int = 1_000_000) -> Optional[str]:
    # DOCX is a zip; extract text nodes from word/document.xml.
    try:
        with zipfile.ZipFile(path, "r") as zf:
            with zf.open("word/document.xml") as f:
                xml = f.read()
    except Exception:
        return None

    # A lightweight (non-XML-parser) extraction of <w:t>text</w:t>.
    # Good enough for keyword/date detection; avoids extra dependencies.
    try:
        s = xml.decode("utf-8", errors="ignore")
    except Exception:
        return None

    texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", s, flags=re.IGNORECASE | re.DOTALL)
    if not texts:
        return ""
    joined = safe_norm(" ".join(re.sub(r"<[^>]+>", "", t) for t in texts))
    if len(joined) > max_chars:
        joined = joined[:max_chars]
    return joined


def extract_pdf_text_optional(path: Path, max_chars: int = 1_000_000) -> Optional[str]:
    # Optional dependency path; if unavailable, return None.
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return None

    try:
        reader = PdfReader(str(path))
        out_parts: List[str] = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t:
                out_parts.append(t)
            if sum(len(x) for x in out_parts) >= max_chars:
                break
        joined = safe_norm(" ".join(out_parts))
        if len(joined) > max_chars:
            joined = joined[:max_chars]
        return joined
    except Exception:
        return None


def find_dates(text: str) -> List[str]:
    hits: List[str] = []
    for pat in DATE_PATTERNS:
        for m in pat.finditer(text):
            hits.append(m.group(0))
    # de-dupe preserving order
    seen = set()
    out: List[str] = []
    for h in hits:
        key = h.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out


@dataclass
class EvidenceItem:
    name: str
    path: str
    ext: str
    category: str


@dataclass
class IndexedFile:
    source_root: str
    full_path: str
    rel_path: str
    name: str
    ext: str
    size: int
    mtime_iso: str
    sha256: str
    category: str
    content_extracted: bool
    dates_from_filename: List[str]
    dates_from_content: List[str]
    entity_hits: Dict[str, int]


def load_seed_manifest(path: Optional[Path]) -> List[EvidenceItem]:
    if not path:
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            return []
        out: List[EvidenceItem] = []
        for row in data:
            if not isinstance(row, dict):
                continue
            name = safe_norm(str(row.get("name", "")))
            p = safe_norm(str(row.get("path", "")))
            if not name or not p:
                continue
            ext = safe_norm(str(row.get("ext", ""))).lower() or (name.split(".")[-1].lower() if "." in name else "file")
            cat = safe_norm(str(row.get("category", ""))) or "Other"
            out.append(EvidenceItem(name=name, path=p, ext=ext, category=cat))
        return out
    except Exception:
        return []


def build_entity_aliases(extra_terms: List[str]) -> Dict[str, List[str]]:
    # Canonical -> aliases (case-insensitive matching)
    base: Dict[str, List[str]] = {
        "OCSO": ["OCSO", "Oakland County Sheriff", "Oakland County Sheriff's Office"],
        "OSCO": ["OSCO"],  # common typo/alias seen in notes; keep separate but track.
        "Cody McKenzie": ["Cody McKenzie", "Cody Elis McKenzie", "McKenzie", "Cody"],
        "Jeffery Snyder": ["Jeffery Snyder", "Jeffrey Snyder", "Snyder", "Jeffery Joseph Snyder", "Jeffrey Joseph Snyder"],
        "Liberty Bar": ["Liberty Bar"],
        "Pontiac": ["Pontiac"],
        "MiCOURT": ["MiCOURT", "Mi Court"],
        "FOIA": ["FOIA", "Freedom of Information"],
        "WC-117": ["WC-117", "WC 117"],
        "MDCR": ["MDCR", "Michigan Department of Civil Rights"],
        "Expert Realty Solutions": ["Expert Realty Solutions", "Expert Realty", "Expert Realty Solution"],
        "Prosecutor": ["Prosecutor", "Prosecutor Packet"],
        "Ethics Complaint": ["Ethics Complaint"],
        "Retaliation": ["Retaliation"],
        "Termination": ["Termination"],
        "Wage Loss": ["Wage Loss", "Lost Wages"],
        "Assault": ["Assault"],
        "Battery": ["Battery"],
        "LEO": ["LEO", "law enforcement"],
        "Shelby": ["Shelby"],
    }
    for t in extra_terms:
        t = safe_norm(t)
        if not t:
            continue
        # keep raw token as a searchable term under itself
        if t not in base:
            base[t] = [t]
    return base


def count_entity_hits(text: str, aliases: Dict[str, List[str]]) -> Dict[str, int]:
    hits: Dict[str, int] = {}
    lower = text.lower()
    for canonical, alist in aliases.items():
        c = 0
        for a in alist:
            a = a.strip()
            if not a:
                continue
            # word-ish boundary match; allow spaces
            pat = re.escape(a.lower())
            c += len(re.findall(pat, lower))
        if c:
            hits[canonical] = c
    return hits


def extract_dates_from_filename(name: str) -> List[str]:
    return find_dates(name)


def walk_roots(roots: List[Path]) -> List[Tuple[Path, Path]]:
    out: List[Tuple[Path, Path]] = []
    for root in roots:
        for p in root.rglob("*"):
            if p.is_file():
                out.append((root, p))
    return out


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=True), encoding="utf-8")


def write_csv(path: Path, rows: List[Dict[str, Any]], fieldnames: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", action="append", required=True, help="Evidence root directory (repeatable).")
    ap.add_argument("--seed-manifest", default="", help="Optional seed manifest JSON (array of {name,path,ext,category}).")
    ap.add_argument("--out-dir", required=True, help="Output directory for reports/manifests (local-only).")
    ap.add_argument("--evidence-root-name", default="evidence", help="Logical name used for manifest paths.")
    ap.add_argument("--max-bytes-for-hash", type=int, default=0, help="If >0, only hash files <= this size (bytes).")
    args = ap.parse_args()

    roots = [Path(r).expanduser().resolve() for r in args.root]
    out_dir = Path(args.out_dir).expanduser().resolve()
    seed_manifest_path = Path(args.seed_manifest).expanduser().resolve() if args.seed_manifest else None

    for r in roots:
        if not r.exists() or not r.is_dir():
            print(f"ERROR: root not found or not a directory: {r}", file=sys.stderr)
            return 2

    seed_items = load_seed_manifest(seed_manifest_path)

    # Extra term discovery from filenames only (safe): take tokens that look like proper nouns/acronyms.
    extra_terms: List[str] = []
    stop = set(["exhibit", "case", "copy", "final", "packet", "cover", "sheet", "talking", "points"])
    for _, f in walk_roots(roots):
        for tok in tokenize_filename(f.name):
            if len(tok) < 4:
                continue
            if tok.lower() in stop:
                continue
            if tok.isupper() and tok.isalpha():
                extra_terms.append(tok)
    aliases = build_entity_aliases(extra_terms=list(dict.fromkeys(extra_terms)))

    indexed: List[IndexedFile] = []
    by_hash: Dict[str, List[int]] = {}

    for root, f in walk_roots(roots):
        rel = os.path.relpath(str(f), str(root)).replace("\\", "/")
        ext = f.suffix.lower().lstrip(".") or "file"
        st = f.stat()
        mtime_iso = dt.datetime.fromtimestamp(st.st_mtime).isoformat()

        do_hash = True
        if args.max_bytes_for_hash and st.st_size > args.max_bytes_for_hash:
            do_hash = False
        file_hash = sha256_file(f) if do_hash else ""

        dates_fn = extract_dates_from_filename(f.name)
        content_text: Optional[str] = None
        extracted = False
        dates_content: List[str] = []
        entity_hits: Dict[str, int] = {}

        # Attempt content extraction for a limited set of types.
        if ext == "docx":
            content_text = extract_docx_text(f)
        elif ext == "pdf":
            content_text = extract_pdf_text_optional(f)
        elif ext in ("txt", "md", "csv", "json"):
            try:
                content_text = f.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                content_text = None

        if content_text is not None:
            extracted = True
            dates_content = find_dates(content_text)
            entity_hits = count_entity_hits(content_text, aliases)
        else:
            # Still do filename-only entity hits (safe) so we can map at least by name.
            entity_hits = count_entity_hits(f.name, aliases)

        category = infer_category(f.name, rel)

        rec = IndexedFile(
            source_root=str(root),
            full_path=str(f),
            rel_path=rel,
            name=f.name,
            ext=ext,
            size=st.st_size,
            mtime_iso=mtime_iso,
            sha256=file_hash,
            category=category,
            content_extracted=extracted,
            dates_from_filename=dates_fn,
            dates_from_content=dates_content,
            entity_hits=entity_hits,
        )
        idx = len(indexed)
        indexed.append(rec)
        if file_hash:
            by_hash.setdefault(file_hash, []).append(idx)

    # Build duplicates report (same hash across roots/paths).
    dups = {h: idxs for h, idxs in by_hash.items() if len(idxs) > 1}

    # Build entity map: canonical -> list of {path, count, basis}.
    entity_map: Dict[str, List[Dict[str, Any]]] = {}
    for rec in indexed:
        for ent, c in rec.entity_hits.items():
            entity_map.setdefault(ent, []).append(
                {
                    "path": rec.full_path,
                    "count": c,
                    "basis": "content" if rec.content_extracted else "filename",
                }
            )

    # Timeline rows: date string + event stub + basis + source file.
    timeline_rows: List[Dict[str, Any]] = []
    for rec in indexed:
        for d in rec.dates_from_filename:
            timeline_rows.append(
                {
                    "date": d,
                    "event": f"(inferred from filename) {rec.name}",
                    "basis": "filename",
                    "source_path": rec.full_path,
                }
            )
        for d in rec.dates_from_content:
            timeline_rows.append(
                {
                    "date": d,
                    "event": f"(confirmed from content) {rec.name}",
                    "basis": "content",
                    "source_path": rec.full_path,
                }
            )

    # Simple gaps checklist heuristics based on category presence and keyword presence.
    hay_all = " ".join([r.name.lower() for r in indexed])
    gaps: List[str] = []
    if "police report" not in hay_all and "ocso" not in hay_all and "osco" not in hay_all:
        gaps.append("Police report not found by filename keywords (check if stored elsewhere or named differently).")
    if not re.search(r"\bvideo\b|\.mov\b|\.mp4\b|\.mkv\b", hay_all):
        gaps.append("Video evidence not found by filename keywords/extensions.")
    if not re.search(r"\bmedical\b|\ber\b|hospital|trinity|bill|diagnosis", hay_all):
        gaps.append("Medical records/bills not found by filename keywords.")
    if "foia" not in hay_all:
        gaps.append("FOIA items not found by filename keyword.")
    if "contact list" not in hay_all and "witness" not in hay_all:
        gaps.append("Witness contact list not found by filename keyword.")

    # EvidenceVault manifest: choose a single logical root name; use full path for now,
    # but prefix with evidence-root-name so the app can keep it distinct.
    # (User can later rebase these paths by regenerating with a different convention.)
    evidence_root_name = safe_norm(args.evidence_root_name) or "evidence"
    manifest: List[Dict[str, str]] = []
    for rec in indexed:
        manifest.append(
            {
                "name": rec.name,
                "path": f"{evidence_root_name}:{rec.full_path}",
                "ext": rec.ext,
                "category": rec.category,
            }
        )

    # Write outputs
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(out_dir / "indexed_files.json", [asdict(x) for x in indexed])
    write_json(out_dir / "duplicates_by_sha256.json", dups)
    write_json(out_dir / "entity_map.json", entity_map)
    write_csv(out_dir / "inventory.csv", [asdict(x) for x in indexed], fieldnames=list(asdict(indexed[0]).keys()) if indexed else [])
    write_csv(out_dir / "timeline.csv", timeline_rows, fieldnames=["date", "event", "basis", "source_path"])
    write_json(out_dir / "evidence_vault_manifest.json", manifest)
    write_json(out_dir / "seed_manifest_parsed.json", [asdict(x) for x in seed_items])
    (out_dir / "gaps_checklist.md").write_text(
        "# Gaps Checklist (Heuristic)\n\n"
        + "\n".join([f"- {g}" for g in gaps] or ["- No gaps flagged by current heuristics."])
        + "\n",
        encoding="utf-8",
    )

    summary = {
        "roots": [str(r) for r in roots],
        "indexed_count": len(indexed),
        "duplicate_hash_groups": len(dups),
        "entity_keys": len(entity_map.keys()),
        "timeline_rows": len(timeline_rows),
        "out_dir": str(out_dir),
        "notes": [
            "PII-safe default: outputs do not include raw document text.",
            "PDF content extraction requires optional dependency pypdf; if missing, PDF-based entity/date hits come from filenames only.",
            "Manifest paths are prefixed with evidence-root-name and include full paths to keep them stable and local-only.",
        ],
    }
    write_json(out_dir / "SUMMARY.json", summary)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

