import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// scripts/check_document.py is a deterministic mechanical-QA linter over a
// contract draft (cou-50). Its markdown/text path imports no python-docx, so
// those tests run everywhere; the .docx path is gated on python-docx being
// present (matching apply-redlines.test.ts) and additionally proves the
// accept-all extraction ignores tracked deletions.
const repoRoot = path.resolve(import.meta.dir, '../..');
const script = path.join(repoRoot, 'scripts', 'check_document.py');

function hasPython(): boolean {
  try {
    execFileSync('python3', ['-c', 'import sys'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasPythonDocx(): boolean {
  try {
    execFileSync('python3', ['-c', 'import docx'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

type Finding = { type: string; severity: string; detail: string };
type Report = {
  summary: { error: number; warning: number; info: number; total: number };
  notes: string[];
  findings: Finding[];
};

function runJson(file: string): Report {
  const out = execFileSync('python3', [script, file, '--json'], { encoding: 'utf8' });
  return JSON.parse(out);
}

function types(report: Report): Set<string> {
  return new Set(report.findings.map((f) => f.type));
}

function writeTmp(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdqa-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

const mdTest = hasPython() ? test : test.skip;
const docxTest = hasPythonDocx() ? test : test.skip;

describe('check_document.py — markdown path (no python-docx needed)', () => {
  mdTest('flags dangling cross-refs, unattached exhibits, unused/undefined terms, drift', () => {
    const md = writeTmp(
      'nda.md',
      [
        '# MUTUAL NONDISCLOSURE AGREEMENT',
        '',
        'This Agreement is between Acme Corporation ("Discloser") and Beta LLC ("Recipient").',
        'Acme Corp. and Beta LLC agree as follows.',
        '',
        '## 1. Definitions',
        '"Confidential Information" means non-public information.',
        '"Representatives" means officers, employees, and agents of a party.',
        '',
        '## 2. Obligations',
        'Recipient shall use Confidential Information. The parties protect confidential information.',
        'See Section 4.2 for remedies and Exhibit A for the form.',
      ].join('\n'),
    );
    const report = runJson(md);
    const t = types(report);

    // High-confidence errors.
    expect(t.has('undefined_reference')).toBe(true); // Section 4.2 does not exist
    expect(t.has('missing_exhibit')).toBe(true); // Exhibit A referenced, not attached
    // Warnings.
    expect(t.has('capitalization_drift')).toBe(true); // "confidential information"
    expect(t.has('unused_definition')).toBe(true); // Discloser / Representatives
    expect(t.has('party_name_drift')).toBe(true); // Acme Corporation vs Acme Corp.

    // Precision guards: things that must NOT be flagged.
    const unusedDetails = report.findings
      .filter((f) => f.type === 'unused_definition')
      .map((f) => f.detail);
    expect(unusedDetails).toContain('Discloser');
    expect(unusedDetails).not.toContain('Confidential Information'); // it IS used
    expect(unusedDetails).not.toContain('Recipient'); // it IS used
    expect(report.summary.error).toBeGreaterThanOrEqual(2);
  });

  mdTest('a clean document produces zero findings', () => {
    const md = writeTmp(
      'clean.md',
      [
        '# NDA',
        'This Agreement is between Acme LLC ("Company") and Beta LLC ("Vendor").',
        '',
        '## 1. Definitions',
        '"Confidential Information" means non-public information.',
        '',
        '## 2. Use',
        'Vendor shall protect Confidential Information. Company may enforce this under Section 2.',
      ].join('\n'),
    );
    const report = runJson(md);
    expect(report.summary.total).toBe(0);
  });

  mdTest('auto-numbered doc: cross-ref check is skipped with a note, not false positives', () => {
    const md = writeTmp(
      'autonum.md',
      [
        '# Services Agreement',
        'Provider shall deliver the Services. Payment terms are in Section 5.',
        'Confidentiality is described in Section 9 and Article III.',
      ].join('\n'),
    );
    const report = runJson(md);
    expect(types(report).has('undefined_reference')).toBe(false);
    expect(report.notes.join(' ')).toContain('auto-generated');
  });

  mdTest('resolves a "Section N.N" ref to a no-period subsection heading (no false error)', () => {
    // Regression (cou-51): the common legal subsection style "3.2 Late Fees"
    // (dotted decimal, whitespace, capitalized word, NO trailing period) must
    // register as a section so a valid "Section 3.2" ref resolves instead of
    // false-flagging at error severity. Period-suffixed top-level headings sit
    // alongside it, so the auto-numbering guard does not fire.
    const mixed = writeTmp(
      'mixed.md',
      [
        '# 1. Definitions',
        '"Services" means the professional services.',
        '# 2. Scope',
        'Provider performs the Services.',
        '# 3. Payment',
        'Fees are due per the schedule below.',
        '## 3.2 Late Fees',
        'Overdue amounts accrue interest, and remedies are set forth in Section 3.2.',
      ].join('\n'),
    );
    const report = runJson(mixed);
    expect(types(report).has('undefined_reference')).toBe(false);
    expect(report.summary.error).toBe(0);

    // ...and --strict stays green (exit 0) on this clean mixed-heading doc.
    let code = 0;
    try {
      execFileSync('python3', [script, mixed, '--strict'], { stdio: 'ignore' });
    } catch (e: any) {
      code = e.status;
    }
    expect(code).toBe(0);
  });

  mdTest('--strict exits non-zero only when an error-severity finding exists', () => {
    const bad = writeTmp(
      'bad.md',
      ['# 1. Scope', 'Provisions are in Section 2 and Section 9.', '# 2. Term', 'Two years.'].join(
        '\n',
      ),
    );
    let code = 0;
    try {
      execFileSync('python3', [script, bad, '--strict'], { stdio: 'ignore' });
    } catch (e: any) {
      code = e.status;
    }
    expect(code).toBe(3);
  });
});

describe('check_document.py — docx path', () => {
  docxTest('reads .docx and ignores tracked deletions (accept-all view)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdqa-docx-'));
    const docx = path.join(dir, 'tracked.docx');
    const builder = String.raw`
import sys
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

out = sys.argv[1]
doc = Document()
doc.add_paragraph('1. Scope')
doc.add_paragraph('3. Payment')
p = doc.add_paragraph('Remedies are set forth in ')
ins = OxmlElement('w:ins'); ins.set(qn('w:author'), 'X'); ins.set(qn('w:date'), '2020-01-01T00:00:00Z')
r = OxmlElement('w:r'); t = OxmlElement('w:t'); t.text = 'Section 3'; r.append(t); ins.append(r)
p._p.append(ins)
dele = OxmlElement('w:del'); dele.set(qn('w:author'), 'X'); dele.set(qn('w:date'), '2020-01-01T00:00:00Z')
r2 = OxmlElement('w:r'); dt = OxmlElement('w:delText'); dt.text = ' Section 99'; r2.append(dt); dele.append(r2)
p._p.append(dele)
doc.save(out)
`;
    execFileSync('python3', ['-c', builder, docx]);
    const report = runJson(docx);
    // Deleted "Section 99" must NOT surface as a dangling reference; the
    // inserted "Section 3" resolves to the '3. Payment' heading -> clean.
    const dangling = report.findings.filter((f) => f.type === 'undefined_reference');
    expect(dangling.map((f) => f.detail)).not.toContain('99');
    expect(report.summary.total).toBe(0);
  });

  docxTest('reports paragraph locations for docx findings', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdqa-docx2-'));
    const docx = path.join(dir, 'nda.docx');
    const builder = String.raw`
import sys
from docx import Document
out = sys.argv[1]
doc = Document()
doc.add_paragraph('1. Definitions')
doc.add_paragraph('"Purpose" means the evaluation of a business relationship.')
doc.add_paragraph('2. Term')
doc.add_paragraph('Obligations survive per Section 7.1 of this Agreement.')
doc.save(out)
`;
    execFileSync('python3', ['-c', builder, docx]);
    const report = runJson(docx);
    const ref = report.findings.find((f) => f.type === 'undefined_reference');
    expect(ref).toBeDefined();
    expect(report.findings.some((f) => f.type === 'unused_definition' && f.detail === 'Purpose')).toBe(
      true,
    );
    // Locations are paragraph-based for docx.
    const withLoc = report.findings.find((f) => (f as any).locations?.length);
    expect(String((withLoc as any).locations[0])).toContain('¶');
  });
});
