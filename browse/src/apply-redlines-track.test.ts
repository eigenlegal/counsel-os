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

const trackTest = hasPythonDocx() ? test : test.skip;
const repoRoot = () => path.resolve(import.meta.dir, '../..');

/**
 * Shared python preamble. Provides:
 *   run_track(original, edits, out)   — invoke apply_redlines.py --track
 *   accept_text(path) / reject_text(path)
 *     — the document text with all revisions accepted vs rejected, computed
 *       from the XML. python-docx paragraph.text is NOT usable for this: it
 *       silently drops w:ins runs and never sees w:delText.
 *   revisions(path) — list of (tag, author, id, text) for every w:ins/w:del
 */
const PREAMBLE = String.raw`
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from lxml import etree

from docx import Document

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

repo = Path(sys.argv[1])
apply_redlines = repo / "scripts" / "apply_redlines.py"
work = Path(tempfile.mkdtemp(prefix="counsel-track-test-"))

def run_track(original, edits, out, expect_exit=0):
    edits_json = out.with_suffix(".json")
    edits_json.write_text(json.dumps(edits))
    proc = subprocess.run(
        ["python3", str(apply_redlines), "--track", str(original), str(edits_json), str(out)],
        text=True,
        capture_output=True,
    )
    assert proc.returncode == expect_exit, proc.stderr + proc.stdout
    return json.loads(proc.stdout)

def _body(path):
    xml = zipfile.ZipFile(path).read("word/document.xml")
    return etree.fromstring(xml)

def _para_text(p, mode):
    parts = []
    for el in p.iter():
        if el.tag == W + "t":
            inside_del = any(a.tag == W + "del" for a in el.iterancestors())
            inside_ins = any(a.tag == W + "ins" for a in el.iterancestors())
            if inside_del:
                continue
            if inside_ins and mode == "reject":
                continue
            parts.append(el.text or "")
        elif el.tag == W + "delText" and mode == "reject":
            parts.append(el.text or "")
    return "".join(parts)

def doc_text(path, mode):
    root = _body(path)
    return [ _para_text(p, mode) for p in root.iter(W + "p") ]

def accept_text(path):
    return doc_text(path, "accept")

def reject_text(path):
    return doc_text(path, "reject")

def revisions(path):
    root = _body(path)
    out = []
    for el in root.iter(W + "ins", W + "del"):
        text = "".join(t.text or "" for t in el.iter(W + "t", W + "delText"))
        out.append({
            "tag": etree.QName(el).localname,
            "author": el.get(W + "author"),
            "id": el.get(W + "id"),
            "date": el.get(W + "date"),
            "text": text,
        })
    return out
`;

const TEARDOWN = String.raw`
shutil.rmtree(work)
`;

function runPython(body: string): string {
  return execFileSync('python3', ['-c', PREAMBLE + body + TEARDOWN, repoRoot()], {
    encoding: 'utf8',
  });
}

describe('apply_redlines.py --track native tracked changes', () => {
  trackTest('emits minimal w:del/w:ins whose accept/reject views are exact', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Payment is due within 30 days of invoice.")
doc.add_paragraph("This Agreement is governed by the laws of Delaware.")
doc.save(original)

out = work / "out.docx"
results = run_track(original, [
    {"current": "Payment is due within 30 days of invoice.",
     "proposed": "Payment is due within 45 days of invoice.",
     "comment": None, "author": "Counsel OS"},
], out)
assert len(results["applied"]) == 1, results

# Accepting everything must give the proposed text; rejecting everything must
# give back the original, byte for byte.
assert accept_text(out)[0] == "Payment is due within 45 days of invoice."
assert reject_text(out)[0] == "Payment is due within 30 days of invoice."
# The untouched paragraph carries no revisions and reads the same both ways.
assert accept_text(out)[1] == reject_text(out)[1] == "This Agreement is governed by the laws of Delaware."

# Word-boundary trimming: only the changed core is marked, not the sentence.
revs = revisions(out)
dels = [r for r in revs if r["tag"] == "del"]
inss = [r for r in revs if r["tag"] == "ins"]
assert len(dels) == 1 and len(inss) == 1, revs
assert dels[0]["text"] == "30", dels[0]
assert inss[0]["text"] == "45", inss[0]

# Attribution and identity on every revision element.
for r in revs:
    assert r["author"] == "Counsel OS", r
    assert r["date"], r
ids = [r["id"] for r in revs]
assert len(ids) == len(set(ids)), "revision ids must be unique: %r" % ids
`);
    expect(output).toBe('');
  });

  trackTest('preserves per-run formatting on deleted segments', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
p = doc.add_paragraph()
p.add_run("The fee is ")
bold = p.add_run("five percent")
bold.bold = True
p.add_run(" of gross revenue.")
doc.save(original)

out = work / "out.docx"
results = run_track(original, [
    {"current": "The fee is five percent of gross revenue.",
     "proposed": "The fee is three percent of gross revenue.",
     "comment": None, "author": "Counsel OS"},
], out)
assert len(results["applied"]) == 1, results
assert accept_text(out)[0] == "The fee is three percent of gross revenue."
assert reject_text(out)[0] == "The fee is five percent of gross revenue."

# The deleted "five" came from a bold run; its w:del wrapping must keep the
# bold rPr rather than flattening to document defaults.
root = _body(out)
del_runs = root.findall(".//" + W + "del/" + W + "r")
assert del_runs, "no runs inside w:del"
for r in del_runs:
    text = "".join(t.text or "" for t in r.iter(W + "delText"))
    if "five" in text:
        rPr = r.find(W + "rPr")
        assert rPr is not None and rPr.find(W + "b") is not None, \
            "bold formatting lost on deleted segment"
        break
else:
    raise AssertionError("deleted 'five' segment not found")
`);
    expect(output).toBe('');
  });

  trackTest('handles pure insertion and pure deletion', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Provider shall maintain insurance.")
doc.add_paragraph("This clause is redundant and shall be removed entirely.")
doc.save(original)

out = work / "out.docx"
results = run_track(original, [
    {"current": "Provider shall maintain insurance.",
     "proposed": "Provider shall maintain insurance of at least $1,000,000.",
     "comment": None, "author": "Counsel OS"},
    {"current": "This clause is redundant and shall be removed entirely.",
     "proposed": "",
     "comment": None, "author": "Counsel OS"},
], out)
assert len(results["applied"]) == 2, results

assert accept_text(out)[0] == "Provider shall maintain insurance of at least $1,000,000."
assert reject_text(out)[0] == "Provider shall maintain insurance."
assert accept_text(out)[1] == ""
assert reject_text(out)[1] == "This clause is redundant and shall be removed entirely."

revs = revisions(out)
# Insertion-only edit contributes no w:del; deletion-only edit no w:ins.
para1_revs = [r for r in revs if "1,000,000" in r["text"] or "insurance" in r["text"]]
assert all(r["tag"] == "ins" for r in para1_revs), para1_revs
para2_revs = [r for r in revs if "redundant" in r["text"]]
assert para2_revs and all(r["tag"] == "del" for r in para2_revs), para2_revs
`);
    expect(output).toBe('');
  });

  trackTest('comments attach alongside tracked changes', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Liability is unlimited.")
doc.save(original)

out = work / "out.docx"
results = run_track(original, [
    {"current": "Liability is unlimited.",
     "proposed": "Liability is capped at fees paid in the prior 12 months.",
     "comment": "Standard cap per our liability position.",
     "author": "Counsel OS"},
], out)
assert len(results["applied"]) == 1, results
assert not results["warnings"], results["warnings"]

comments_xml = zipfile.ZipFile(out).read("word/comments.xml").decode("utf-8")
assert "Standard cap per our liability position." in comments_xml
`);
    expect(output).toBe('');
  });

  trackTest('refuses to nest revisions inside existing tracked insertions', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Notice must be given within ten days.")
doc.save(original)

# First tracked pass inserts new text.
mid = work / "mid.docx"
run_track(original, [
    {"current": "ten days", "proposed": "ten business days",
     "comment": None, "author": "Counsel OS"},
], mid)

# Second pass targets text that now lives inside a w:ins from the first pass.
# OOXML does not allow w:ins inside w:ins; the item must be skipped with a
# reason, not emitted as invalid markup.
out = work / "out.docx"
results = run_track(mid, [
    {"current": "business", "proposed": "calendar",
     "comment": None, "author": "Counsel OS"},
], out, expect_exit=2)
assert len(results["skipped"]) == 1, results
assert "tracked" in results["skipped"][0]["reason"].lower() or \
       "nested" in results["skipped"][0]["reason"].lower(), results["skipped"][0]
`);
    expect(output).toBe('');
  });

  trackTest('multiple edits in one paragraph apply back-to-front intact', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Payment within 30 days; cure period 10 days; notice 5 days.")
doc.save(original)

out = work / "out.docx"
results = run_track(original, [
    {"current": "30 days", "proposed": "45 days", "comment": None, "author": "A"},
    {"current": "10 days", "proposed": "20 days", "comment": None, "author": "B"},
    {"current": "5 days", "proposed": "15 days", "comment": None, "author": "C"},
], out)
assert len(results["applied"]) == 3, results

assert accept_text(out)[0] == "Payment within 45 days; cure period 20 days; notice 15 days."
assert reject_text(out)[0] == "Payment within 30 days; cure period 10 days; notice 5 days."

# Each revision attributed to its own item's author.
revs = revisions(out)
by_author = {r["author"] for r in revs}
assert by_author == {"A", "B", "C"}, by_author
ids = [r["id"] for r in revs]
assert len(ids) == len(set(ids)), ids
`);
    expect(output).toBe('');
  });

  trackTest('plain mode is unchanged by the flag existing', () => {
    const output = runPython(String.raw`
original = work / "original.docx"
doc = Document()
doc.add_paragraph("Payment is due within 30 days.")
doc.save(original)

out = work / "out.docx"
edits_json = work / "plain.json"
edits_json.write_text(json.dumps([
    {"current": "30 days", "proposed": "45 days", "comment": None, "author": "X"},
]))
proc = subprocess.run(
    ["python3", str(apply_redlines), str(original), str(edits_json), str(out)],
    text=True, capture_output=True,
)
assert proc.returncode == 0, proc.stderr + proc.stdout
root = _body(out)
assert not list(root.iter(W + "ins")) and not list(root.iter(W + "del")), \
    "plain mode must not emit revision markup"
plain = Document(out)
assert plain.paragraphs[0].text == "Payment is due within 45 days."
`);
    expect(output).toBe('');
  });
});
