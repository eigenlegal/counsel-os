import { describe, expect, test } from 'bun:test';
import { redlineBlocks, wordDiff } from './redline';

describe('wordDiff', () => {
  test('a one-word change is one del and one ins in the document order', () => {
    const spans = wordDiff('Term: 2 years\n', 'Term: 3 years\n');
    expect(spans.filter(s => s.kind === 'del').map(s => s.text.trim())).toEqual(['2']);
    expect(spans.filter(s => s.kind === 'ins').map(s => s.text.trim())).toEqual(['3']);
    // Round trip: same + dels reconstruct the before, same + ins the after.
    expect(spans.filter(s => s.kind !== 'ins').map(s => s.text).join('')).toBe('Term: 2 years\n');
    expect(spans.filter(s => s.kind !== 'del').map(s => s.text).join('')).toBe('Term: 3 years\n');
  });

  test('an addition against an empty before is all ins', () => {
    const spans = wordDiff('', '# NDA\nTerm: 3 years\n');
    expect(spans.every(s => s.kind === 'ins')).toBe(true);
  });
});

describe('redlineBlocks', () => {
  const before = 'Alpha stays.\n\nResiduals: not offered.\n\nOmega stays.\n';
  const after = 'Alpha stays.\n\nResiduals: not offered; fallback = narrow carve-out.\n\nOmega stays.\n';

  test('paragraph blocks, with only the touched one marked changed', () => {
    const blocks = redlineBlocks(wordDiff(before, after));
    expect(blocks.length).toBe(3);
    expect(blocks.map(b => b.changed)).toEqual([false, true, false]);
    expect(blocks[0]!.spans.map(s => s.text).join('')).toBe('Alpha stays.');
    expect(blocks[1]!.spans.some(s => s.kind === 'ins')).toBe(true);
  });

  test('a document that is one paragraph is one block', () => {
    const blocks = redlineBlocks(wordDiff('one line\n', 'one changed line\n'));
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.changed).toBe(true);
  });
});

describe('a change diffWords cannot see', () => {
  // `diffWords` ignores whitespace when it compares, so an edit that moves
  // NOTHING but whitespace produces no spans at all. Written down because a
  // reader who trusts the round trip above will otherwise assume a redline
  // with no marks means a file with no change — which is the one lie the
  // approval gate must never tell.
  const rows: [string, string, string][] = [
    ['a dropped trailing newline', 'Term: 2 years\n', 'Term: 2 years'],
    ['an added trailing newline', 'Term: 2 years', 'Term: 2 years\n'],
    ['CRLF normalised to LF', '# NDA\r\nTerm: 2 years\r\n', '# NDA\nTerm: 2 years\n'],
    ['a reflowed paragraph', 'a b\nc d\n', 'a b c d\n'],
  ];

  for (const [name, before, after] of rows) {
    test(`${name} reports no marks, and no changed block`, () => {
      expect(before).not.toBe(after);
      expect(wordDiff(before, after).filter(s => s.kind !== 'same')).toEqual([]);
      expect(redlineBlocks(wordDiff(before, after)).filter(b => b.changed)).toEqual([]);
      // The round trip the first describe asserts does NOT hold here: the
      // spans reconstruct the AFTER for both directions.
      expect(wordDiff(before, after).map(s => s.text).join('')).toBe(after);
    });
  }
});
