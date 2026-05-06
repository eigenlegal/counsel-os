#!/usr/bin/env python3
"""Reformat a simple .docx to professional standards using consistent styles.

Usage:
    python3 clean_format.py <input.docx> <output.docx> [--template <template.docx>]

This script rebuilds the output document from body paragraphs and tables. It is
appropriate for simple letters, memos, and rough drafts, not negotiated
contracts or files that must preserve comments, tracked changes, hyperlinks,
fields, images, footnotes/endnotes, complex numbering, or section-specific
formatting.

Applies uniform 11pt Times New Roman, justified body text, bold headings with
proper spacing, native Word multilevel numbering (1, 1.1, 1.1.1), and 1-inch
margins. Straight quotes are converted to curly (smart) quotes.
The default template is legal-template.docx in the same directory as this script.
"""

import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

DEFAULT_FONT = "Times New Roman"
DEFAULT_SIZE = Pt(11)

# ---------------------------------------------------------------------------
# Numbering — multilevel 1 / 1.1 / 1.1.1
# ---------------------------------------------------------------------------

_NSMAP = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _make_level(ilvl: int, num_fmt: str, lvl_text: str,
                num_pos: int, tab_pos: int, wrap_pos: int = 0, start: int = 1):
    """Build one <w:lvl> element for an abstract numbering definition.

    num_pos:   where the number appears (twips from left margin)
    tab_pos:   tab stop after the number (where text begins on first line)
    wrap_pos:  where continuation lines wrap to (0 = left margin)
    """
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), str(ilvl))

    st = OxmlElement("w:start")
    st.set(qn("w:val"), str(start))
    lvl.append(st)

    fmt = OxmlElement("w:numFmt")
    fmt.set(qn("w:val"), num_fmt)
    lvl.append(fmt)

    txt = OxmlElement("w:lvlText")
    txt.set(qn("w:val"), lvl_text)
    lvl.append(txt)

    jc = OxmlElement("w:lvlJc")
    jc.set(qn("w:val"), "left")
    lvl.append(jc)

    pPr = OxmlElement("w:pPr")

    # Tab stop for clean gap after number
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "num")
    tab.set(qn("w:pos"), str(tab_pos))
    tabs.append(tab)
    pPr.append(tabs)

    ind = OxmlElement("w:ind")
    ind.set(qn("w:left"), str(wrap_pos))
    # Use firstLine to push the number right on the first line
    if num_pos > wrap_pos:
        ind.set(qn("w:firstLine"), str(num_pos - wrap_pos))
    lvl.append(pPr)
    pPr.append(ind)

    return lvl


def create_numbering(doc):
    """Create multilevel numbering (1, 1.1, 1.1.1) definition.

    Purges all pre-existing numbering definitions to avoid conflicts with
    built-in styles, then creates a clean multilevel definition.

    Returns num_id (int).
    """
    numbering_part = doc.part.numbering_part
    numbering_elm = numbering_part._element

    # Purge all existing abstractNum and num elements
    for child in list(numbering_elm):
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if tag in ("abstractNum", "num"):
            numbering_elm.remove(child)

    # --- Multilevel numbered list: 1. / 1.1. / 1.1.1. ---
    abstract_num = OxmlElement("w:abstractNum")
    abstract_num.set(qn("w:abstractNumId"), "1")

    multi_level = OxmlElement("w:multiLevelType")
    multi_level.set(qn("w:val"), "multilevel")
    abstract_num.append(multi_level)

    # Level 0 (section headings): number at 0, text at 0.5", wrap to 0
    abstract_num.append(_make_level(0, "decimal", "%1.",
                                    num_pos=0, tab_pos=720, wrap_pos=0))
    # Level 1 (sub-items): number at 0.5", text at 1.0", wrap to 0
    abstract_num.append(_make_level(1, "decimal", "%1.%2.",
                                    num_pos=720, tab_pos=1440, wrap_pos=0))
    # Level 2 (nested): number at 1.0", text at 1.5", wrap to 0
    abstract_num.append(_make_level(2, "decimal", "%1.%2.%3.",
                                    num_pos=1440, tab_pos=2160, wrap_pos=0))

    numbering_elm.append(abstract_num)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), "1")
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), "1")
    num.append(abstract_ref)
    numbering_elm.append(num)

    return 1


def apply_numbering(paragraph, num_id: int, ilvl: int):
    """Apply numbering to a paragraph via its XML numPr element."""
    pPr = paragraph._element.get_or_add_pPr()

    # Remove any existing numPr
    existing = pPr.find(qn("w:numPr"))
    if existing is not None:
        pPr.remove(existing)

    numPr = OxmlElement("w:numPr")

    ilvl_elm = OxmlElement("w:ilvl")
    ilvl_elm.set(qn("w:val"), str(ilvl))
    numPr.append(ilvl_elm)

    numId_elm = OxmlElement("w:numId")
    numId_elm.set(qn("w:val"), str(num_id))
    numPr.append(numId_elm)

    pPr.append(numPr)


# ---------------------------------------------------------------------------
# Content classification
# ---------------------------------------------------------------------------

HEADING_PATTERNS = re.compile(
    r"^("
    r"article\s|section\s|recitals?|definitions?|whereas|exhibit\s|schedule\s|"
    r"appendix\s|annex\s|preamble|background|introduction|terms and conditions"
    r")",
    re.IGNORECASE,
)

NUMBERED_PREFIX = re.compile(
    r"^(\d{1,3}\.(\d{1,3}\.)*\s+|\(\d{1,3}\)\s+|\([a-z]\)\s+|\([ivxlc]+\)\s+|[a-z]\.\s+|[ivxlc]+\.\s+)",
    re.IGNORECASE,
)

BULLET_CHARS = set("•·–—-*▪▸►")


def _is_heading_style(style_name: str) -> bool:
    if not style_name:
        return False
    sn = style_name.lower()
    return sn.startswith("heading") or sn in ("title", "subtitle")


def _heading_level(style_name: str) -> int:
    if not style_name:
        return 1
    sn = style_name.lower()
    if sn == "title":
        return 0
    for n in (1, 2, 3):
        if str(n) in sn:
            return n
    return 1


def _all_runs_bold(paragraph) -> bool:
    if not paragraph.runs:
        return False
    return all(r.bold for r in paragraph.runs if r.text.strip())


def _is_all_caps_text(text: str) -> bool:
    alpha = [c for c in text if c.isalpha()]
    return len(alpha) > 2 and all(c.isupper() for c in alpha)


def classify_paragraph(paragraph) -> tuple[str, int]:
    """Classify a paragraph as (type, level).

    Types: 'title', 'heading', 'bullet', 'number', 'body'
    Level: 0 for title/body, 1-3 for headings/lists.
    """
    text = paragraph.text.strip()
    if not text:
        return ("body", 0)

    style_name = paragraph.style.name if paragraph.style else ""

    # Existing heading style
    if _is_heading_style(style_name):
        level = _heading_level(style_name)
        if level == 0:
            return ("title", 0)
        return ("heading", level)

    # Short + bold or ALL CAPS → heading (even with number prefix)
    if len(text) < 120 and (_all_runs_bold(paragraph) or _is_all_caps_text(text)):
        if text[0] not in BULLET_CHARS:
            return ("heading", 1)

    # Heading keyword patterns
    if len(text) < 120 and HEADING_PATTERNS.match(text):
        return ("heading", 1)

    # Existing list styles
    sn = style_name.lower()
    if "bullet" in sn or "list bullet" in sn:
        level = 2 if "2" in sn else 3 if "3" in sn else 1
        return ("bullet", level)
    if "list number" in sn or "list continue" in sn:
        level = 2 if "2" in sn else 3 if "3" in sn else 1
        return ("number", level)

    # Detect bullet by leading character
    if text and text[0] in BULLET_CHARS:
        return ("bullet", 1)

    # Detect numbered list by prefix
    if NUMBERED_PREFIX.match(text):
        return ("number", 1)

    return ("body", 0)


def strip_bullet_prefix(text: str) -> str:
    if text and text[0] in BULLET_CHARS:
        return text[1:].lstrip()
    return text


def strip_number_prefix(text: str) -> str:
    m = NUMBERED_PREFIX.match(text)
    if m:
        return text[m.end():]
    return text


# ---------------------------------------------------------------------------
# Document building
# ---------------------------------------------------------------------------


def _smartquotes(text: str) -> str:
    """Convert straight quotes to curly (smart) quotes."""
    result = []
    for i, ch in enumerate(text):
        if ch == '"':
            if i == 0 or text[i - 1] in " \t\n\r([":
                result.append("\u201c")
            else:
                result.append("\u201d")
        elif ch == "'":
            if i == 0 or text[i - 1] in " \t\n\r([":
                result.append("\u2018")
            else:
                result.append("\u2019")
        else:
            result.append(ch)
    return "".join(result)


def _remove_paragraph_border(paragraph):
    """Remove all paragraph borders (line under/over/beside)."""
    pPr = paragraph._element.get_or_add_pPr()
    existing = pPr.find(qn("w:pBdr"))
    if existing is not None:
        pPr.remove(existing)
    pBdr = OxmlElement("w:pBdr")
    for side in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{side}")
        border.set(qn("w:val"), "none")
        border.set(qn("w:sz"), "0")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "auto")
        pBdr.append(border)
    pPr.append(pBdr)


def _set_style_defaults(doc):
    """Set default font and remove title border on document styles."""
    for style_name in ("Normal", "Title", "Heading 1", "Heading 2", "Heading 3"):
        try:
            style = doc.styles[style_name]
            style.font.name = DEFAULT_FONT
            style.font.size = DEFAULT_SIZE
        except KeyError:
            pass
    # Remove bottom border from Title style
    try:
        title_style = doc.styles["Title"]
        pPr = title_style.element.get_or_add_pPr()
        existing_bdr = pPr.find(qn("w:pBdr"))
        if existing_bdr is not None:
            pPr.remove(existing_bdr)
    except (KeyError, AttributeError):
        pass


def copy_runs(source_paragraph, dest_paragraph):
    """Copy runs preserving bold/italic/underline only."""
    for src_run in source_paragraph.runs:
        text = src_run.text
        if not text:
            continue
        dest_run = dest_paragraph.add_run(_smartquotes(text))
        dest_run.font.name = DEFAULT_FONT
        dest_run.font.size = DEFAULT_SIZE
        dest_run.bold = src_run.bold
        dest_run.italic = src_run.italic
        dest_run.underline = src_run.underline
        if src_run.font.strike:
            dest_run.font.strike = src_run.font.strike
        if src_run.font.subscript:
            dest_run.font.subscript = src_run.font.subscript
        if src_run.font.superscript:
            dest_run.font.superscript = src_run.font.superscript


def copy_runs_strip_prefix(source_paragraph, dest_paragraph, strip_fn):
    """Copy runs, stripping a prefix from the first non-empty run."""
    first = True
    for src_run in source_paragraph.runs:
        run_text = src_run.text
        if first and run_text.strip():
            run_text = strip_fn(run_text.lstrip())
            first = False
        if not run_text:
            continue
        dest_run = dest_paragraph.add_run(_smartquotes(run_text))
        dest_run.font.name = DEFAULT_FONT
        dest_run.font.size = DEFAULT_SIZE
        dest_run.bold = src_run.bold
        dest_run.italic = src_run.italic
        dest_run.underline = src_run.underline


def copy_table(source_table, dest_doc, warnings):
    """Copy a table with clean formatting."""
    rows = len(source_table.rows)
    cols = len(source_table.columns)
    dest_table = dest_doc.add_table(rows=rows, cols=cols)

    try:
        dest_table.style = dest_doc.styles["Table Grid"]
    except KeyError:
        pass

    for i, src_row in enumerate(source_table.rows):
        for j, src_cell in enumerate(src_row.cells):
            dest_cell = dest_table.cell(i, j)
            if dest_cell.paragraphs:
                dest_cell.paragraphs[0].clear()

            for k, src_para in enumerate(src_cell.paragraphs):
                if k == 0:
                    dest_para = dest_cell.paragraphs[0]
                else:
                    dest_para = dest_cell.add_paragraph()

                try:
                    dest_para.style = dest_doc.styles["Normal"]
                except KeyError:
                    pass

                copy_runs(src_para, dest_para)

    return dest_table


def build_clean_document(source_path, template_path):
    """Build a clean-formatted document from source using template styles."""
    source = Document(str(source_path))

    if template_path and Path(template_path).exists():
        dest = Document(str(template_path))
    else:
        dest = Document()

    # Remove any default content from template
    for p in dest.paragraphs:
        p._element.getparent().remove(p._element)

    # Set margins
    for section in dest.sections:
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)

    # Set default font on styles and remove title border
    _set_style_defaults(dest)

    # Create numbering definition
    num_id = create_numbering(dest)

    results = {
        "paragraphs_processed": 0,
        "headings_detected": 0,
        "lists_converted": 0,
        "tables_processed": 0,
        "warnings": [],
    }

    title_seen = False

    for element in source.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            from docx.text.paragraph import Paragraph

            src_para = Paragraph(element, source)
            text = src_para.text.strip()
            results["paragraphs_processed"] += 1

            if not text:
                dest.add_paragraph("", style="Normal")
                continue

            cls, level = classify_paragraph(src_para)

            # Promote first ALL CAPS heading to title
            if not title_seen and cls == "heading" and _is_all_caps_text(text):
                cls = "title"

            if cls == "title":
                title_seen = True
                results["headings_detected"] += 1
                dest_para = dest.add_paragraph(style="Title")
                copy_runs(src_para, dest_para)
                _remove_paragraph_border(dest_para)

            elif cls == "heading":
                results["headings_detected"] += 1
                style_name = {1: "Heading 1", 2: "Heading 2", 3: "Heading 3"}.get(level, "Heading 1")
                try:
                    dest_para = dest.add_paragraph(style=style_name)
                except KeyError:
                    dest_para = dest.add_paragraph(style="Normal")
                # Strip manual numbering prefix and use native numbering
                copy_runs_strip_prefix(src_para, dest_para, strip_number_prefix)
                # Heading level maps to numbering ilvl: H1=0, H2=1, H3=2
                ilvl = min(level - 1, 2)
                apply_numbering(dest_para, num_id, ilvl)

            elif cls == "bullet":
                results["lists_converted"] += 1
                dest_para = dest.add_paragraph(style="Normal")
                copy_runs_strip_prefix(src_para, dest_para, strip_bullet_prefix)
                # Bullets become sub-items (ilvl 1 under current heading)
                ilvl = min(level, 2)  # level 1 bullet → ilvl 1
                apply_numbering(dest_para, num_id, ilvl)

            elif cls == "number":
                results["lists_converted"] += 1
                dest_para = dest.add_paragraph(style="Normal")
                copy_runs_strip_prefix(src_para, dest_para, strip_number_prefix)
                # Numbered items become sub-items (ilvl 1 under current heading)
                ilvl = min(level, 2)
                apply_numbering(dest_para, num_id, ilvl)

            else:
                dest_para = dest.add_paragraph(style="Normal")
                copy_runs(src_para, dest_para)

        elif tag == "tbl":
            from docx.table import Table as DocxTable

            src_table = DocxTable(element, source)
            copy_table(src_table, dest, results["warnings"])
            results["tables_processed"] += 1

    # Copy headers/footers
    try:
        for i, src_section in enumerate(source.sections):
            if i >= len(dest.sections):
                break
            dest_section = dest.sections[i]
            if src_section.header and src_section.header.paragraphs:
                header_text = "\n".join(
                    p.text for p in src_section.header.paragraphs if p.text.strip()
                )
                if header_text:
                    dest_section.header.is_linked_to_previous = False
                    for p in dest_section.header.paragraphs:
                        p.clear()
                    dest_section.header.paragraphs[0].text = header_text
            if src_section.footer and src_section.footer.paragraphs:
                footer_text = "\n".join(
                    p.text for p in src_section.footer.paragraphs if p.text.strip()
                )
                if footer_text:
                    dest_section.footer.is_linked_to_previous = False
                    for p in dest_section.footer.paragraphs:
                        p.clear()
                    dest_section.footer.paragraphs[0].text = footer_text
    except Exception as e:
        results["warnings"].append(f"Header/footer copy failed: {e}")

    return dest, results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    template_path = None

    if "--template" in args:
        idx = args.index("--template")
        template_path = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    if len(args) != 2:
        print(f"Usage: {sys.argv[0]} <input.docx> <output.docx> [--template <path>]")
        sys.exit(1)

    input_path = Path(args[0])
    output_path = Path(args[1])

    if not input_path.exists():
        print(f"Error: Input document not found: {input_path}")
        sys.exit(1)

    if not template_path:
        default_template = Path(__file__).parent / "legal-template.docx"
        if default_template.exists():
            template_path = str(default_template)

    doc, results = build_clean_document(input_path, template_path)
    doc.save(str(output_path))

    print(json.dumps(results, indent=2))

    total = results["paragraphs_processed"]
    headings = results["headings_detected"]
    lists = results["lists_converted"]
    tables = results["tables_processed"]
    warns = len(results["warnings"])
    print(
        f"\nSummary: {total} paragraphs, {headings} headings, "
        f"{lists} lists, {tables} tables, {warns} warnings",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
