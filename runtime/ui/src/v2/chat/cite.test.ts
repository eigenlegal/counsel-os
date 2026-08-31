import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../../chat/turns';
import { citationMap, markCitations, readPathsOf } from './cite';

function read(path: string): ToolCallView {
  return { id: `r-${path}`, name: 'vault_read', input: { path }, hasResult: true };
}

describe('readPathsOf', () => {
  test('unique vault_read paths, in first-read order; other tools ignored', () => {
    const tools: ToolCallView[] = [
      { id: 's', name: 'vault_search', input: { query: 'x' }, hasResult: true },
      read('practice/standards/nda.md'),
      read('matters/acme-nda.md'),
      read('practice/standards/nda.md'),
    ];
    expect(readPathsOf(tools)).toEqual(['practice/standards/nda.md', 'matters/acme-nda.md']);
  });
});

describe('citationMap', () => {
  test('a read file answers to its full path and to its basename', () => {
    const map = citationMap(['practice/standards/nda.md']);
    expect(map.get('practice/standards/nda.md')).toBe('practice/standards/nda.md');
    expect(map.get('nda.md')).toBe('practice/standards/nda.md');
  });

  test('a basename two read files share links nowhere — only the full paths do', () => {
    const map = citationMap(['practice/standards/nda.md', 'matters/acme/nda.md']);
    expect(map.get('nda.md')).toBeUndefined();
    expect(map.get('practice/standards/nda.md')).toBe('practice/standards/nda.md');
    expect(map.get('matters/acme/nda.md')).toBe('matters/acme/nda.md');
  });
});

describe('markCitations', () => {
  const spellings = new Set(citationMap(['practice/standards/nda.md']).keys());

  test('a code span naming a read file becomes a chip; anything else is untouched', () => {
    expect(markCitations('<p>see <code>nda.md</code></p>', spellings)).toBe(
      '<p>see <code class="v2-cite">nda.md</code></p>',
    );
    expect(markCitations('<p>see <code>other.md</code></p>', spellings)).toBe('<p>see <code>other.md</code></p>');
    // Prose that merely says the name is not a citation.
    expect(markCitations('<p>the nda.md file</p>', spellings)).toBe('<p>the nda.md file</p>');
  });

  test('a code span the document already dressed up cannot be a chip', () => {
    // The allowlist strips every attribute, so this shape never reaches the
    // page — but the pattern refuses it anyway rather than trusting that.
    const forged = '<p><code class="v2-cite">secret.md</code></p>';
    expect(markCitations(forged, spellings)).toBe(forged);
  });

  test('nothing was read, nothing is marked', () => {
    expect(markCitations('<p><code>nda.md</code></p>', new Set())).toBe('<p><code>nda.md</code></p>');
  });

  test('an escaped name matches the file it spells, and no markup is interpolated', () => {
    const odd = new Set(citationMap(['matters/a&b<c>.md']).keys());
    expect(markCitations('<p><code>a&amp;b&lt;c&gt;.md</code></p>', odd)).toBe(
      '<p><code class="v2-cite">a&amp;b&lt;c&gt;.md</code></p>',
    );
    // `&amp;lt;` is a literal "&lt;", not a tag: it must not decode twice.
    expect(markCitations('<p><code>&amp;lt;</code></p>', new Set(['<']))).toBe('<p><code>&amp;lt;</code></p>');
  });
});
