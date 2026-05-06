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
