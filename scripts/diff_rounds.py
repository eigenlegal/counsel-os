#!/usr/bin/env python3
"""Compare negotiation rounds: classify what happened to our last redline.

The round-over-round half of the redline pipeline. extract_redlines.py reads
one markup in isolation; this script compares the version WE sent (--ours,
whose accept-all text is our proposed language) against the markup the
counterparty returned (--theirs), aligns the two paragraph by paragraph, and
classifies the fate of each of our counters:

  ACCEPTED          our language survives — their text (or their markup's
                    landing point) equals our sent text
  REVERTED          our language is gone and their text is back
  MODIFIED          they replaced our language with something new
  NEW               a change in a paragraph we never touched (a fresh ask)
  UNMATCHED_CHANGE  a change that cannot be attributed without --base

Honest limits — read before trusting the labels:

Two documents cannot recover the round N-1 baseline. From --ours and --theirs
alone the script sees only our sent text and their starting text plus their
tracked edits. Consequences:
  * Silent acceptances are invisible. A paragraph we edited that they kept
    untouched is indistinguishable from a paragraph nobody ever touched.
    Only --base (the round N-1 document BEFORE our edits) makes those
    ACCEPTED findings reportable.
  * Edits on top of our sent text cannot be split into "counter-modified our
    counter" vs "new ask in a paragraph we never touched" — without --base
    both are labelled UNMATCHED_CHANGE.
  * REVERTED without --base means "their text abandons ours for their own";
    that this restores the true prior baseline is assumed, not proven.
Pass --base whenever the pre-edit baseline exists — for any round produced
with the redline pipeline it is in the matter's Generated Outputs.

Usage:
  scripts/diff_rounds.py --ours <sent.docx> --theirs <returned.docx>
                         [--base <round-n-1.docx>] [--format json|markdown]

Paragraph alignment uses difflib.SequenceMatcher over normalized paragraph
text with fuzzy pairing inside replace blocks, so inserted or deleted
paragraphs do not desynchronize the comparison.

Output (json): {ours, theirs, base, summary, findings: [...], comments: [...]}
Each finding carries the classification, a one-line detail, section context,
paragraph indices in both documents, our text, their original/revised text,
the base text when --base was given, and the authors/dates/comment ids of
their tracked changes. Markdown format renders a negotiation delta report
grouped by classification (excerpts truncated; use --full-text or json).
"""

import argparse
import difflib
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_redlines as xr
from docx import Document
from docx.oxml.ns import qn

# Minimum similarity to pair paragraphs inside a SequenceMatcher replace block.
PAIR_THRESHOLD = 0.5
# Minimum similarity to call an unmatched paragraph of theirs a reinstatement
# of text we deleted.
REINSTATE_THRESHOLD = 0.8

WS_RE = re.compile(r"\s+")


def norm(s):
    """Whitespace-normalized text for comparison; case is preserved (it matters in contracts)."""
    return WS_RE.sub(" ", s or "").strip()


def paragraph_views(path):
    """Both views (reject-all original, accept-all revised) of every body paragraph.

    Same traversal as extract_redlines.extract, reusing its run/wrapper helpers,
    but emits unchanged paragraphs too — alignment needs the full sequence.
    """
    doc = Document(path)
    body = doc.element.body
    views = []
    section_context = ""
    for idx, p in enumerate(body.iter(qn("w:p"))):
        original_parts, revised_parts = [], []
        changed = False
        authors, dates = set(), set()
        for r in p.iter(qn("w:r")):
            txt = xr.run_text(r)
            if not txt:
                continue
            kind, wrapper = xr.change_ancestor(r, body)
            if kind == "ins":
                revised_parts.append(txt)
                changed = True
            elif kind == "del":
                original_parts.append(txt)
                changed = True
            else:
                original_parts.append(txt)
                revised_parts.append(txt)
            if kind:
                a = wrapper.get(qn("w:author"))
                d = wrapper.get(qn("w:date"))
                if a:
                    authors.add(a)
                if d:
                    dates.add(d[:10])

        revised = "".join(revised_parts).strip()
        original = "".join(original_parts).strip()

        style = xr.para_style(p)
        if revised and (style.lower().startswith("heading") or xr.HEADING_NUM_RE.match(revised)):
            section_context = revised[:120]

        views.append({
            "paragraph_index": idx,
            "section_context": section_context,
            "original": original,
            "revised": revised,
            "changed": changed,
            "authors": sorted(authors),
            "dates": sorted(dates),
        })
    return views


def fuzzy_pairs(a_texts, b_texts, a_range, b_range):
    """Pair near-matching paragraphs inside a SequenceMatcher replace block."""
    scored = []
    for i in a_range:
        for j in b_range:
            r = difflib.SequenceMatcher(None, a_texts[i], b_texts[j], autojunk=False).ratio()
            if r >= PAIR_THRESHOLD:
                scored.append((r, i, j))
    scored.sort(key=lambda x: (-x[0], x[1], x[2]))
    used_a, used_b, out = set(), set(), []
    for r, i, j in scored:
        if i in used_a or j in used_b:
            continue
        used_a.add(i)
        used_b.add(j)
        out.append((i, j))
    out += [(i, None) for i in a_range if i not in used_a]
    out += [(None, j) for j in b_range if j not in used_b]
    return out


def align(a_texts, b_texts):
    """Anchor-based paragraph alignment that tolerates insertions and deletions.

    Returns (i, j) pairs over the two text lists; None on either side marks a
    paragraph with no counterpart.
    """
    sm = difflib.SequenceMatcher(a=a_texts, b=b_texts, autojunk=False)
    pairs = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            pairs += [(i1 + k, j1 + k) for k in range(i2 - i1)]
        elif tag == "replace":
            pairs += fuzzy_pairs(a_texts, b_texts, range(i1, i2), range(j1, j2))
        elif tag == "delete":
            pairs += [(i, None) for i in range(i1, i2)]
        elif tag == "insert":
            pairs += [(None, j) for j in range(j1, j2)]
    return pairs


def best_match(text, candidates):
    """The candidate most similar to text, if any clears REINSTATE_THRESHOLD."""
    best, best_r = None, 0.0
    for c in candidates:
        r = difflib.SequenceMatcher(None, text, c, autojunk=False).ratio()
        if r > best_r:
            best, best_r = c, r
    return best if best_r >= REINSTATE_THRESHOLD else None


def classify(ours_views, theirs_views, base_views, comment_map):
    o_items = [v for v in ours_views if norm(v["revised"])]
    t_items = [v for v in theirs_views if norm(v["original"])]
    # Whole paragraphs they inserted (no reject-all text to align on).
    t_inserted = [v for v in theirs_views if not norm(v["original"]) and norm(v["revised"])]
    # Whole paragraphs we deleted — recoverable from our own markup when --ours
    # still carries it (accept-all empty, reject-all not).
    ours_deleted = [norm(v["original"]) for v in ours_views if norm(v["original"]) and not norm(v["revised"])]

    has_base = base_views is not None
    base_text_for = {}   # o_items index -> base paragraph text, or None if we inserted it
    we_deleted = list(ours_deleted)
    if has_base:
        b_items = [v for v in base_views if norm(v["revised"])]
        for bi, oi in align([norm(v["revised"]) for v in b_items],
                            [norm(v["revised"]) for v in o_items]):
            if oi is not None:
                base_text_for[oi] = norm(b_items[bi]["revised"]) if bi is not None else None
            elif bi is not None:
                we_deleted.append(norm(b_items[bi]["revised"]))

    findings = []

    def add(classification, detail, o=None, t=None, b_text=None):
        ctx = (t or o or {}).get("section_context", "")
        findings.append({
            "classification": classification,
            "detail": detail,
            "section_context": ctx,
            "ours_paragraph_index": o["paragraph_index"] if o else None,
            "theirs_paragraph_index": t["paragraph_index"] if t else None,
            "our_text": o["revised"] if o else "",
            "their_original": t["original"] if t else "",
            "their_revised": t["revised"] if t else "",
            "base_text": b_text,
            "authors": t["authors"] if t else [],
            "dates": t["dates"] if t else [],
            "comment_ids": comment_map.get(t["paragraph_index"], []) if t else [],
        })

    for oi, tj in align([norm(v["revised"]) for v in o_items],
                        [norm(v["original"]) for v in t_items]):
        if oi is not None and tj is not None:
            o, t = o_items[oi], t_items[tj]
            o_text, t_orig, t_rev = norm(o["revised"]), norm(t["original"]), norm(t["revised"])
            b_text = base_text_for.get(oi) if has_base else None
            we_edited = has_base and (b_text is None or b_text != o_text)

            if t_orig == o_text:
                # They started from our sent text in this paragraph.
                if t_rev == o_text:
                    if we_edited and not t["changed"]:
                        add("ACCEPTED", "our edit retained untouched", o, t, b_text)
                    continue  # otherwise unchanged paragraph or net-zero markup
                if not has_base:
                    add("UNMATCHED_CHANGE",
                        "edit on top of our sent text; cannot tell counter-modification "
                        "from new ask without --base", o, t)
                elif b_text is not None and b_text == o_text:
                    add("NEW", "change in a paragraph we never touched", o, t, b_text)
                elif b_text is not None and t_rev == b_text:
                    add("REVERTED", "tracked change restores the pre-round baseline", o, t, b_text)
                else:
                    add("MODIFIED", "our language replaced with new text", o, t, b_text)
            else:
                # They did not start from our sent text here.
                if t_rev == o_text:
                    add("ACCEPTED", "their markup lands on our language", o, t, b_text)
                elif t_rev == t_orig:
                    if b_text is not None and t_rev == b_text:
                        add("REVERTED", "silently restored the pre-round baseline", o, t, b_text)
                    elif b_text is not None and b_text == o_text:
                        add("NEW", "silent edit in a paragraph we never touched", o, t, b_text)
                    else:
                        add("REVERTED", "their text abandons ours for their own", o, t, b_text)
                elif b_text is not None and t_rev == b_text:
                    add("REVERTED", "tracked change restores the pre-round baseline", o, t, b_text)
                else:
                    add("MODIFIED",
                        "their revised text differs from both our text and their starting text",
                        o, t, b_text)
        elif oi is not None:
            # Our paragraph has no counterpart in their draft.
            o = o_items[oi]
            b_text = base_text_for.get(oi) if has_base else None
            if not has_base:
                add("UNMATCHED_CHANGE",
                    "paragraph from our version is absent from their draft; "
                    "pass --base to classify", o)
            elif b_text is None:
                add("REVERTED", "paragraph we inserted was dropped", o)
            elif b_text == norm(o["revised"]):
                add("NEW", "they deleted a paragraph we never touched", o, None, b_text)
            else:
                add("REVERTED", "paragraph we edited was dropped entirely", o, None, b_text)
        else:
            # A paragraph in their baseline with no counterpart in our version.
            t = t_items[tj]
            reinstated = best_match(norm(t["original"]), we_deleted)
            if reinstated is not None:
                detail = ("text we deleted is retained" if norm(t["revised"]) == norm(t["original"])
                          else "text we deleted is retained with further edits")
                add("REVERTED", detail, None, t, reinstated if has_base else None)
            elif not has_base:
                add("UNMATCHED_CHANGE",
                    "paragraph in their draft not present in our version; "
                    "pass --base to classify", None, t)
            else:
                add("NEW", "paragraph present in their draft with no counterpart in ours", None, t)

    for t in t_inserted:
        reinstated = best_match(norm(t["revised"]), we_deleted)
        if reinstated is not None:
            add("REVERTED", "inserted paragraph reinstates text we deleted", None, t,
                reinstated if has_base else None)
        elif has_base:
            add("NEW", "whole paragraph inserted", None, t)
        else:
            add("UNMATCHED_CHANGE",
                "whole paragraph inserted; cannot rule out reinstatement of prior "
                "text without --base", None, t)

    findings.sort(key=lambda f: (
        f["theirs_paragraph_index"] if f["theirs_paragraph_index"] is not None
        else f["ours_paragraph_index"] or 0))
    return findings


GROUP_ORDER = ["REVERTED", "MODIFIED", "NEW", "UNMATCHED_CHANGE", "ACCEPTED"]
GROUP_TITLES = {
    "REVERTED": "REVERTED — our language abandoned for theirs",
    "MODIFIED": "MODIFIED — our language replaced with new text",
    "NEW": "NEW — fresh changes in paragraphs we never touched",
    "UNMATCHED_CHANGE": "UNMATCHED_CHANGE — cannot attribute without --base",
    "ACCEPTED": "ACCEPTED — our language adopted",
}


def to_markdown(data, full_text=False):
    cap = None if full_text else 240
    def trunc(s):
        s = (s or "").replace("\n", " ")
        return s if cap is None or len(s) <= cap else s[:cap] + "…"

    out = [f"# Round comparison — {Path(data['ours']).name} → {Path(data['theirs']).name}", ""]
    if data["base"]:
        out.append(f"Baseline: {Path(data['base']).name} (3-way).")
    else:
        out.append("No --base provided — silent acceptances are not detectable and "
                   "unattributable changes are labelled UNMATCHED_CHANGE.")
    s = data["summary"]
    out += ["", f"**{s['findings']} findings**: {s['accepted']} accepted, {s['reverted']} reverted, "
               f"{s['modified']} modified, {s['new']} new, {s['unmatched_change']} unmatched. "
               f"Their authors: {', '.join(s['their_authors']) or '—'}."]

    for cls in GROUP_ORDER:
        group = [f for f in data["findings"] if f["classification"] == cls]
        if not group:
            continue
        out += ["", f"## {GROUP_TITLES[cls]} ({len(group)})", ""]
        for f in group:
            loc = (f"¶{f['theirs_paragraph_index']}" if f["theirs_paragraph_index"] is not None
                   else f"ours ¶{f['ours_paragraph_index']}")
            ctx = f" ({trunc(f['section_context'])})" if f["section_context"] else ""
            who = f" — {', '.join(f['authors'])}" if f["authors"] else ""
            cids = f" [comments: {', '.join(f['comment_ids'])}]" if f["comment_ids"] else ""
            out.append(f"- **{loc}**{ctx} — {f['detail']}{who}{cids}")
            if f["our_text"]:
                out.append(f"  - ours: \"{trunc(f['our_text'])}\"")
            if f["their_original"] and norm(f["their_original"]) != norm(f["our_text"]):
                out.append(f"  - theirs (before): \"{trunc(f['their_original'])}\"")
            if f["their_revised"] and norm(f["their_revised"]) != norm(f["their_original"]):
                out.append(f"  - theirs (now): \"{trunc(f['their_revised'])}\"")

    real_comments = [c for c in data["comments"] if "error" not in c]
    if real_comments:
        out += ["", "## Comments", ""]
        for c in real_comments:
            out.append(f"- **[{c['id']}] {c['author']}** ({c['date']}, ¶{c['paragraph_index']}): {trunc(c['text'])}")
            if c["anchor_excerpt"]:
                out.append(f"  - anchored at: \"{trunc(c['anchor_excerpt'])}\"")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Classify what happened to our last redline round")
    ap.add_argument("--ours", type=Path, required=True,
                    help="the version we sent (its accept-all text is our proposal)")
    ap.add_argument("--theirs", type=Path, required=True,
                    help="the markup the counterparty returned")
    ap.add_argument("--base", type=Path,
                    help="round N-1 baseline before our edits (enables silent-acceptance and NEW detection)")
    ap.add_argument("--format", choices=["json", "markdown"], default="json")
    ap.add_argument("--full-text", action="store_true", help="don't truncate excerpts in markdown output")
    args = ap.parse_args()

    paths = [args.ours, args.theirs] + ([args.base] if args.base else [])
    for p in paths:
        if not p.exists():
            print(f"File not found: {p}", file=sys.stderr)
            return 1

    theirs_data = xr.extract(args.theirs)
    comment_map = {c["paragraph_index"]: c["comment_ids"]
                   for c in theirs_data["changes"] if c["comment_ids"]}

    findings = classify(
        paragraph_views(args.ours),
        paragraph_views(args.theirs),
        paragraph_views(args.base) if args.base else None,
        comment_map,
    )

    counts = Counter(f["classification"] for f in findings)
    data = {
        "ours": str(args.ours),
        "theirs": str(args.theirs),
        "base": str(args.base) if args.base else None,
        "summary": {
            "findings": len(findings),
            "accepted": counts["ACCEPTED"],
            "reverted": counts["REVERTED"],
            "modified": counts["MODIFIED"],
            "new": counts["NEW"],
            "unmatched_change": counts["UNMATCHED_CHANGE"],
            "their_authors": theirs_data["summary"]["authors"],
        },
        "findings": findings,
        "comments": theirs_data["comments"],
    }

    if args.format == "json":
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(to_markdown(data, full_text=args.full_text))
    return 0


if __name__ == "__main__":
    sys.exit(main())
