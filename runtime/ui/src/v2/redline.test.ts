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
