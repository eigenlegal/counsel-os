import { describe, expect, test } from 'bun:test';
import { applyRedlines, paragraphEditText } from './redline';
import { cleanProposal } from './clean-proposal';
import { attr, children, descendants, isW, modelOf, textOf, W_NS } from './model';
import { openDocx, serialize } from './package';
import { buildDocx, type RunSpec } from './test/builder';

const rels = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/old-terms" TargetMode="External"/></Relationships>';
function fixture(runs: Array<string | RunSpec>) {
  return buildDocx({ blocks: [{ runs }], rawParts: { 'word/_rels/document.xml.rels': rels } });
}
function views(bytes: Uint8Array) {
  const pkg = openDocx(bytes), paragraphs = modelOf(pkg).paragraphs;
  return { pkg, accept: paragraphs.map(p => textOf(p, 'accept')), reject: paragraphs.map(p => textOf(p, 'reject')) };
}
describe('tracked hyperlink edits', () => {
  const cases = [
    { name: 'within a hyperlink', before: '', link: 'old terms apply', after: '', current: 'old terms apply', proposed: 'new terms apply' },
    { name: 'across the start of a hyperlink', before: 'See the ', link: 'old terms', after: ' today.', current: 'the old', proposed: 'our new' },
    { name: 'across the end of a hyperlink', before: 'See ', link: 'old terms', after: ' today.', current: 'terms today', proposed: 'rules tomorrow' },
    { name: 'across an entire hyperlink', before: 'See ', link: 'old terms', after: ' today.', current: 'See old terms today.', proposed: 'Use the signed schedule.' },
    { name: 'pure insertion within a hyperlink', before: '', link: 'terms apply', after: '', current: 'terms apply', proposed: 'terms always apply' },
    { name: 'pure deletion within a hyperlink', before: '', link: 'old terms apply', after: '', current: 'old terms apply', proposed: 'terms apply' },
    { name: 'two minimal regions within a hyperlink', before: '', link: 'Payment in 30 days; notice in 10 days.', after: '', current: 'Payment in 30 days; notice in 10 days.', proposed: 'Payment in 45 days; notice in 20 days.' },
    { name: 'replacement URL does not retain the old destination', before: '', link: 'https://example.com/old-terms', after: '', current: 'https://example.com/old-terms', proposed: 'https://example.com/new-terms' },
  ];
  for (const c of cases) test(c.name, () => {
    const original = fixture([c.before, { text: c.link, hyperlink: 'rId9', bold: true }, c.after]);
    const pkg = openDocx(original), originalText = c.before + c.link + c.after;
    const result = applyRedlines(pkg, [{ current: c.current, proposed: c.proposed, comment: 'Requested change.' }], { track: true, defaultAuthor: 'Synthetic Counsel' });
    expect(result.skipped).toEqual([]); expect(result.warnings).toEqual([]);
    const saved = pkg.save(), out = views(saved);
    expect(out.accept).toEqual([originalText.replace(c.current, c.proposed)]);
    expect(out.reject).toEqual([originalText]);
    expect(paragraphEditText(modelOf(out.pkg).paragraphs[0]!.element)).toBe(out.accept[0]!);
    const revisions = [...descendants(out.pkg.document.documentElement!)].filter(e => isW(e, 'ins') || isW(e, 'del'));
    expect(new Set(revisions.map(e => attr(e, 'id'))).size).toBe(revisions.length);
    for (const revision of revisions) {
      expect(attr(revision, 'author')).toBe('Synthetic Counsel');
      expect(isW(revision.parentNode, 'ins') || isW(revision.parentNode, 'del')).toBe(false);
      // All inserted text is plain: it must not misleadingly inherit an old URL.
      if (isW(revision, 'ins')) expect(isW(revision.parentNode, 'p')).toBe(true);
    }
    const links = [...descendants(out.pkg.document.documentElement!)].filter(e => isW(e, 'hyperlink'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every(e => e.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') === 'rId9')).toBe(true);
    expect(links.flatMap(e => [...descendants(e)]).some(e => isW(e, 'b'))).toBe(true);
    expect(out.pkg.partText('word/_rels/document.xml.rels')).toContain('https://example.com/old-terms');
    cleanProposal(openDocx(original), out.pkg, 'Synthetic Counsel');
    expect(views(out.pkg.save()).accept).toEqual(out.accept);
  });

  test('revisions within hyperlinks remain protected and refuse before mutation', () => {
    const pkg = openDocx(fixture([{ text: 'old terms', hyperlink: 'rId9' }]));
    const link = pkg.document.getElementsByTagNameNS(W_NS, 'hyperlink')[0]!;
    const ins = pkg.document.createElementNS(W_NS, 'w:ins');
    ins.setAttributeNS(W_NS, 'w:author', 'Earlier reviewer');
    ins.setAttributeNS(W_NS, 'w:id', '90');
    while (link.firstChild) ins.appendChild(link.firstChild);
    link.appendChild(ins);
    const before = serialize(pkg.document);
    const report = applyRedlines(pkg, [{ current: 'old terms', proposed: 'new terms' }], { track: true });
    expect(report.skipped[0]!.reason).toContain('existing tracked insertion');
    expect(serialize(pkg.document)).toBe(before);
  });

  test('edits spanning multiple links preserve each target and intervening bookmarks', () => {
    const pkg = openDocx(fixture(['Start ', { text: 'first link', hyperlink: 'rId9' }, ' and ', { text: 'second link', hyperlink: 'rId10' }, ' end.']));
    const p = modelOf(pkg).paragraphs[0]!.element;
    const marker = pkg.document.createElementNS(W_NS, 'w:bookmarkStart');
    marker.setAttributeNS(W_NS, 'w:id', '3'); marker.setAttributeNS(W_NS, 'w:name', 'Kept');
    p.insertBefore(marker, children(p).find(e => isW(e, 'hyperlink'))!);
    const result = applyRedlines(pkg, [{ current: 'Start first link and second link end.', proposed: 'Use the signed terms.' }], { track: true });
    expect(result.skipped).toEqual([]);
    const out = views(pkg.save());
    expect(out.accept).toEqual(['Use the signed terms.']);
    expect(out.reject).toEqual(['Start first link and second link end.']);
    expect(out.pkg.document.getElementsByTagNameNS(W_NS, 'bookmarkStart')).toHaveLength(1);
    expect(new Set([...descendants(out.pkg.document.documentElement!)].filter(e => isW(e, 'hyperlink')).map(e => e.getAttribute('r:id')))).toEqual(new Set(['rId9', 'rId10']));
  });
});

describe('native list label matching', () => {
  test('exact displayed bullets edit only paragraph text, preserving numbering and reject view', () => {
    const pkg = openDocx(buildDocx({ blocks: [{ numId: '1', runs: ['Uptime: 99.9%'] }], numbering: { '1': [{ numFmt: 'bullet', lvlText: '•' }] } }));
    const numbering = pkg.partBytes('word/numbering.xml').slice();
    const result = applyRedlines(pkg, [{ current: '- Uptime: 99.9%', proposed: '- Uptime: 99.95% each month.' }], { track: true });
    expect(result.applied).toHaveLength(1);
    const out = views(pkg.save());
    expect(out.accept).toEqual(['Uptime: 99.95% each month.']); expect(out.reject).toEqual(['Uptime: 99.9%']);
    expect(modelOf(out.pkg).paragraphs[0]!.numberLabel).toBe('•');
    expect(out.pkg.partBytes('word/numbering.xml')).toEqual(numbering);
  });
  test('does not guess bullet labels, partial matches, or ambiguous whole paragraphs', () => {
    for (const blocks of [[{ runs: ['Uptime: 99.9%'] }], [{ numId: '1', runs: ['Uptime: 99.9% monthly'] }], [{ numId: '1', runs: ['Uptime: 99.9%'] }, { numId: '1', runs: ['Uptime: 99.9%'] }]]) {
      const pkg = openDocx(buildDocx({ blocks, numbering: { '1': [{ numFmt: 'bullet', lvlText: '•' }] } }));
      const report = applyRedlines(pkg, [{ current: '- Uptime: 99.9%', proposed: '- Uptime: 99.95%' }], { track: true });
      expect(report.applied).toEqual([]); expect(report.skipped).toHaveLength(1);
    }
  });
});
