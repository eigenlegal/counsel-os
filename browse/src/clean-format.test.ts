import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as path from 'path';

function hasPythonDocx(): boolean {
  try {
    execFileSync('python3', ['-c', 'import docx'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const formatTest = hasPythonDocx() ? test : test.skip;
const repoRoot = () => path.resolve(import.meta.dir, '../..');

/**
 * Shared python preamble: builds a source .docx, runs clean_format.py, and
 * exposes the output as a list of (style, text, numId, ilvl) tuples plus the
 * results JSON. Assertions live in the per-test body appended after this.
 */
const PREAMBLE = String.raw`
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

repo = Path(sys.argv[1])
clean_format = repo / "scripts" / "clean_format.py"
work = Path(tempfile.mkdtemp(prefix="counsel-clean-format-test-"))

def run(source):
    """Run clean_format.py; return (rows, results, output_path)."""
    out = work / "out.docx"
    proc = subprocess.run(
        ["python3", str(clean_format), str(source), str(out)],
        text=True,
        capture_output=True,
    )
    assert proc.returncode == 0, proc.stderr + proc.stdout
    results = json.loads(proc.stdout)
    doc = Document(out)
    rows = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        num_id = None
        ilvl = None
        pPr = p._element.find(qn("w:pPr"))
        if pPr is not None:
            numPr = pPr.find(qn("w:numPr"))
            if numPr is not None:
                nid = numPr.find(qn("w:numId"))
                lvl = numPr.find(qn("w:ilvl"))
                num_id = int(nid.get(qn("w:val"))) if nid is not None else None
                ilvl = int(lvl.get(qn("w:val"))) if lvl is not None else None
        rows.append({
            "style": p.style.name,
            "text": text,
            "num_id": num_id,
            "ilvl": ilvl,
        })
    return rows, results, out

def find(rows, needle):
    for r in rows:
        if needle in r["text"]:
            return r
    raise AssertionError("no paragraph containing %r in %r" % (
        needle, [r["text"] for r in rows]))

def exact(rows, text):
    """Match the whole paragraph - needed where one heading's text is a
    substring of another ("SERVICES" vs "MASTER SERVICES AGREEMENT")."""
    for r in rows:
        if r["text"] == text:
            return r
    raise AssertionError("no paragraph equal to %r in %r" % (
        text, [r["text"] for r in rows]))

def numbered(rows):
    return [r for r in rows if r["num_id"] is not None]
`;

const TEARDOWN = String.raw`
shutil.rmtree(work)
`;

function runPython(body: string): string {
  return execFileSync('python3', ['-c', PREAMBLE + body + TEARDOWN, repoRoot()], {
    encoding: 'utf8',
  });
}

describe('clean_format.py mirrors existing legal numbering', () => {
  formatTest('derives level from number depth and leaves non-sections unnumbered', () => {
    const output = runPython(String.raw`
src = work / "contract.docx"
doc = Document()

legend = doc.add_paragraph()
legend_run = legend.add_run("DRAFT - FOR DISCUSSION PURPOSES ONLY - SUBJECT TO CONTRACT")
legend_run.bold = True
legend.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_heading("MASTER SERVICES AGREEMENT", level=1)
doc.add_paragraph('This Master Services Agreement (this "Agreement") is entered into today.')
doc.add_heading("RECITALS", level=2)
doc.add_paragraph("WHEREAS, the Provider is engaged in the business of providing services;")
doc.add_heading("1. DEFINITIONS", level=2)
doc.add_heading("1.1 Defined Terms", level=3)
doc.add_paragraph("The following terms have the meanings set out below.")
doc.add_heading("1.2 Interpretation", level=3)
doc.add_heading("2. SERVICES", level=2)
doc.add_heading("2.1 Scope", level=3)
doc.save(src)

rows, results, _ = run(src)

assert results["numbering_mode"] == "mirror", results["numbering_mode"]
assert results["corrections"] == [], results["corrections"]

# The draft legend is styled but never fed to the section counter, and it
# must not hijack the Title style from the real title.
legend_row = find(rows, "DRAFT")
assert legend_row["num_id"] is None, legend_row
assert legend_row["style"] != "Title", legend_row

title_row = find(rows, "MASTER SERVICES AGREEMENT")
assert title_row["num_id"] is None, title_row

# RECITALS carries no literal number, so it stays an unnumbered heading.
assert find(rows, "RECITALS")["num_id"] is None

# A WHEREAS clause is body prose, not a numbered section.
whereas = find(rows, "WHEREAS")
assert whereas["num_id"] is None, whereas

# Level comes from the number's own depth, not the heading style depth:
# "1. DEFINITIONS" is a Heading 2 in the source but is a top-level section.
definitions = exact(rows, "DEFINITIONS")
assert definitions["ilvl"] == 0, definitions

# "1.1 Defined Terms" has no trailing dot after the last segment; it must be
# recognised, stripped, and numbered at ilvl 1 - not left literal and
# double-numbered.
defined = exact(rows, "Defined Terms")
assert defined["ilvl"] == 1, defined

assert exact(rows, "Interpretation")["ilvl"] == 1
assert exact(rows, "SERVICES")["ilvl"] == 0
assert exact(rows, "Scope")["ilvl"] == 1
`);
    expect(output).toBe('');
  });
});

describe('clean_format.py auto-numbering fallback', () => {
  formatTest('a document with no literal numbering is still auto-numbered', () => {
    const output = runPython(String.raw`
src = work / "memo.docx"
doc = Document()
doc.add_heading("PRIVILEGED AND CONFIDENTIAL", level=1)
doc.add_heading("Background", level=1)
doc.add_paragraph("The company acquired the assets in March.")
doc.add_heading("Analysis", level=1)
doc.add_paragraph("Three considerations apply.")
doc.add_heading("Scope of review", level=2)
doc.save(src)

rows, results, _ = run(src)

assert results["numbering_mode"] == "auto", results["numbering_mode"]

# The privilege banner is never numbered even in auto mode.
assert find(rows, "PRIVILEGED")["num_id"] is None

assert exact(rows, "Background")["ilvl"] == 0
assert exact(rows, "Analysis")["ilvl"] == 0
assert exact(rows, "Scope of review")["ilvl"] == 1
`);
    expect(output).toBe('');
  });
});

describe('clean_format.py leaves unmirrorable numbering alone', () => {
  formatTest('an ARTICLE I / Section 1.1 contract is not double-numbered', () => {
    const output = runPython(String.raw`
src = work / "article.docx"
doc = Document()
doc.add_heading("ARTICLE I - DEFINITIONS", level=1)
doc.add_heading("Section 1.1 Defined Terms", level=2)
doc.add_heading("Section 1.2 Interpretation", level=2)
doc.add_heading("ARTICLE II - SERVICES", level=1)
doc.add_heading("Section 2.1 Scope", level=2)
doc.save(src)

rows, results, _ = run(src)

# This scheme cannot be expressed as native decimal numbering, so nothing is
# numbered - stacking an invented scheme on top would render
# "1. ARTICLE I - DEFINITIONS".
assert results["numbering_mode"] == "preserve", results["numbering_mode"]
assert numbered(rows) == [], numbered(rows)

# The author's numbering survives verbatim in the text.
assert exact(rows, "Section 1.1 Defined Terms")
assert exact(rows, "Section 2.1 Scope")

# A numbered section is never promoted to the document title, even when it
# is the first ALL CAPS heading in the document.
assert exact(rows, "ARTICLE I - DEFINITIONS")["style"] != "Title"
`);
    expect(output).toBe('');
  });
});

describe('clean_format.py numbering corrections', () => {
  formatTest('duplicate, backwards, and gapped numbers are normalised to sequential', () => {
    const output = runPython(String.raw`
src = work / "broken.docx"
doc = Document()
doc.add_heading("1. ALPHA", level=1)
doc.add_heading("1. BRAVO", level=1)     # duplicate
doc.add_heading("2. CHARLIE", level=1)   # now trails the corrected BRAVO
doc.add_heading("9. DELTA", level=1)     # forward gap
doc.add_heading("3. ECHO", level=1)      # backwards jump
doc.save(src)

rows, results, _ = run(src)

assert results["numbering_mode"] == "mirror", results["numbering_mode"]

# Counters are authoritative: every heading is emitted sequentially at ilvl 0.
for name in ("ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"):
    assert exact(rows, name)["ilvl"] == 0, name
assert len(numbered(rows)) == 5, rows

# Four headings disagreed with the counter and are reported.
corrected = {c["source"]: c["emitted"] for c in results["corrections"]}
assert corrected == {"1.": "2.", "2.": "3.", "9.": "4.", "3.": "5."}, results["corrections"]
`);
    expect(output).toBe('');
  });

  formatTest('closing a gap warns that body cross-references may be stale', () => {
    const output = runPython(String.raw`
src = work / "xref.docx"
doc = Document()
doc.add_heading("1. DEFINITIONS", level=1)
doc.add_heading("9. MISCELLANEOUS", level=1)
doc.add_heading("9.4 Governing Law", level=2)
doc.add_paragraph("This Agreement is governed as set out in Section 9.4.")
doc.save(src)

rows, results, _ = run(src)

assert results["corrections"], results
joined = " ".join(results["warnings"])
assert "cross-reference" in joined.lower(), results["warnings"]
`);
    expect(output).toBe('');
  });
});

describe('clean_format.py exhibit numbering regions', () => {
  formatTest('numbering restarts at an exhibit boundary via startOverride', () => {
    const output = runPython(String.raw`
src = work / "exhibit.docx"
doc = Document()
doc.add_heading("1. DEFINITIONS", level=1)
doc.add_heading("2. SERVICES", level=1)
doc.add_heading("EXHIBIT A - STATEMENT OF WORK", level=1)
doc.add_heading("1. Scope", level=1)
doc.add_heading("2. Deliverables", level=1)
doc.save(src)

rows, results, out = run(src)

# The exhibit divider itself is a heading, not a numbered section.
assert find(rows, "EXHIBIT A")["num_id"] is None

body_id = exact(rows, "DEFINITIONS")["num_id"]
exhibit_id = exact(rows, "Scope")["num_id"]
assert body_id != exhibit_id, (body_id, exhibit_id)
assert exact(rows, "Deliverables")["num_id"] == exhibit_id

# Restarting is only reliable when the fresh w:num carries an explicit
# startOverride; without it Word shares the counter across instances.
doc_out = Document(out)
numbering = doc_out.part.numbering_part._element
target = None
for num in numbering.findall(qn("w:num")):
    if int(num.get(qn("w:numId"))) == exhibit_id:
        target = num
assert target is not None, "no w:num for the exhibit region"
overrides = target.findall(qn("w:lvlOverride"))
assert overrides, "exhibit region has no lvlOverride"
starts = [o.find(qn("w:startOverride")) for o in overrides]
assert all(s is not None and s.get(qn("w:val")) == "1" for s in starts), "startOverride missing"

# The exhibit's own sections are not reported as corrections - restarting
# at 1 after an exhibit divider is deliberate, not a mistake.
assert results["corrections"] == [], results["corrections"]
`);
    expect(output).toBe('');
  });
});

describe('clean_format.py numbering glyph font', () => {
  formatTest('number glyphs and docDefaults both resolve to Times New Roman', () => {
    const output = runPython(String.raw`
src = work / "fonts.docx"
doc = Document()
doc.add_heading("1. DEFINITIONS", level=1)
doc.add_heading("1.1 Defined Terms", level=2)
doc.save(src)

rows, results, out = run(src)
doc_out = Document(out)

# Every numbering level carries an explicit rPr, otherwise Word renders the
# number glyph in the theme font (Cambria here, Calibri on the python-docx
# fallback template) while the text runs are Times New Roman.
numbering = doc_out.part.numbering_part._element
levels = numbering.findall(qn("w:abstractNum") + "/" + qn("w:lvl"))
assert levels, "no numbering levels found"
for lvl in levels:
    rPr = lvl.find(qn("w:rPr"))
    assert rPr is not None, "numbering level has no rPr"
    fonts = rPr.find(qn("w:rFonts"))
    assert fonts is not None, "numbering level rPr has no rFonts"
    assert fonts.get(qn("w:ascii")) == "Times New Roman", fonts.get(qn("w:ascii"))

# docDefaults must not leave the source template's theme font in place.
styles = doc_out.styles.element
defaults = styles.find(qn("w:docDefaults"))
assert defaults is not None, "no docDefaults"
rpr_default = defaults.find(qn("w:rPrDefault"))
assert rpr_default is not None, "no rPrDefault"
default_fonts = rpr_default.find(qn("w:rPr")).find(qn("w:rFonts"))
assert default_fonts is not None, "no docDefaults rFonts"
assert default_fonts.get(qn("w:ascii")) == "Times New Roman", default_fonts.get(qn("w:ascii"))
`);
    expect(output).toBe('');
  });
});
