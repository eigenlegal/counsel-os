#!/usr/bin/env python3
"""Deterministic mechanical QA for a contract draft (.docx / .md / .txt).

Mechanical defects survive careful review because checking them by eye is
tedious: a cross-reference to a section that was renumbered away, an exhibit
named in the body but never attached, a defined term used once and never
again, a party named three different ways. Live evidence in the roadmap: a
counterparty audit contract named three entities that don't exist, caught
only because a human happened to look. This script does the tedium
deterministically so the reviewer's judgment is spent on judgment.

It is a *linter*, not a lawyer: it reports mechanical inconsistencies with the
paragraph they occur in, and counsel decides what matters. Precision is valued
over recall — a noisy checker gets ignored — so heuristic findings (a
capitalized phrase that looks like an undefined term) are tiered `info` and
kept conservative, while only high-confidence mechanical defects (a dangling
section reference, an unattached exhibit) are tiered `error`.

Usage:
  scripts/check_document.py <file> [--format docx|markdown|text|auto]
                                   [--json] [--strict]

Output (default): a grouped, human-readable findings report.
Output (--json):  {file, format, summary, notes, findings:[...]} for a caller
                  (the read primitive) to surface. Each finding is
                  {type, severity, message, detail, locations:[...]}.

Exit code: 0 on a successful analysis (whether or not findings were produced),
1 on an I/O or input error, 2 on a usage error. `--strict` makes a run that
produced any `error`-severity finding exit 3, for use in a gating pipeline.

python-docx is imported lazily inside the .docx path only, so markdown/text QA
runs on a machine that has no python-docx installed (virgin-hardware safe).
"""

import argparse
import json
import re
import sys
from pathlib import Path

# --- Severity tiers -------------------------------------------------------
ERROR = "error"      # high-confidence mechanical defect
WARNING = "warning"  # likely issue worth a look
INFO = "info"        # heuristic; needs judgment

_SEV_RANK = {ERROR: 0, WARNING: 1, INFO: 2}
_SEV_SYMBOL = {ERROR: "✗", WARNING: "⚠", INFO: "·"}


# --- Text extraction ------------------------------------------------------
def extract_docx_blocks(path):
    """Return the accept-all text of each body paragraph, in document order.

    "Accept-all" = inserted (tracked-change) text kept, deleted text dropped —
    the document as it reads once changes are accepted, which is what a
    reviewer QAs before it goes out. python-docx's Document() parser is
    XXE-safe (it sets resolve_entities=False), so untrusted counterparty
    .docx is safe to open here.
    """
    from docx import Document  # lazy: markdown/text QA needs no python-docx
    from docx.oxml.ns import qn

    doc = Document(str(path))
    body = doc.element.body
    del_tags = {qn("w:del"), qn("w:moveFrom")}
    t_tag, tab_tag = qn("w:t"), qn("w:tab")
    br_tag, cr_tag = qn("w:br"), qn("w:cr")

    blocks = []
    for p in body.iter(qn("w:p")):
        parts = []
        for r in p.iter(qn("w:r")):
            # Skip runs inside a tracked deletion (their text is w:delText, but
            # walk ancestors so a deleted normal run is dropped too).
            anc, deleted = r.getparent(), False
            while anc is not None and anc is not body:
                if anc.tag in del_tags:
                    deleted = True
                    break
                anc = anc.getparent()
            if deleted:
                continue
            for child in r.iter():
                if child.tag == t_tag:
                    parts.append(child.text or "")
                elif child.tag in (tab_tag, br_tag, cr_tag):
                    parts.append(" ")
        blocks.append("".join(parts).strip())
    return blocks


# Markdown atmospherics that carry no legal text: heading hashes, list
# bullets, blockquote markers, and emphasis/formatting characters.
_MD_LEAD = re.compile(r"^\s{0,3}(#{1,6}\s+|[-*+]\s+|>\s+|\d+[.)]\s+)")
_MD_EMPH = re.compile(r"(\*\*|__|\*|_|`)")


def extract_text_blocks(path, markdown):
    """Return non-empty lines as blocks; strip markdown scaffolding if asked."""
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    blocks = []
    for line in raw.splitlines():
        s = line.rstrip()
        if markdown:
            s = _MD_LEAD.sub("", s)
            s = _MD_EMPH.sub("", s)
        s = s.strip()
        if s:
            blocks.append(s)
    return blocks


def detect_format(path):
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        return "docx"
    if ext in (".md", ".markdown"):
        return "markdown"
    return "text"


# --- Locating evidence ----------------------------------------------------
def locate(blocks, needle, limit=3):
    """1-based block numbers whose text contains needle (case-insensitive)."""
    hits = []
    low = needle.lower()
    for i, b in enumerate(blocks, start=1):
        if low in b.lower():
            hits.append(i)
            if len(hits) >= limit:
                break
    return hits


def _loc_label(fmt, numbers):
    if not numbers:
        return []
    unit = "¶" if fmt == "docx" else "line"
    return [f"{unit} {n}" for n in numbers]


# --- Section numbering ----------------------------------------------------
# A heading's number when it is written in the text (manual numbering):
#   "1. Definitions"  "8.3  Termination"  "Section 8.3"  "ARTICLE IV"
# Bare numbers must carry trailing "." or ")" so dates/amounts/addresses do
# not register as headings (mirrors extract_redlines.HEADING_NUM_RE).
_HEADING_NUM = re.compile(
    r"^\s*(?:Section\s+)?(\d+(?:\.\d+)*)[.)]\s+\S", re.IGNORECASE)
_HEADING_ART = re.compile(r"^\s*ARTICLE\s+([IVXLC]+|\d+)\b", re.IGNORECASE)


def collect_sections(blocks):
    """Sets of section numbers and article numbers declared as headings.

    For a dotted number every prefix is registered too, so a reference to
    "Section 8" resolves when the document only spells out "8.1", "8.2".
    """
    sections, articles = set(), set()
    for b in blocks:
        m = _HEADING_NUM.match(b)
        if m:
            parts = m.group(1).split(".")
            for k in range(1, len(parts) + 1):
                sections.add(".".join(parts[:k]))
        a = _HEADING_ART.match(b)
        if a:
            articles.add(a.group(1).upper())
    return sections, articles


_SECTION_REF = re.compile(
    r"\bSections?\s+((?:\d+(?:\.\d+)*)(?:\s*(?:,|and|through|to|&|-|–|—)\s*\d+(?:\.\d+)*)*)",
    re.IGNORECASE)
_PILCROW_REF = re.compile(r"§{1,2}\s*((?:\d+(?:\.\d+)*)(?:\s*(?:,|and|&)\s*\d+(?:\.\d+)*)*)")
_ARTICLE_REF = re.compile(r"\bArticle\s+([IVXLC]+|\d+)\b", re.IGNORECASE)
_NUM_TOKEN = re.compile(r"\d+(?:\.\d+)*")


def check_cross_references(blocks, findings, notes, fmt):
    sections, articles = collect_sections(blocks)
    full = "\n".join(blocks)

    ref_secs, ref_arts = set(), set()
    for m in _SECTION_REF.finditer(full):
        ref_secs.update(_NUM_TOKEN.findall(m.group(1)))
    for m in _PILCROW_REF.finditer(full):
        ref_secs.update(_NUM_TOKEN.findall(m.group(1)))
    for m in _ARTICLE_REF.finditer(full):
        ref_arts.add(m.group(1).upper())

    # Auto-numbering guard: if the body carries cross-references but almost no
    # in-text section numbers, the numbering is Word-generated and lives in
    # numbering.xml, not the text — resolving refs against an empty set would
    # flag everything. Skip the check and say so instead of crying wolf.
    if (ref_secs or ref_arts) and len(sections) < 2 and not articles:
        notes.append(
            "Section numbers appear to be auto-generated (Word numbering) rather "
            "than typed into the text, so cross-references could not be resolved. "
            "Accept changes / convert numbering to text, then re-run to check refs.")
        return

    for num in sorted(ref_secs, key=lambda s: [int(p) for p in s.split(".")]):
        if num not in sections:
            findings.append({
                "type": "undefined_reference", "severity": ERROR,
                "message": f'"Section {num}" is referenced but no Section {num} '
                           f"appears in the document",
                "detail": num,
                "locations": _loc_label(fmt, locate(blocks, f"Section {num}")),
            })
    for art in sorted(ref_arts):
        if art not in articles:
            findings.append({
                "type": "undefined_reference", "severity": ERROR,
                "message": f'"Article {art}" is referenced but no Article {art} '
                           f"appears in the document",
                "detail": art,
                "locations": _loc_label(fmt, locate(blocks, f"Article {art}")),
            })


# --- Exhibits / schedules -------------------------------------------------
_ATTACH_KINDS = r"Exhibit|Schedule|Annex|Appendix|Attachment"
_ATTACH_REF = re.compile(rf"\b({_ATTACH_KINDS})\s+([A-Z]|\d+)\b")
# A heading is the marker anchored at the very start of a block (an attachment
# cover line), which a mid-sentence reference is not.
_ATTACH_HEADING = re.compile(rf"^\s*({_ATTACH_KINDS})\s+([A-Z]|\d+)\b", re.IGNORECASE)


def check_exhibits(blocks, findings, fmt):
    present = set()
    for b in blocks:
        m = _ATTACH_HEADING.match(b)
        if m:
            present.add((m.group(1).lower(), m.group(2).upper()))

    referenced = {}  # (kind_lower, id) -> display kind
    for b in blocks:
        # Skip the heading line itself so an attachment isn't read as its own ref.
        heading = _ATTACH_HEADING.match(b)
        for m in _ATTACH_REF.finditer(b):
            key = (m.group(1).lower(), m.group(2).upper())
            if heading and m.start() == heading.start():
                continue
            referenced.setdefault(key, m.group(1))

    for (kind_l, ident), disp in sorted(referenced.items()):
        if (kind_l, ident) not in present:
            findings.append({
                "type": "missing_exhibit", "severity": ERROR,
                "message": f"{disp} {ident} is referenced but no {disp} {ident} "
                           f"is attached (no heading found for it)",
                "detail": f"{disp} {ident}",
                "locations": _loc_label(fmt, locate(blocks, f"{disp} {ident}")),
            })


# --- Defined terms --------------------------------------------------------
_QUOTE = '["“”“”]'
# `"Term" means ...` / `shall mean` / `has the meaning` / `refers to`
_DEF_MEANS = re.compile(
    rf'{_QUOTE}([A-Z][^"“”\n]{{0,80}}?){_QUOTE}\s+'
    r'(?:means|shall\s+mean|will\s+mean|has\s+the\s+meaning|refers\s+to)\b')
# Short-name parenthetical: (the "Term"), ("Term"), (each a "Term"),
# (collectively, the "Term"). Capture the quoted phrase inside a parenthetical
# that, once quoted terms and connective words are removed, is empty — i.e. a
# pure definition, not a parenthetical that merely happens to quote something.
_PAREN = re.compile(r"\(([^()\n]{0,120})\)")
_QUOTED_TERM = re.compile(rf'{_QUOTE}([A-Z][^"“”\n]{{0,80}}?){_QUOTE}')
_CONNECTIVES = {
    "the", "a", "an", "each", "collectively", "individually", "together",
    "referred", "to", "as", "or", "and", "being", "hereinafter", "this",
}


def collect_definitions(full):
    """Return {term: def_site_count} for terms given an explicit definition."""
    defs = {}
    for m in _DEF_MEANS.finditer(full):
        term = _norm_ws(m.group(1))
        defs[term] = defs.get(term, 0) + 1
    for m in _PAREN.finditer(full):
        inner = m.group(1)
        quoted = _QUOTED_TERM.findall(inner)
        if not quoted:
            continue
        residue = _QUOTED_TERM.sub(" ", inner)
        residue = re.sub(r"[^A-Za-z]+", " ", residue).strip().lower()
        words = [w for w in residue.split() if w]
        if all(w in _CONNECTIVES for w in words):
            for term in quoted:
                term = _norm_ws(term)
                defs[term] = defs.get(term, 0) + 1
    return defs


def _norm_ws(s):
    return re.sub(r"\s+", " ", s).strip()


def _phrase_re(term, flags=0):
    # Whole-phrase match with letter boundaries (so "Purpose" ≠ "Purposes").
    return re.compile(r"(?<![A-Za-z])" + re.escape(term) + r"(?![A-Za-z])", flags)


def check_definitions(blocks, findings, fmt):
    full = "\n".join(blocks)
    defs = collect_definitions(full)

    for term, def_sites in sorted(defs.items()):
        occurrences = _phrase_re(term).findall(full)
        # Unused: the term appears only where it is being defined.
        if len(occurrences) <= def_sites:
            findings.append({
                "type": "unused_definition", "severity": WARNING,
                "message": f'"{term}" is defined but never used elsewhere in the '
                           f"document",
                "detail": term,
                "locations": _loc_label(fmt, locate(blocks, term)),
            })
            continue
        # Capitalization drift — multi-word terms only (single common words
        # like "Term"/"Purpose" appear lowercased as ordinary English).
        if len(term.split()) >= 2:
            variants = set()
            for m in _phrase_re(term, re.IGNORECASE).finditer(full):
                surface = m.group(0)
                if surface != term and surface != term.upper():
                    variants.add(surface)
            if variants:
                shown = ", ".join(sorted(variants)[:3])
                findings.append({
                    "type": "capitalization_drift", "severity": WARNING,
                    "message": f'Defined term "{term}" also appears with '
                               f"inconsistent capitalization: {shown}",
                    "detail": term,
                    "locations": _loc_label(fmt, locate(blocks, sorted(variants)[0])),
                })
    return defs


# --- Party-name drift -----------------------------------------------------
_CORP_SUFFIX = (
    r"Inc\.?|LLC|L\.L\.C\.|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|"
    r"LLP|L\.P\.|LP|GmbH|N\.A\.|N\.V\.|PLC|S\.A\.|S\.p\.A\.")
_ENTITY = re.compile(
    r"\b([A-Z][A-Za-z0-9&.'\-]*(?:\s+[A-Z][A-Za-z0-9&.'\-]*){0,5}?)\s+"
    rf"({_CORP_SUFFIX})(?![A-Za-z])")


def _entity_core(name):
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def check_party_names(blocks, findings, fmt):
    by_core = {}  # core -> {normalized display form -> display form}
    for b in blocks:  # per-block: an entity name never spans a paragraph break
        for m in _ENTITY.finditer(b):
            name, suffix = m.group(1).strip(), m.group(2)
            display = _norm_ws(f"{name} {suffix}")
            norm = re.sub(r"[.,]", "", display.lower())
            core = _entity_core(name)
            if len(core) < 3:
                continue
            by_core.setdefault(core, {}).setdefault(norm, display)

    for core, forms in sorted(by_core.items()):
        if len(forms) >= 2:
            shown = sorted(forms.values())
            findings.append({
                "type": "party_name_drift", "severity": WARNING,
                "message": "Entity name is written inconsistently: "
                           + " vs ".join(f'"{s}"' for s in shown),
                "detail": core,
                "locations": _loc_label(fmt, locate(blocks, shown[0])),
            })


# --- Possible undefined terms (heuristic, info tier) ----------------------
# Two or more consecutive Title-Case words — the surface form of a defined
# term. Kept deliberately narrow (no connective glue) to stay high-precision.
_TITLE_PHRASE = re.compile(r"\b([A-Z][a-z][A-Za-z]*(?:\s+[A-Z][a-z][A-Za-z]*)+)\b")
# Title-Case phrases that are common prose, not defined terms.
_TITLE_STOP = {
    "united states", "new york", "united kingdom", "supreme court",
    "effective date",  # usually defined; if defined it's excluded anyway
}


def _sentence_initial(full, start):
    j = start - 1
    while j >= 0 and full[j] in " \t\"'“”‘’([":
        j -= 1
    return j < 0 or full[j] in ".!?\n:•"


def check_undefined_terms(blocks, findings, fmt, defs):
    defined_lower = {t.lower() for t in defs}

    counts = {}  # phrase -> [total, non_sentence_initial]
    for b in blocks:  # per-block: a Title-Case phrase never spans a paragraph
        for m in _TITLE_PHRASE.finditer(b):
            phrase = _norm_ws(m.group(1))
            rec = counts.setdefault(phrase, [0, 0])
            rec[0] += 1
            if not _sentence_initial(b, m.start()):
                rec[1] += 1

    for phrase, (total, non_si) in sorted(counts.items()):
        low = phrase.lower()
        if low in defined_lower or low in _TITLE_STOP:
            continue
        # Skip if it's a substring/superstring of a defined term (a fragment of
        # one), or a case-variant already flagged as drift.
        if any(low in t or t in low for t in defined_lower):
            continue
        # Conservative gate: recurs, and mostly used mid-sentence (so it isn't
        # just a sentence-initial proper noun or a heading).
        if total < 2 or non_si < 2:
            continue
        findings.append({
            "type": "undefined_term", "severity": INFO,
            "message": f'"{phrase}" is capitalized like a defined term but has no '
                       f"definition — confirm it is intended or define it",
            "detail": phrase,
            "locations": _loc_label(fmt, locate(blocks, phrase)),
        })


# --- Orchestration --------------------------------------------------------
def analyze(path, fmt):
    if fmt == "docx":
        blocks = extract_docx_blocks(path)
    else:
        blocks = extract_text_blocks(path, markdown=(fmt == "markdown"))

    findings, notes = [], []
    check_cross_references(blocks, findings, notes, fmt)
    check_exhibits(blocks, findings, fmt)
    defs = check_definitions(blocks, findings, fmt)
    check_party_names(blocks, findings, fmt)
    check_undefined_terms(blocks, findings, fmt, defs)

    findings.sort(key=lambda f: (_SEV_RANK[f["severity"]],
                                  _TYPE_HEADING.get(f["type"], f["type"]),
                                  f["type"], f["detail"]))
    summary = {ERROR: 0, WARNING: 0, INFO: 0}
    for f in findings:
        summary[f["severity"]] += 1
    summary["total"] = len(findings)
    return {"file": str(path), "format": fmt, "summary": summary,
            "notes": notes, "findings": findings}


_TYPE_HEADING = {
    "undefined_reference": "Cross-references",
    "missing_exhibit": "Exhibits & schedules",
    "unused_definition": "Defined terms",
    "capitalization_drift": "Defined terms",
    "undefined_term": "Possible undefined terms",
    "party_name_drift": "Party & entity names",
}


def render(report):
    lines = []
    s = report["summary"]
    lines.append(f"Document QA — {report['file']}")
    if s["total"] == 0:
        lines.append("No mechanical issues found.")
    else:
        lines.append(
            f"{s['total']} finding(s): {s[ERROR]} error, {s[WARNING]} warning, "
            f"{s[INFO]} info")
    for note in report["notes"]:
        lines.append(f"  note: {note}")

    last_heading = None
    for f in report["findings"]:
        heading = _TYPE_HEADING.get(f["type"], f["type"])
        if heading != last_heading:
            lines.append("")
            lines.append(heading.upper())
            last_heading = heading
        loc = f"  [{', '.join(f['locations'])}]" if f["locations"] else ""
        lines.append(f"  {_SEV_SYMBOL[f['severity']]} {f['message']}{loc}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(
        description="Deterministic mechanical QA for a contract draft.")
    ap.add_argument("input", type=Path)
    ap.add_argument("--format", choices=["docx", "markdown", "text", "auto"],
                    default="auto")
    ap.add_argument("--json", action="store_true",
                    help="emit machine-readable JSON instead of a report")
    ap.add_argument("--strict", action="store_true",
                    help="exit 3 if any error-severity finding is produced")
    args = ap.parse_args()

    if not args.input.exists():
        print(f"File not found: {args.input}", file=sys.stderr)
        return 1

    fmt = detect_format(args.input) if args.format == "auto" else args.format
    try:
        report = analyze(args.input, fmt)
    except ImportError:
        print("python-docx is required to read .docx files. Install it, or "
              "convert the document to markdown/text first.", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 — report cleanly, never traceback
        print(f"Could not analyze {args.input}: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(render(report))

    if args.strict and report["summary"][ERROR]:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
