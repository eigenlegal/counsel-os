import { describe, expect, test } from 'bun:test';
import { checkDocx, checkText, detectFormat, docxBlocks, renderReport, textBlocks } from './check';
import { openDocx } from './package';
import { buildDocx, simpleDocx } from './test/builder';

const AT = '2026-08-28T10:00:00Z';

function byType(report: ReturnType<typeof checkText>, type: string) {
  return report.findings.filter(f => f.type === type);
}

describe('text extraction', () => {
  test('docx blocks are the accept-all text, trimmed, one per paragraph', () => {
    const blocks = docxBlocks(
      openDocx(buildDocx({ blocks: [{ runs: ['  1. Scope ', { text: 'old', del: { author: 'A', date: AT } }, { text: 'new', ins: { author: 'A', date: AT } }] }, { runs: [] }] })),
    );
    expect(blocks).toEqual(['1. Scope new', '']);
  });

  test('markdown scaffolding is stripped; blank lines dropped', () => {
    expect(textBlocks('# Title\n\n- **Bold** item\n> quote\n3) three\nplain  \n', true)).toEqual(['Title', 'Bold item', 'quote', 'three', 'plain']);
    expect(textBlocks('# Title\n', false)).toEqual(['# Title']);
  });

  test('detectFormat', () => {
    expect(detectFormat('a/b.DOCX')).toBe('docx');
    expect(detectFormat('x.markdown')).toBe('markdown');
    expect(detectFormat('x.txt')).toBe('text');
  });
});

describe('cross-references', () => {
  test('a reference to a section that does not exist is an error with locations', () => {
    const r = checkText('1. Definitions\n2. Term\nSubject to Section 7.2, the Term ends. See also Sections 2 and 9.', 'text', 'd.txt');
    // "Sections 2 and 9" never spells "Section 9", so that one has no location.
    expect(byType(r, 'undefined_reference').map(f => [f.detail, f.locations])).toEqual([
      ['7.2', ['line 3']],
      ['9', []],
    ]);
    expect(r.summary).toEqual({ error: 2, warning: 0, info: 0, total: 2 });
  });

  test('dotted headings register their prefixes; a Capitalized dotted heading needs no punctuation', () => {
    const r = checkText('8.1 Fees\n8.2 Payment\nAs set out in Section 8 and Section 8.2.', 'text', 'd.txt');
    expect(byType(r, 'undefined_reference')).toEqual([]);
    // "3.5 percent" is an amount, not a heading — with no headings at all the
    // auto-numbering guard speaks instead of flagging the reference.
    const s = checkText('3.5 percent per annum applies.\nSee Section 3.5.', 'text', 'd.txt');
    expect(s.findings).toEqual([]);
    expect(s.notes[0]).toContain('auto-generated');
  });

  test('articles, and § references — final order is by detail string, as the Python sorts', () => {
    const r = checkText('ARTICLE IV\nSee Article V and §§ 4, 12.', 'text', 'd.txt');
    expect(byType(r, 'undefined_reference').map(f => f.detail)).toEqual(['12', '4', 'V']);
  });

  test('auto-numbering guard: references but no typed numbers is a note, not a wall of errors', () => {
    const r = checkText('Definitions\nTerm\nSubject to Section 7.2 and Section 3.', 'text', 'd.txt');
    expect(r.findings).toEqual([]);
    expect(r.notes[0]).toContain('auto-generated');
  });
});

describe('exhibits', () => {
  test('a referenced attachment with no heading is an error; the heading line is not its own reference', () => {
    const r = checkText('The fees are in Exhibit A and the SLA in Schedule 2.\nEXHIBIT A\nFees.', 'text', 'd.txt');
    expect(byType(r, 'missing_exhibit').map(f => f.detail)).toEqual(['Schedule 2']);
  });
});

describe('defined terms', () => {
  test('unused definition (a lowercase mention is not a use), and capitalization drift on a used multi-word term', () => {
    const r = checkText(
      '"Confidential Information" means secrets.\nThe Receiving Party keeps confidential information safe.\n"Widget" refers to the thing.\n(the "Purpose")\nThe Purpose is narrow.\n"Receiving Party" means the recipient.\nThe Receiving Party shall comply; the receiving party may object.',
      'text',
      'd.txt',
    );
    expect(byType(r, 'unused_definition').map(f => f.detail)).toEqual(['Confidential Information', 'Widget']);
    expect(byType(r, 'capitalization_drift').map(f => [f.detail, f.message, f.locations])).toEqual([
      ['Receiving Party', 'Defined term "Receiving Party" also appears with inconsistent capitalization: receiving party', ['line 2', 'line 6', 'line 7']],
    ]);
  });

  test('a parenthetical that merely quotes something is not a definition', () => {
    const r = checkText('The vendor (who called it "Special" in the email) agreed.\nNothing uses it.', 'text', 'd.txt');
    expect(byType(r, 'unused_definition')).toEqual([]);
  });
});

describe('party names', () => {
  test('one entity written two ways; punctuation alone is not drift (and a comma before the suffix hides the name from the matcher, as in the Python)', () => {
    const r = checkText('Acme Robotics Inc. agrees.\nAcme Robotics Corp. shall pay.\nVantage Systems, LLC signs.\nVantage Systems LLC agrees.', 'text', 'd.txt');
    expect(byType(r, 'party_name_drift').map(f => [f.detail, f.message, f.locations])).toEqual([
      ['acmerobotics', 'Entity name is written inconsistently: "Acme Robotics Corp." vs "Acme Robotics Inc."', ['line 2']],
    ]);
  });
});

describe('undefined terms', () => {
  test('a recurring mid-sentence Title Case phrase with no definition is info; sentence-initial and stop-listed ones are not', () => {
    const r = checkText(
      'The fee for Premium Support is due monthly. Premium Support covers phone. We bill Premium Support quarterly.\nNew York law applies. The New York courts decide. Courts in New York rule.',
      'text',
      'd.txt',
    );
    expect(byType(r, 'undefined_term').map(f => f.detail)).toEqual(['Premium Support']);
    expect(r.findings[0]!.severity).toBe('info');
  });
});

describe('report shape', () => {
  test('findings sort by severity, heading, type, detail; summary counts; JSON key order', () => {
    const r = checkText('See Section 9.\n1. Intro\n2. More\n"Gadget" means x.\nAcme Co. and Acme Corp pay. See Exhibit B.', 'text', 'd.txt');
    expect(r.findings.map(f => `${f.severity}:${f.type}:${f.detail}`)).toEqual([
      'error:undefined_reference:9',
      'error:missing_exhibit:Exhibit B',
      'warning:unused_definition:Gadget',
      'warning:party_name_drift:acme',
    ]);
    expect(Object.keys(r)).toEqual(['file', 'format', 'summary', 'notes', 'findings']);
    expect(Object.keys(r.summary)).toEqual(['error', 'warning', 'info', 'total']);
  });

  test('a docx is checked on its accept-all view with ¶ locations', () => {
    const r = checkDocx(openDocx(simpleDocx('1. Intro', '2. Term', 'See Section 4.')), 'd.docx');
    expect(r.format).toBe('docx');
    expect(r.findings[0]!.locations).toEqual(['¶ 3']);
  });

  test('renderReport groups by heading', () => {
    const text = renderReport(checkText('1. A\n2. B\nSee Section 5.', 'text', 'd.txt'));
    expect(text).toContain('Document QA — d.txt');
    expect(text).toContain('1 finding(s): 1 error, 0 warning, 0 info');
    expect(text).toContain('CROSS-REFERENCES');
    expect(text).toContain('✗ "Section 5" is referenced');
    expect(renderReport(checkText('clean', 'text', 'd.txt'))).toContain('No mechanical issues found.');
  });
});
