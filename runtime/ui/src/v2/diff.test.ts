import { describe, expect, test } from 'bun:test';
import { unifiedHunks } from './diff';

const EIGHT = 'a\nb\nc\nd\ne\nf\ng\nh\n';

describe('unifiedHunks', () => {
  test('identical text has no hunks', () => {
    expect(unifiedHunks(EIGHT, EIGHT)).toEqual([]);
  });

  test('one changed line gets three lines of context on each side', () => {
    const hunks = unifiedHunks(EIGHT, EIGHT.replace('e\n', 'E\n'));
    expect(hunks).toHaveLength(1);
    expect(hunks[0]).toEqual([
      { kind: 'ctx', text: 'b' },
      { kind: 'ctx', text: 'c' },
      { kind: 'ctx', text: 'd' },
      { kind: 'del', text: 'e' },
      { kind: 'add', text: 'E' },
      { kind: 'ctx', text: 'f' },
      { kind: 'ctx', text: 'g' },
      { kind: 'ctx', text: 'h' },
    ]);
  });

  test('changes far apart are separate hunks; near ones merge', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `l${i + 1}`);
    const before = lines.join('\n') + '\n';
    const far = before.replace('l3\n', 'L3\n').replace('l17\n', 'L17\n');
    expect(unifiedHunks(before, far)).toHaveLength(2);
    const near = before.replace('l3\n', 'L3\n').replace('l6\n', 'L6\n');
    expect(unifiedHunks(before, near)).toHaveLength(1);
  });

  test('a new file is one all-add hunk; a deleted line is a del', () => {
    expect(unifiedHunks('', 'x\ny\n')).toEqual([[{ kind: 'add', text: 'x' }, { kind: 'add', text: 'y' }]]);
    const hunk = unifiedHunks('a\nb\nc\n', 'a\nc\n')[0]!;
    expect(hunk).toEqual([
      { kind: 'ctx', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'ctx', text: 'c' },
    ]);
  });

  test('a file with no trailing newline keeps its last line', () => {
    expect(unifiedHunks('a\nb', 'a\nB')).toEqual([[{ kind: 'ctx', text: 'a' }, { kind: 'del', text: 'b' }, { kind: 'add', text: 'B' }]]);
  });
});
