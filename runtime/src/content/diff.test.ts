import { describe, expect, test } from 'bun:test';
import { MAX_LINES, unifiedDiff } from './diff';

const labels = { from: 'received', to: 'shipped' };

describe('unifiedDiff', () => {
  test('equal texts diff to nothing', () => {
    expect(unifiedDiff('a\nb\n', 'a\nb\n', labels)).toBe('');
  });

  test('one changed line, with three lines of context and unified headers', () => {
    const a = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].join('\n') + '\n';
    const b = ['1', '2', '3', '4', 'five', '6', '7', '8', '9'].join('\n') + '\n';
    expect(unifiedDiff(a, b, labels)).toBe(
      ['--- received', '+++ shipped', '@@ -2,7 +2,7 @@', ' 2', ' 3', ' 4', '-5', '+five', ' 6', ' 7', ' 8', ''].join('\n'),
    );
  });

  test('two far-apart changes make two hunks; an addition at the end is its own hunk', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
    const a = lines.join('\n') + '\n';
    const b = [...lines.map((l, i) => (i === 1 ? 'changed 2' : l)), 'line 21'].join('\n') + '\n';
    const diff = unifiedDiff(a, b, labels);
    expect(diff.match(/^@@/gm)).toHaveLength(2);
    expect(diff).toContain('-line 2\n+changed 2');
    expect(diff).toContain('+line 21');
  });

  test('a deletion of everything, and an addition from nothing', () => {
    expect(unifiedDiff('x\n', '', labels)).toBe('--- received\n+++ shipped\n@@ -1,1 +0,0 @@\n-x\n');
    expect(unifiedDiff('', 'x\n', labels)).toBe('--- received\n+++ shipped\n@@ -0,0 +1,1 @@\n+x\n');
  });

  test('a file past the cap is a marker, not a quadratic table', () => {
    const big = Array.from({ length: MAX_LINES + 1 }, (_, i) => `l${i}`).join('\n');
    expect(unifiedDiff(big, big + '\nmore', labels)).toContain('@@ diff too large');
  });
});
