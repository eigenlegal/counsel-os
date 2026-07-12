#!/usr/bin/env python3
"""Extract tracked changes and comments from a .docx into structured data.

The inbound half of the redline pipeline: a counterparty returns a markup,
and the agent needs a change-by-change record — original vs revised text,
who made each change and when, and which comments anchor where — to classify
every change against the effective position (see primitives/read.md --redline).

Usage:
  scripts/extract_redlines.py <input.docx> [--format json|markdown] [--full-text]

Output (json): {file, summary, changes: [...], comments: [...]}
Each change record covers one paragraph that contains tracked changes:
  paragraph_index   stable index over body paragraphs in document order
  section_context   nearest preceding heading (style- or numbering-based)
  kind              insertion | deletion | replacement
  original          reject-all view of the paragraph
  revised           accept-all view of the paragraph
  inserted/deleted  the changed fragments
  authors, dates    from the w:ins/w:del attributes
  comment_ids       comments anchored in this paragraph

Markdown format renders the same data as a review table (cells truncated;
use --full-text or json for complete text).
"""

import argparse
import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn

INS_TAGS = {qn("w:ins"), qn("w:moveTo")}
DEL_TAGS = {qn("w:del"), qn("w:moveFrom")}
# Bare numbers require trailing punctuation ("7." / "7.2)") so address lines
# and quantities don't register as headings; style-based detection is primary.
HEADING_NUM_RE = re.compile(r"^\s*(ARTICLE\s+[IVXLC\d]+|Section\s+\d|\d+(\.\d+)*[.)]\s+\S)", re.IGNORECASE)


def run_text(r):
    """Visible text of a run, including delText; tabs/breaks become spaces."""
    parts = []
    for child in r.iter():
        tag = child.tag
        if tag in (qn("w:t"), qn("w:delText")):
            parts.append(child.text or "")
        elif tag in (qn("w:tab"), qn("w:br"), qn("w:cr")):
            parts.append(" ")
    return "".join(parts)


def change_ancestor(el, stop):
    """Return 'ins', 'del', or None depending on tracked-change wrappers above el."""
    cur = el.getparent()
    while cur is not None and cur is not stop:
        if cur.tag in INS_TAGS:
            return "ins", cur
        if cur.tag in DEL_TAGS:
            return "del", cur
        cur = cur.getparent()
    return None, None


def para_style(p):
    pPr = p.find(qn("w:pPr"))
    if pPr is not None:
        st = pPr.find(qn("w:pStyle"))
        if st is not None:
            return st.get(qn("w:val")) or ""
    return ""


def extract(path, full_text=False):
    doc = Document(path)
    body = doc.element.body

    paragraphs = list(body.iter(qn("w:p")))  # includes tables and content controls
    changes = []
    section_context = ""
    authors_all = set()
    total_ins = total_del = 0

    for idx, p in enumerate(paragraphs):
        original_parts, revised_parts = [], []
        inserted, deleted = [], []
        authors, dates = set(), set()

        for r in p.iter(qn("w:r")):
            txt = run_text(r)
            if not txt:
                continue
            kind, wrapper = change_ancestor(r, body)
            if kind == "ins":
                revised_parts.append(txt)
                inserted.append(txt)
                a = wrapper.get(qn("w:author"))
                d = wrapper.get(qn("w:date"))
                if a:
                    authors.add(a)
                if d:
                    dates.add(d[:10])
            elif kind == "del":
                original_parts.append(txt)
                deleted.append(txt)
                a = wrapper.get(qn("w:author"))
                d = wrapper.get(qn("w:date"))
                if a:
                    authors.add(a)
                if d:
                    dates.add(d[:10])
            else:
                original_parts.append(txt)
                revised_parts.append(txt)

        revised = "".join(revised_parts).strip()
        original = "".join(original_parts).strip()

        # Track heading context from the *revised* view of the doc
        style = para_style(p)
        if revised and (style.lower().startswith("heading") or HEADING_NUM_RE.match(revised)):
            section_context = revised[:120]

        if not inserted and not deleted:
            continue

        total_ins += len(inserted)
        total_del += len(deleted)
        authors_all.update(authors)

        kind = "replacement" if inserted and deleted else ("insertion" if inserted else "deletion")
        comment_ids = sorted(
            {c.get(qn("w:id")) for c in p.iter(qn("w:commentRangeStart"))}
            | {c.get(qn("w:id")) for c in p.iter(qn("w:commentReference"))}
        )

        changes.append({
            "paragraph_index": idx,
            "section_context": section_context,
            "kind": kind,
            "original": original,
            "revised": revised,
            "inserted": ["".join(inserted)] if kind == "insertion" and len(inserted) > 3 else inserted,
            "deleted": ["".join(deleted)] if kind == "deletion" and len(deleted) > 3 else deleted,
            "authors": sorted(authors),
            "dates": sorted(dates),
            "comment_ids": [c for c in comment_ids if c is not None],
        })

    # Comments part
    comments = []
    anchor_map = {}
    for idx, p in enumerate(paragraphs):
        for c in p.iter(qn("w:commentRangeStart")):
            anchor_map.setdefault(c.get(qn("w:id")), idx)
        for c in p.iter(qn("w:commentReference")):
            anchor_map.setdefault(c.get(qn("w:id")), idx)

    try:
        for part in doc.part.package.iter_parts():
            if part.partname.endswith("/word/comments.xml"):
                root = part.element if hasattr(part, "element") else None
                if root is None:
                    from xml_safety import safe_lxml_fromstring
                    root = safe_lxml_fromstring(part.blob)
                for c in root.iter(qn("w:comment")):
                    cid = c.get(qn("w:id"))
                    text = " ".join(
                        t.text or "" for t in c.iter(qn("w:t"))
                    ).strip()
                    pidx = anchor_map.get(cid)
                    excerpt = ""
                    if pidx is not None:
                        ptext = "".join(run_text(r) for r in paragraphs[pidx].iter(qn("w:r")))
                        excerpt = ptext.strip()[:160]
                    comments.append({
                        "id": cid,
                        "author": c.get(qn("w:author")) or "",
                        "date": (c.get(qn("w:date")) or "")[:10],
                        "text": text,
                        "paragraph_index": pidx,
                        "anchor_excerpt": excerpt,
                    })
    except Exception as exc:  # comments are supplementary — never fail the extraction
        comments.append({"error": f"comment extraction failed: {exc}"})

    return {
        "file": str(path),
        "summary": {
            "changed_paragraphs": len(changes),
            "inserted_fragments": total_ins,
            "deleted_fragments": total_del,
            "comments": len([c for c in comments if "error" not in c]),
            "authors": sorted(authors_all),
        },
        "changes": changes,
        "comments": comments,
    }


def to_markdown(data, full_text=False):
    cap = None if full_text else 240
    def trunc(s):
        s = (s or "").replace("|", "\\|").replace("\n", " ")
        return s if cap is None or len(s) <= cap else s[:cap] + "…"

    out = [f"# Redline extraction — {Path(data['file']).name}", ""]
    s = data["summary"]
    out.append(f"**{s['changed_paragraphs']} changed paragraphs** ({s['inserted_fragments']} insertions, "
               f"{s['deleted_fragments']} deletions), {s['comments']} comments. Authors: {', '.join(s['authors']) or '—'}.")
    out += ["", "| # | Section | Kind | Original | Revised | Author | Comments |", "|---|---------|------|----------|---------|--------|----------|"]
    for c in data["changes"]:
        out.append(f"| {c['paragraph_index']} | {trunc(c['section_context'])} | {c['kind']} | "
                   f"{trunc(c['original'])} | {trunc(c['revised'])} | {', '.join(c['authors'])} | "
                   f"{', '.join(c['comment_ids']) or ''} |")
    real_comments = [c for c in data["comments"] if "error" not in c]
    if real_comments:
        out += ["", "## Comments", ""]
        for c in real_comments:
            out.append(f"- **[{c['id']}] {c['author']}** ({c['date']}, ¶{c['paragraph_index']}): {trunc(c['text'])}")
            if c["anchor_excerpt"]:
                out.append(f"  - anchored at: \"{trunc(c['anchor_excerpt'])}\"")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Extract tracked changes and comments from a .docx")
    ap.add_argument("input", type=Path)
    ap.add_argument("--format", choices=["json", "markdown"], default="json")
    ap.add_argument("--full-text", action="store_true", help="don't truncate cells in markdown output")
    args = ap.parse_args()

    if not args.input.exists():
        print(f"File not found: {args.input}", file=sys.stderr)
        return 1

    data = extract(args.input, full_text=args.full_text)
    if args.format == "json":
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(to_markdown(data, full_text=args.full_text))
    return 0


if __name__ == "__main__":
    sys.exit(main())
