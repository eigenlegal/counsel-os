import { describe, expect, test } from 'bun:test';
import { openDocx } from './package';
import { align, classify, diffRounds, norm, paragraphViews, roundsToMarkdown } from './rounds';
import { buildDocx, type DocxSpec } from './test/builder';

// The expectations below were produced by scripts/diff_rounds.py on these
// same fixtures before the script was retired (JSON and markdown identical).
const AT = '2026-08-01T00:00:00Z';
const ins = (text: string, author = 'Them') => ({ text, ins: { author, date: AT } });
const del = (text: string, author = 'Them') => ({ text, del: { author, date: AT } });

function rounds(ours: DocxSpec, theirs: DocxSpec, base?: DocxSpec) {
  return diffRounds({
    ours: openDocx(buildDocx(ours)),
    theirs: openDocx(buildDocx(theirs)),
    base: base ? openDocx(buildDocx(base)) : null,
    names: { ours: 'ours.docx', theirs: 'theirs.docx', base: base ? 'base.docx' : null },
  });
}

describe('norm, align, paragraphViews', () => {
  test('norm collapses whitespace and keeps case', () => {
    expect(norm('  Two   spaces\tand tab ')).toBe('Two spaces and tab');
    expect(norm(null)).toBe('');
  });

  test('align pairs equal runs, fuzzy-pairs replace blocks, and marks the rest', () => {
    expect(align(['a', 'b', 'c'], ['a', 'c'])).toEqual([[0, 0], [1, null], [2, 1]]);
    expect(align(['Payment net 30 days.', 'x'], ['Payment net 60 days.', 'y'])).toEqual([[0, 0], [1, null], [null, 1]]);
  });

  test('paragraphViews carries both views, the change flag, authors and section context', () => {
    const views = paragraphViews(openDocx(buildDocx({ blocks: [{ style: 'Heading1', runs: ['1. Term'] }, { runs: ['Term is ', del('two'), ins('three'), ' years.'] }] })));
    expect(views).toEqual([
      { paragraph_index: 0, section_context: '1. Term', original: '1. Term', revised: '1. Term', changed: false, authors: [], dates: [] },
      { paragraph_index: 1, section_context: '1. Term', original: 'Term is two years.', revised: 'Term is three years.', changed: true, authors: ['Them'], dates: ['2026-08-01'] },
    ]);
  });
});

describe('diffRounds', () => {
  test('two-way: edits on our sent text and a whole inserted paragraph are UNMATCHED without --base; comments ride along', () => {
    const data = rounds(
      { blocks: [{ style: 'Heading1', runs: ['1. Term'] }, { runs: ['The term is ', ins('three', 'Us'), del('two', 'Us'), ' years.'] }, { runs: ['Fees are due in 30 days.'] }, { runs: ['Notice by email.'] }] },
      {
        blocks: [
          { style: 'Heading1', runs: ['1. Term'] },
          { runs: ['The term is three years.'] },
          { runs: ['Fees are due in ', del('30'), ins('45'), ' days.'] },
          { runs: [del('Notice by email.'), ins('Notice by courier.')] },
          { runs: [ins('Governing law: Delaware.')] },
        ],
        comments: [{ id: '3', author: 'Them', date: AT, text: 'We need 45.' }],
      },
    );
    expect(data.summary).toEqual({ findings: 3, accepted: 0, reverted: 0, modified: 0, new: 0, unmatched_change: 3, their_authors: ['Them'] });
    expect(data.findings.map(f => [f.classification, f.theirs_paragraph_index, f.detail])).toEqual([
      ['UNMATCHED_CHANGE', 2, 'edit on top of our sent text; cannot tell counter-modification from new ask without --base'],
      ['UNMATCHED_CHANGE', 3, 'edit on top of our sent text; cannot tell counter-modification from new ask without --base'],
      ['UNMATCHED_CHANGE', 4, 'whole paragraph inserted; cannot rule out reinstatement of prior text without --base'],
    ]);
    expect(data.findings[0]).toMatchObject({ our_text: 'Fees are due in 30 days.', their_original: 'Fees are due in 30 days.', their_revised: 'Fees are due in 45 days.', base_text: null, authors: ['Them'], section_context: '1. Term' });
    expect(data.comments).toEqual([{ id: '3', author: 'Them', date: '2026-08-01', text: 'We need 45.', paragraph_index: null, anchor_excerpt: '' }]);
    const md = roundsToMarkdown(data);
    expect(md).toContain('# Round comparison — ours.docx → theirs.docx');
    expect(md).toContain('No --base provided');
    expect(md).toContain('**3 findings**: 0 accepted, 0 reverted, 0 modified, 0 new, 3 unmatched. Their authors: Them.');
    expect(md).toContain('## UNMATCHED_CHANGE — cannot attribute without --base (3)');
    expect(md).toContain('- **¶2** (1. Term) — edit on top of our sent text; cannot tell counter-modification from new ask without --base — Them');
    expect(md).toContain('- **[3] Them** (2026-08-01, ¶None): We need 45.');
  });

  test('three-way with --base: silent acceptance, reverted, NEW insert, and a dropped paragraph we never touched', () => {
    const data = rounds(
      { blocks: [{ runs: ['Cap is two times fees.'] }, { runs: ['Indemnity is mutual.'] }, { runs: ['Assignment needs consent.'] }, { runs: ['Survival: five years.'] }] },
      { blocks: [{ runs: ['Cap is two times fees.'] }, { runs: ['Indemnity is ', del('mutual'), ins('one-way'), '.'] }, { runs: ['Assignment needs consent.'] }, { runs: [ins('Audit rights annually.')] }] },
      { blocks: [{ runs: ['Cap is one times fees.'] }, { runs: ['Indemnity is one-way.'] }, { runs: ['Assignment needs consent.'] }, { runs: ['Survival: five years.'] }] },
    );
    expect(data.base).toBe('base.docx');
    expect(data.summary).toEqual({ findings: 4, accepted: 1, reverted: 1, modified: 0, new: 2, unmatched_change: 0, their_authors: ['Them'] });
    expect(data.findings.map(f => [f.classification, f.detail, f.base_text])).toEqual([
      ['ACCEPTED', 'our edit retained untouched', 'Cap is one times fees.'],
      ['REVERTED', 'tracked change restores the pre-round baseline', 'Indemnity is one-way.'],
      ['NEW', 'they deleted a paragraph we never touched', 'Survival: five years.'],
      ['NEW', 'whole paragraph inserted', null],
    ]);
    expect(roundsToMarkdown(data)).toContain('Baseline: base.docx (3-way).');
    expect(roundsToMarkdown(data)).toContain('## ACCEPTED — our language adopted (1)');
  });

  test('reinstatement of text we deleted, and a modified paragraph', () => {
    const data = rounds(
      { blocks: [{ runs: [del('Exclusivity for two years.', 'Us')] }, { runs: ['Payment net 30.'] }, { runs: ['Warranty is as-is.'] }] },
      { blocks: [{ runs: ['Exclusivity for two years.'] }, { runs: ['Payment net ', del('30'), ins('60'), '.'] }, { runs: ['Warranty is ', del('as-is'), ins('limited'), ' and capped.'] }] },
    );
    expect(data.findings.map(f => [f.classification, f.detail])).toEqual([
      ['REVERTED', 'text we deleted is retained'],
      ['UNMATCHED_CHANGE', 'edit on top of our sent text; cannot tell counter-modification from new ask without --base'],
      // Their starting text already differed from ours ("… and capped."), so
      // this is a MODIFIED, not an edit on top of our sent text.
      ['MODIFIED', 'their revised text differs from both our text and their starting text'],
    ]);
  });

  test('identical documents: no findings', () => {
    const data = rounds({ blocks: [{ runs: ['Same.'] }, { runs: [''] }] }, { blocks: [{ runs: ['Same.'] }, { runs: [''] }] });
    expect(data.summary.findings).toBe(0);
    expect(data.findings).toEqual([]);
    expect(roundsToMarkdown(data)).toContain('**0 findings**');
  });

  test('classify is pure and stable on an empty comment map', () => {
    expect(classify([], [], null, new Map())).toEqual([]);
  });
});
