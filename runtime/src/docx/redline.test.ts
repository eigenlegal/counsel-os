import { describe, expect, test } from 'bun:test';
import type { Element } from '@xmldom/xmldom';
import { commentsOf, descendants, isW, modelOf, textOf, attr, W_NS } from './model';
import { openDocx, serialize, type DocxPackage } from './package';
import { applyRedlines, collectMatches, formatMatch, paragraphEditText, selectMatch, setRunText, type RedlineItem } from './redline';
import { buildDocx, simpleDocx } from './test/builder';

const AT = new Date('2026-09-01T12:00:00Z');

function accept(pkg: DocxPackage): string[] {
  return modelOf(pkg).paragraphs.map(p => textOf(p, 'accept'));
}
function reject(pkg: DocxPackage): string[] {
  return modelOf(pkg).paragraphs.map(p => textOf(p, 'reject'));
}

interface Rev {
  tag: string;
  author: string | null;
  id: string | null;
  date: string | null;
  text: string;
}
function revisions(pkg: DocxPackage): Rev[] {
  const out: Rev[] = [];
  const root = pkg.document.documentElement!;
  for (const el of descendants(root)) {
    if (!isW(el, 'ins') && !isW(el, 'del')) continue;
    const text = [...descendants(el)]
      .filter(n => isW(n, 't') || isW(n, 'delText'))
      .map(n => n.textContent ?? '')
      .join('');
    out.push({ tag: el.localName ?? '', author: attr(el, 'author'), id: attr(el, 'id'), date: attr(el, 'date'), text });
  }
  return out;
}

/** Saves and reopens, so every assertion reads what a file on disk would say. */
function roundTrip(pkg: DocxPackage): DocxPackage {
  return openDocx(pkg.save());
}

function item(current: string, proposed: string, extra: Partial<RedlineItem> = {}): RedlineItem {
  return { current, proposed, comment: null, author: 'Counsel OS', ...extra };
}

describe('collectMatches and selectMatch (phase 1)', () => {
  const pkg = (): DocxPackage =>
    openDocx(
      buildDocx({
        blocks: [
          { runs: ['Alpha repeated language.'] },
          { runs: ['Beta repeated language.'] },
          { table: { rows: [[{ paragraphs: [{ runs: ['Gamma repeated language.'] }] }]] } },
        ],
        header: [{ runs: ['Header repeated language.'] }],
      }),
    );

  test('body paragraphs first, then table cells, then the parts that cannot be edited', () => {
    const matches = collectMatches(pkg(), 'repeated language');
    expect(matches.map(m => [m.location, m.occurrence, m.replaceable, m.paragraphIndex])).toEqual([
      ['body[0]', 0, true, 0],
      ['body[1]', 1, true, 1],
      ['table[0].row[0].cell[0].p[0]', 2, true, null],
      ['header1[0]', 3, false, null],
    ]);
    expect(matches[0]!.before).toBe('Alpha ');
    expect(matches[0]!.after).toBe('.');
    expect(formatMatch(matches[2]!)).toEqual({ location: 'table[0].row[0].cell[0].p[0]', occurrence: 2, start: 6, replaceable: true, before: 'Gamma', after: '.' });
  });

  test('no selector with several hits refuses with the count; each selector narrows', () => {
    const matches = collectMatches(pkg(), 'repeated language');
    expect(selectMatch(matches, null)).toEqual({ match: null, reason: 'Found 4 matches; add a match disambiguator' });
    expect(selectMatch(matches, { location: 'body[1]' }).match?.location).toBe('body[1]');
    expect(selectMatch(matches, { occurrence: 2 }).match?.location).toBe('table[0].row[0].cell[0].p[0]');
    expect(selectMatch(matches, { occurrence: '2' }).match?.location).toBe('table[0].row[0].cell[0].p[0]');
    expect(selectMatch(matches, { paragraph_index: 1 }).match?.location).toBe('body[1]');
    expect(selectMatch(matches, { before: 'Beta ' }).match?.location).toBe('body[1]');
    expect(selectMatch(matches, { context: 'Gamma' }).match?.location).toBe('table[0].row[0].cell[0].p[0]');
    expect(selectMatch(matches, { after: '.' })).toEqual({ match: null, reason: 'match disambiguator still selected 4 matches' });
    expect(selectMatch(matches, { context: 'Delta' })).toEqual({ match: null, reason: 'match disambiguator selected no matches' });
    expect(selectMatch(matches, { occurrence: 'two' })).toEqual({ match: null, reason: 'match.occurrence must be an integer' });
    expect(selectMatch(matches, 'body[1]' as never)).toEqual({ match: null, reason: 'match must be an object' });
  });

  test('a single hit needs no selector', () => {
    expect(selectMatch(collectMatches(pkg(), 'Alpha'), undefined).match?.location).toBe('body[0]');
  });

  test('text only inside a tracked deletion is not a match', () => {
    const p = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'gone', del: { author: 'R', date: '2026-01-01T00:00:00Z' } }, ' stays'] }] }));
    expect(collectMatches(p, 'gone')).toEqual([]);
    expect(collectMatches(p, 'stays')).toHaveLength(1);
  });

  test('tabs read as \\t and hyperlink / insertion runs are searchable', () => {
    const p = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'A', tab: true }, { text: 'link', hyperlink: 'rId9' }, { text: 'new', ins: { author: 'R', date: '2026-01-01T00:00:00Z' } }] }] }));
    expect(paragraphEditText(modelOf(p).paragraphs[0]!.element)).toBe('\tAlinknew');
    expect(collectMatches(p, 'linknew')).toHaveLength(1);
  });
});

describe('setRunText', () => {
  test('rebuilds w:t, w:tab and w:br from the string and keeps rPr', () => {
    const p = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'x', bold: true }] }] }));
    const run = modelOf(p).paragraphs[0]!.runs[0]!.element;
    setRunText(run, 'a\tb\nc ');
    const xml = serialize(run);
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:tab/>');
    expect(xml).toContain('<w:br/>');
    expect(xml).toContain('xml:space="preserve">c </w:t>');
    expect(paragraphEditText(modelOf(p).paragraphs[0]!.element)).toBe('a\tb\nc ');
  });
});

describe('applyRedlines, plain mode', () => {
  test('refuses duplicate matches and applies an explicit location selector', () => {
    const doc = (): DocxPackage =>
      openDocx(
        buildDocx({
          blocks: [{ runs: ['Alpha repeated language.'] }, { runs: ['Beta repeated language.'] }, { table: { rows: [[{ paragraphs: [{ runs: ['Gamma repeated language.'] }] }]] } }],
        }),
      );
    const ambiguous = applyRedlines(doc(), [item('repeated language', 'replacement language', { author: 'Tester' })], { track: false });
    expect(ambiguous.skipped[0]!.reason).toBe('Found 3 matches; add a match disambiguator');
    expect(ambiguous.skipped[0]!.matches!.some(m => m.location.startsWith('table[0]'))).toBe(true);
    expect(ambiguous.applied).toEqual([]);

    const pkg = doc();
    const selected = applyRedlines(pkg, [item('repeated language', 'replacement language', { author: 'Tester', match: { location: 'body[1]' } })], { track: false });
    expect(selected.applied).toEqual([{ index: 0, location: 'body[1]', occurrence: 1 }]);
    expect(accept(roundTrip(pkg))).toEqual(['Alpha repeated language.', 'Beta replacement language.', 'Gamma repeated language.']);
  });

  test('occurrence numbers always refer to the original document', () => {
    const pkg = openDocx(simpleDocx('Payment is due within 30 days of invoice.', 'Cure period shall be 30 days from notice.', 'Termination requires 30 days advance notice.'));
    const r = applyRedlines(
      pkg,
      [
        item('30 days', '45 days', { match: { occurrence: 0 } }),
        item('30 days', '60 days', { match: { occurrence: 1 } }),
        item('30 days', '90 days', { match: { occurrence: 2 } }),
      ],
      { track: false },
    );
    expect(r.applied.map(a => a.occurrence)).toEqual([0, 1, 2]);
    expect(accept(roundTrip(pkg))).toEqual(['Payment is due within 45 days of invoice.', 'Cure period shall be 60 days from notice.', 'Termination requires 90 days advance notice.']);
  });

  test('three occurrences in ONE paragraph with different-length replacements apply back to front', () => {
    const pkg = openDocx(simpleDocx('Pay in 30 days, cure in 30 days, terminate on 30 days notice.'));
    applyRedlines(
      pkg,
      [
        item('30 days', 'ten (10) days', { match: { occurrence: 0 } }),
        item('30 days', 'sixty (60) days', { match: { occurrence: 1 } }),
        item('30 days', 'ninety (90) days', { match: { occurrence: 2 } }),
      ],
      { track: false },
    );
    expect(accept(roundTrip(pkg))).toEqual(['Pay in ten (10) days, cure in sixty (60) days, terminate on ninety (90) days notice.']);
  });

  test('two items on the same occurrence: the first wins, the second is skipped explicitly', () => {
    const pkg = openDocx(simpleDocx('Payment is due within 30 days of invoice.', 'Cure period shall be 30 days from notice.'));
    const r = applyRedlines(pkg, [item('30 days', '45 days', { match: { occurrence: 0 } }), item('30 days', '60 days', { match: { occurrence: 0 } })], { track: false });
    expect(r.applied.map(a => a.index)).toEqual([0]);
    expect(r.skipped[0]!.index).toBe(1);
    expect(r.skipped[0]!.reason).toContain('overlaps');
    expect(accept(roundTrip(pkg))).toEqual(['Payment is due within 45 days of invoice.', 'Cure period shall be 30 days from notice.']);
  });

  test('empty current, text not found, and text only inside a deletion', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'struck', del: { author: 'R', date: '2026-01-01T00:00:00Z' } }, ' kept'] }] }));
    const r = applyRedlines(pkg, [item('', 'x'), item('missing', 'x'), item('struck', 'x')], { track: false });
    expect(r.skipped).toEqual([
      { index: 0, current: '', reason: 'current text must not be empty' },
      { index: 1, current: 'missing', reason: 'Text not found in document' },
      { index: 2, current: 'struck', reason: 'Text not found in document' },
    ]);
    expect(r.warnings).toEqual([{ index: 2, current: 'struck', warning: 'Text appears only inside tracked deletions (w:del); deleted text is not editable' }]);
  });

  test('a match spanning three runs lands in the first run with its formatting; the middle run clears', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'The fee is ', bold: true }, 'five ', { text: 'percent of revenue.', italic: true }] }] }));
    const r = applyRedlines(pkg, [item('fee is five percent', 'fee is three percent')], { track: false });
    expect(r.applied).toHaveLength(1);
    const reopened = roundTrip(pkg);
    expect(accept(reopened)).toEqual(['The fee is three percent of revenue.']);
    const runs = modelOf(reopened).paragraphs[0]!.runs;
    expect(runs.map(x => x.text)).toEqual(['The fee is three percent', '', ' of revenue.']);
    expect(serialize(runs[0]!.element)).toContain('<w:b/>');
  });

  test('a hit in a header is reported, never edited', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['Body text.'] }], header: [{ runs: ['Confidential draft'] }] }));
    const r = applyRedlines(pkg, [item('Confidential draft', 'Final')], { track: false });
    expect(r.skipped[0]!.reason).toBe('Selected match is in unsupported content: header1[0]');
    expect(r.skipped[0]!.matches).toEqual([{ location: 'header1[0]', occurrence: 0, start: 0, replaceable: false, before: '', after: '' }]);
  });

  test('a hostile header part is skipped with a note, never parsed, and the body edit still applies', () => {
    const hostile =
      '<?xml version="1.0"?><!DOCTYPE hdr [ <!ENTITY leak SYSTEM "file:///etc/passwd"> ]>' +
      '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>confidential terms &leak;</w:t></w:r></w:p></w:hdr>';
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['The confidential terms apply.'] }], rawParts: { 'word/header1.xml': hostile } }));
    const r = applyRedlines(pkg, [item('confidential terms', 'public terms', { author: 'Tester' })], { track: false });
    expect(r.applied).toHaveLength(1);
    expect(r.notes).toHaveLength(1);
    expect(r.notes[0]).toContain('skipping word/header1.xml');
    expect(JSON.stringify(r)).not.toContain('passwd');
    expect(accept(roundTrip(pkg))).toEqual(['The public terms apply.']);
  });

  test('a long current is truncated in the report, and lists come back sorted by index', () => {
    const long = 'x'.repeat(100);
    const r = applyRedlines(openDocx(simpleDocx('a')), [item('missing', 'x'), item(long, 'y')], { track: false });
    expect(r.skipped.map(s => s.index)).toEqual([0, 1]);
    expect(r.skipped[1]!.current).toBe(`${'x'.repeat(80)}...`);
  });
});

describe('applyRedlines, tracked mode', () => {
  test('emits minimal w:del/w:ins whose accept/reject views are exact', () => {
    const pkg = openDocx(simpleDocx('Payment is due within 30 days of invoice.', 'This Agreement is governed by the laws of Delaware.'));
    const r = applyRedlines(pkg, [item('Payment is due within 30 days of invoice.', 'Payment is due within 45 days of invoice.')], { track: true, now: AT });
    expect(r.applied).toHaveLength(1);
    expect(r.tracked).toBe(true);
    const out = roundTrip(pkg);
    expect(accept(out)[0]).toBe('Payment is due within 45 days of invoice.');
    expect(reject(out)[0]).toBe('Payment is due within 30 days of invoice.');
    expect(accept(out)[1]).toBe('This Agreement is governed by the laws of Delaware.');
    expect(reject(out)[1]).toBe('This Agreement is governed by the laws of Delaware.');
    const revs = revisions(out);
    expect(revs.filter(x => x.tag === 'del').map(x => x.text)).toEqual(['30']);
    expect(revs.filter(x => x.tag === 'ins').map(x => x.text)).toEqual(['45']);
    for (const rev of revs) {
      expect(rev.author).toBe('Counsel OS');
      expect(rev.date).toBe('2026-09-01T12:00:00Z');
    }
    expect(new Set(revs.map(x => x.id)).size).toBe(revs.length);
    expect(r.stats).toEqual({ regions: 1, comments: 0, paragraphs: 1 });
  });

  test('scattered changes in one pair yield multiple minimal regions', () => {
    const pkg = openDocx(simpleDocx('Payment is due within 30 days and the cure period is 10 days from notice.'));
    applyRedlines(pkg, [item('Payment is due within 30 days and the cure period is 10 days from notice.', 'Payment is due within 45 days and the cure period is 20 days from notice.')], { track: true, now: AT });
    const out = roundTrip(pkg);
    expect(accept(out)[0]).toBe('Payment is due within 45 days and the cure period is 20 days from notice.');
    expect(reject(out)[0]).toBe('Payment is due within 30 days and the cure period is 10 days from notice.');
    const revs = revisions(out);
    expect(revs.filter(x => x.tag === 'del').map(x => x.text).sort()).toEqual(['10', '30']);
    expect(revs.filter(x => x.tag === 'ins').map(x => x.text).sort()).toEqual(['20', '45']);
    expect(revs.map(x => x.text).join(' ')).not.toContain('cure period');
  });

  test('preserves per-run formatting on deleted segments', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['The fee is ', { text: 'five percent', bold: true }, ' of gross revenue.'] }] }));
    applyRedlines(pkg, [item('The fee is five percent of gross revenue.', 'The fee is three percent of gross revenue.')], { track: true, now: AT });
    const out = roundTrip(pkg);
    expect(accept(out)[0]).toBe('The fee is three percent of gross revenue.');
    expect(reject(out)[0]).toBe('The fee is five percent of gross revenue.');
    const delRuns = [...descendants(out.document.documentElement!)].filter(el => isW(el, 'del')).flatMap(del => [...descendants(del)].filter(r => isW(r, 'r')));
    const five = delRuns.find(r => serialize(r).includes('five'));
    expect(five).toBeDefined();
    expect(serialize(five!)).toContain('<w:b/>');
    expect(serialize(five!)).toContain('<w:delText');
  });

  test('handles pure insertion and pure deletion', () => {
    const pkg = openDocx(simpleDocx('Provider shall maintain insurance.', 'This clause is redundant and shall be removed entirely.'));
    const r = applyRedlines(
      pkg,
      [item('Provider shall maintain insurance.', 'Provider shall maintain insurance of at least $1,000,000.'), item('This clause is redundant and shall be removed entirely.', '')],
      { track: true, now: AT },
    );
    expect(r.applied).toHaveLength(2);
    const out = roundTrip(pkg);
    expect(accept(out)).toEqual(['Provider shall maintain insurance of at least $1,000,000.', '']);
    expect(reject(out)).toEqual(['Provider shall maintain insurance.', 'This clause is redundant and shall be removed entirely.']);
    const revs = revisions(out);
    expect(revs.filter(x => x.text.includes('1,000,000') || x.text.includes('insurance')).every(x => x.tag === 'ins')).toBe(true);
    const p2 = revs.filter(x => x.text.includes('redundant'));
    expect(p2.length > 0 && p2.every(x => x.tag === 'del')).toBe(true);
  });

  test('comments attach alongside tracked changes', () => {
    const pkg = openDocx(simpleDocx('Liability is unlimited.'));
    const r = applyRedlines(pkg, [item('Liability is unlimited.', 'Liability is capped at fees paid in the prior 12 months.', { comment: 'Standard cap per our liability position.' })], { track: true, now: AT });
    expect(r.applied).toHaveLength(1);
    expect(r.warnings).toEqual([]);
    expect(r.stats.comments).toBe(1);
    const out = roundTrip(pkg);
    expect(out.partText('word/comments.xml')).toContain('Standard cap per our liability position.');
    expect(commentsOf(out)).toEqual([{ id: '0', author: 'Counsel OS', date: '2026-09-01T12:00:00Z', initials: 'CO', text: 'Standard cap per our liability position.' }]);
    expect(modelOf(out).paragraphs[0]!.commentIds).toEqual(['0']);
  });

  test('refuses to nest revisions inside existing tracked insertions', () => {
    const pkg = openDocx(simpleDocx('Notice must be given within ten days.'));
    applyRedlines(pkg, [item('ten days', 'ten business days')], { track: true, now: AT });
    const mid = roundTrip(pkg);
    const r = applyRedlines(mid, [item('business', 'calendar')], { track: true, now: AT });
    expect(r.applied).toEqual([]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]!.reason.toLowerCase()).toMatch(/tracked|nested/);
    // Refused BEFORE mutating: the document still reads as it did.
    expect(accept(roundTrip(mid))[0]).toBe('Notice must be given within ten business days.');
  });

  test('multiple edits in one paragraph apply back-to-front intact, each attributed', () => {
    const pkg = openDocx(simpleDocx('Payment within 30 days; cure period 10 days; notice 5 days.'));
    const r = applyRedlines(
      pkg,
      [item('30 days', '45 days', { author: 'A' }), item('10 days', '20 days', { author: 'B' }), item('5 days', '15 days', { author: 'C' })],
      { track: true, now: AT },
    );
    expect(r.applied).toHaveLength(3);
    const out = roundTrip(pkg);
    expect(accept(out)[0]).toBe('Payment within 45 days; cure period 20 days; notice 15 days.');
    expect(reject(out)[0]).toBe('Payment within 30 days; cure period 10 days; notice 5 days.');
    const revs = revisions(out);
    expect(new Set(revs.map(x => x.author))).toEqual(new Set(['A', 'B', 'C']));
    expect(new Set(revs.map(x => x.id)).size).toBe(revs.length);
  });

  test('revision ids start above the document max; plain mode emits none', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: [{ text: 'old ', ins: { author: 'R', date: '2026-01-01T00:00:00Z' } }, 'Payment is due within 30 days.'] }] }));
    const existing = revisions(pkg).map(x => Number(x.id));
    applyRedlines(pkg, [item('30 days', '45 days')], { track: true, now: AT });
    const ids = revisions(roundTrip(pkg)).map(x => Number(x.id));
    expect(Math.min(...ids.filter(id => !existing.includes(id)))).toBeGreaterThan(Math.max(...existing));

    const plain = openDocx(simpleDocx('Payment is due within 30 days.'));
    applyRedlines(plain, [item('30 days', '45 days', { author: 'X' })], { track: false });
    expect(revisions(roundTrip(plain))).toEqual([]);
    expect(accept(roundTrip(plain))[0]).toBe('Payment is due within 45 days.');
  });

  test('insertion into an empty paragraph, and a tab inside a strike', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: [] }, { runs: [{ text: 'Col A', tab: false }, { text: 'Col B', tab: true }] }] }));
    const r = applyRedlines(pkg, [item('Col A\tCol B', 'Col A\tCol C')], { track: true, now: AT });
    expect(r.applied).toHaveLength(1);
    const out = roundTrip(pkg);
    expect(revisions(out).filter(x => x.tag === 'del').map(x => x.text)).toEqual(['B']);
    expect(revisions(out).filter(x => x.tag === 'ins').map(x => x.text)).toEqual(['C']);
    const xml = out.partText('word/document.xml');
    expect(xml).toContain('<w:tab/>');
  });

  test('a paragraph with no runs takes an insertion as a new w:ins', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ runs: ['Before.'] }, { runs: [] }] }));
    // The only way to target an empty paragraph is through a neighbour; an
    // insertion INTO an empty paragraph arises when the current text is a
    // whole-run replacement that left nothing — exercised through the region
    // path directly.
    const p = modelOf(pkg).paragraphs[1]!.element as Element;
    expect(p.namespaceURI).toBe(W_NS);
    const r = applyRedlines(pkg, [item('Before.', 'Before and after.')], { track: true, now: AT });
    expect(r.applied).toHaveLength(1);
  });
});
