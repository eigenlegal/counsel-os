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

const redlineTest = hasPythonDocx() ? test : test.skip;

describe('apply_redlines.py duplicate handling', () => {
  redlineTest('refuses duplicate matches and applies an explicit location selector', () => {
    const repoRoot = path.resolve(import.meta.dir, '../..');
    const script = String.raw`
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from docx import Document

repo = Path(sys.argv[1])
apply_redlines = repo / "scripts" / "apply_redlines.py"
work = Path(tempfile.mkdtemp(prefix="counsel-redline-test-"))

try:
    original = work / "original.docx"
    doc = Document()
    doc.add_paragraph("Alpha repeated language.")
    doc.add_paragraph("Beta repeated language.")
    table = doc.add_table(rows=1, cols=1)
    table.cell(0, 0).text = "Gamma repeated language."
    doc.save(original)

    ambiguous_json = work / "ambiguous.json"
    ambiguous_json.write_text(json.dumps([
        {
            "current": "repeated language",
            "proposed": "replacement language",
            "comment": None,
            "author": "Tester",
        }
    ]))
    ambiguous = subprocess.run(
        ["python3", str(apply_redlines), str(original), str(ambiguous_json), str(work / "ambiguous.docx")],
        text=True,
        capture_output=True,
    )
    assert ambiguous.returncode == 2, ambiguous.stderr + ambiguous.stdout
    payload = json.loads(ambiguous.stdout)
    assert payload["skipped"][0]["reason"] == "Found 3 matches; add a match disambiguator"
    assert any(match["location"].startswith("table[0]") for match in payload["skipped"][0]["matches"])

    selected_json = work / "selected.json"
    selected_json.write_text(json.dumps([
        {
            "current": "repeated language",
            "proposed": "replacement language",
            "comment": None,
            "author": "Tester",
            "match": {"location": "body[1]"},
        }
    ]))
    selected_out = work / "selected.docx"
    selected = subprocess.run(
        ["python3", str(apply_redlines), str(original), str(selected_json), str(selected_out)],
        text=True,
        capture_output=True,
    )
    assert selected.returncode == 0, selected.stderr + selected.stdout
    selected_doc = Document(selected_out)
    assert selected_doc.paragraphs[0].text == "Alpha repeated language."
    assert selected_doc.paragraphs[1].text == "Beta replacement language."
    assert selected_doc.tables[0].cell(0, 0).text == "Gamma repeated language."
finally:
    shutil.rmtree(work)
`;

    const output = execFileSync('python3', ['-c', script, repoRoot], { encoding: 'utf8' });
    expect(output).toBe('');
  });
});

describe('apply_redlines.py occurrence snapshot semantics', () => {
  redlineTest('occurrence numbers always refer to the original document', () => {
    const repoRoot = path.resolve(import.meta.dir, '../..');
    const script = String.raw`
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from docx import Document

repo = Path(sys.argv[1])
apply_redlines = repo / "scripts" / "apply_redlines.py"
work = Path(tempfile.mkdtemp(prefix="counsel-redline-occ-test-"))

def run_edits(original, edits, out):
    edits_json = out.with_suffix(".json")
    edits_json.write_text(json.dumps(edits))
    return subprocess.run(
        ["python3", str(apply_redlines), str(original), str(edits_json), str(out)],
        text=True,
        capture_output=True,
    )

try:
    # A string repeated 3x across paragraphs, edited at occurrences 0/1/2.
    # Before the snapshot fix, applying occurrence 0 renumbered the
    # survivors, so occurrence 1 landed on what was originally occurrence 2.
    original = work / "original.docx"
    doc = Document()
    doc.add_paragraph("Payment is due within 30 days of invoice.")
    doc.add_paragraph("Cure period shall be 30 days from notice.")
    doc.add_paragraph("Termination requires 30 days advance notice.")
    doc.save(original)

    run = run_edits(original, [
        {"current": "30 days", "proposed": "45 days", "comment": None, "author": "Tester", "match": {"occurrence": 0}},
        {"current": "30 days", "proposed": "60 days", "comment": None, "author": "Tester", "match": {"occurrence": 1}},
        {"current": "30 days", "proposed": "90 days", "comment": None, "author": "Tester", "match": {"occurrence": 2}},
    ], work / "across.docx")
    assert run.returncode == 0, run.stderr + run.stdout
    payload = json.loads(run.stdout)
    assert [a["occurrence"] for a in payload["applied"]] == [0, 1, 2]
    result = Document(work / "across.docx")
    assert result.paragraphs[0].text == "Payment is due within 45 days of invoice."
    assert result.paragraphs[1].text == "Cure period shall be 60 days from notice."
    assert result.paragraphs[2].text == "Termination requires 90 days advance notice."

    # All 3 occurrences in ONE paragraph with different-length replacements:
    # exercises back-to-front application (earlier offsets stay valid).
    original2 = work / "original2.docx"
    doc2 = Document()
    doc2.add_paragraph("Pay in 30 days, cure in 30 days, terminate on 30 days notice.")
    doc2.save(original2)

    run2 = run_edits(original2, [
        {"current": "30 days", "proposed": "ten (10) days", "comment": None, "author": "Tester", "match": {"occurrence": 0}},
        {"current": "30 days", "proposed": "sixty (60) days", "comment": None, "author": "Tester", "match": {"occurrence": 1}},
        {"current": "30 days", "proposed": "ninety (90) days", "comment": None, "author": "Tester", "match": {"occurrence": 2}},
    ], work / "within.docx")
    assert run2.returncode == 0, run2.stderr + run2.stdout
    result2 = Document(work / "within.docx")
    assert result2.paragraphs[0].text == (
        "Pay in ten (10) days, cure in sixty (60) days, terminate on ninety (90) days notice."
    )

    # Two items resolving to the SAME occurrence: the first wins, the second
    # is skipped explicitly — never silently re-targeted to a survivor.
    run3 = run_edits(original, [
        {"current": "30 days", "proposed": "45 days", "comment": None, "author": "Tester", "match": {"occurrence": 0}},
        {"current": "30 days", "proposed": "60 days", "comment": None, "author": "Tester", "match": {"occurrence": 0}},
    ], work / "overlap.docx")
    assert run3.returncode == 2, run3.stderr + run3.stdout
    payload3 = json.loads(run3.stdout)
    assert [a["index"] for a in payload3["applied"]] == [0]
    assert payload3["skipped"][0]["index"] == 1
    assert "overlaps" in payload3["skipped"][0]["reason"]
    result3 = Document(work / "overlap.docx")
    assert result3.paragraphs[0].text == "Payment is due within 45 days of invoice."
    assert result3.paragraphs[1].text == "Cure period shall be 30 days from notice."
    assert result3.paragraphs[2].text == "Termination requires 30 days advance notice."
finally:
    shutil.rmtree(work)
`;

    const output = execFileSync('python3', ['-c', script, repoRoot], { encoding: 'utf8' });
    expect(output).toBe('');
  });
});
