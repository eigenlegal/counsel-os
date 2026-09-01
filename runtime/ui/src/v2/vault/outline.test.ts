import { describe, expect, test } from 'bun:test';
import { outlineOf, stripCritic } from './outline';

describe('outlineOf', () => {
  test('H2s in order; H1s and H3s are not sections', () => {
    expect(outlineOf('# Title\n## Background\ntext\n### sub\n## Next steps\n')).toEqual(['Background', 'Next steps']);
  });

  test('a ## inside a fence is code, not a section', () => {
    expect(outlineOf('## Real\n```\n## fake\n```\n## Also real\n')).toEqual(['Real', 'Also real']);
  });

  test('no H2s, no outline', () => {
    expect(outlineOf('just prose\n')).toEqual([]);
  });

  test('a converted Word document\'s tracked changes do not leak into the outline', () => {
    expect(outlineOf('## {++No ++}Residuals\n## Term{-- (old)--}\n## Notice{>>why<<}\n## {~~two~>one~~} year\n')).toEqual([
      'No Residuals',
      'Term',
      'Notice',
      'one year',
    ]);
  });
});

describe('stripCritic', () => {
  test('keeps insertions, drops deletions and comments, resolves substitutions', () => {
    expect(stripCritic('{++a++} b {--c--} {>>d<<} {~~e~>f~~}')).toBe('a b f');
    expect(stripCritic('plain')).toBe('plain');
  });
});
