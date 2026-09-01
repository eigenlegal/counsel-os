import { describe, expect, test } from 'bun:test';
import { computeReplacementRegions, sequenceOpcodes, tokenize } from './diff';

describe('tokenize', () => {
  test("Python's \\w+|\\s+|[^\\w\\s]+ on a str", () => {
    expect(tokenize('Pay $1,500,000 in 30 days.')).toEqual(['Pay', ' ', '$', '1', ',', '500', ',', '000', ' ', 'in', ' ', '30', ' ', 'days', '.']);
    expect(tokenize('naïve—yes')).toEqual(['naïve', '—', 'yes']);
    expect(tokenize('')).toEqual([]);
  });
});

describe('sequenceOpcodes', () => {
  test('equal, replace, insert, delete — the difflib opcodes', () => {
    const a = tokenize('Payment is due within 30 days of invoice.');
    const b = tokenize('Payment is due within 45 days of invoice.');
    expect(sequenceOpcodes(a, b)).toEqual([
      { tag: 'equal', a1: 0, a2: 8, b1: 0, b2: 8 },
      { tag: 'replace', a1: 8, a2: 9, b1: 8, b2: 9 },
      { tag: 'equal', a1: 9, a2: 16, b1: 9, b2: 16 },
    ]);
  });

  test('a repeated token: the longest block wins, ties to the earliest start', () => {
    // difflib: SequenceMatcher(None, list('abab'), list('bab')).get_opcodes()
    // == [('delete', 0, 1, 0, 0), ('equal', 1, 4, 0, 3)]
    expect(sequenceOpcodes(['a', 'b', 'a', 'b'], ['b', 'a', 'b'])).toEqual([
      { tag: 'delete', a1: 0, a2: 1, b1: 0, b2: 0 },
      { tag: 'equal', a1: 1, a2: 4, b1: 0, b2: 3 },
    ]);
    // ('equal',0,1,0,1), ('replace',1,2,1,2), ('equal',2,3,2,3)
    expect(sequenceOpcodes(['x', 'y', 'z'], ['x', 'q', 'z'])).toEqual([
      { tag: 'equal', a1: 0, a2: 1, b1: 0, b2: 1 },
      { tag: 'replace', a1: 1, a2: 2, b1: 1, b2: 2 },
      { tag: 'equal', a1: 2, a2: 3, b1: 2, b2: 3 },
    ]);
  });

  test('empty sides', () => {
    expect(sequenceOpcodes([], [])).toEqual([]);
    expect(sequenceOpcodes(['a'], [])).toEqual([{ tag: 'delete', a1: 0, a2: 1, b1: 0, b2: 0 }]);
    expect(sequenceOpcodes([], ['a'])).toEqual([{ tag: 'insert', a1: 0, a2: 0, b1: 0, b2: 1 }]);
  });
});

describe('computeReplacementRegions', () => {
  test('one number changes: one small strike, never the sentence', () => {
    expect(computeReplacementRegions('Payment is due within 30 days of invoice.', 'Payment is due within 45 days of invoice.')).toEqual([
      { start: 22, end: 24, insert: '45' },
    ]);
  });

  test('two separated changes yield two regions and the middle stays unmarked', () => {
    const cur = 'Payment is due within 30 days and the cure period is 10 days from notice.';
    const regions = computeReplacementRegions(cur, 'Payment is due within 45 days and the cure period is 20 days from notice.');
    expect(regions).toHaveLength(2);
    expect(regions.map(r => cur.slice(r.start, r.end))).toEqual(['30', '10']);
    expect(regions.map(r => r.insert)).toEqual(['45', '20']);
    const between = cur.slice(regions[0]!.end, regions[1]!.start);
    expect(between).toContain('cure period');
  });

  test('regions separated by whitespace-free equal text merge into one', () => {
    // difflib pairs the trailing `,000`; the `,000` insert lands at the end and the
    // whitespace-free gap merges it back: one strike of `1,500,000`, one insert.
    expect(computeReplacementRegions('$1,500,000', '$2,000,000')).toEqual([{ start: 1, end: 10, insert: '2,000,000' }]);
  });

  test('a pure insertion before the period keeps the period', () => {
    const cur = 'Provider shall maintain insurance.';
    expect(computeReplacementRegions(cur, 'Provider shall maintain insurance of at least $1,000,000.')).toEqual([
      { start: cur.length - 1, end: cur.length - 1, insert: ' of at least $1,000,000' },
    ]);
  });

  test('a pure deletion strikes everything; a no-op yields nothing', () => {
    expect(computeReplacementRegions('This clause is redundant.', '')).toEqual([{ start: 0, end: 25, insert: '' }]);
    expect(computeReplacementRegions('Same text.', 'Same text.')).toEqual([]);
  });

  test('"30" → "35" strikes 30, not a bare 0', () => {
    expect(computeReplacementRegions('within 30 days', 'within 35 days')).toEqual([{ start: 7, end: 9, insert: '35' }]);
  });
});
