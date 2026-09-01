import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../chat/turns';
import { isEmptyResult, pathOf, stateOf, verbFor, workLineOf } from './verbs';

function tool(name: string, input: unknown = {}): ToolCallView {
  return { id: `${name}-1`, name, input, hasResult: true };
}

describe('verbFor', () => {
  test('the table', () => {
    expect(verbFor(tool('vault_read', { path: 'matters/acme.md' }))).toEqual({ verb: 'Read', object: 'matters/acme.md' });
    expect(verbFor(tool('vault_list', { dir: 'matters' }))).toEqual({ verb: 'Listed', object: 'matters' });
    expect(verbFor(tool('vault_search', { query: 'cap' }))).toEqual({ verb: 'Searched the vault for', object: 'cap' });
    expect(verbFor(tool('read_primitive', { name: 'evaluate' }))).toEqual({ verb: 'Consulted primitive', object: 'evaluate' });
    expect(verbFor(tool('propose_update', { path: 'practice/x.md', content: '' }))).toEqual({ verb: 'Proposed', object: 'practice/x.md' });
    expect(verbFor(tool('vault_write', { path: 'a.md' }))).toEqual({ verb: 'Wrote', object: 'a.md' });
  });

  test('grep-like names are searches; scripts are Ran; anything else is Called <name> (cou-93 item 2)', () => {
    expect(verbFor(tool('vault_grep', { pattern: 'x' })).verb).toBe('Searched');
    expect(verbFor(tool('web_fetch', { url: 'https://x' }))).toEqual({ verb: 'Called web_fetch' });
    expect(verbFor(tool('docket_sweep', { root: '.' })).verb).toBe('Ran docket_sweep');
  });

  test('the root listing reads as the vault, not as a dot', () => {
    expect(verbFor(tool('vault_list', { dir: '.' }))).toEqual({ verb: 'Listed the vault' });
    expect(verbFor(tool('vault_list', {}))).toEqual({ verb: 'Listed the vault' });
  });

  test('the Word read path reads as file verbs, and their paths open the reader', () => {
    expect(verbFor(tool('docx_read', { path: 'matters/acme/nda.docx' }))).toEqual({ verb: 'Read', object: 'matters/acme/nda.docx' });
    expect(verbFor(tool('extract_redlines', { path: 'matters/acme/nda-redline.docx' })).verb).toBe('Extracted changes from');
    expect(verbFor(tool('check_document', { path: 'matters/acme/nda.docx' })).verb).toBe('Checked');
    expect(pathOf(tool('docx_read', { path: 'matters/acme/nda.docx' }))).toBe('matters/acme/nda.docx');
    expect(pathOf(tool('check_document', { path: 'matters/acme/nda.docx' }))).toBe('matters/acme/nda.docx');
  });

  test('a nameless tool never reads as Ran <argument>', () => {
    // Threads persisted before the harness named its results (cou-78).
    expect(verbFor(tool('', { dir: '.' })).verb).toBe('Called a tool');
  });

  test('a non-object input has no object', () => {
    expect(verbFor(tool('vault_read', 'matters/acme.md'))).toEqual({ verb: 'Read' });
  });
});

describe('pathOf', () => {
  test('only file verbs carry a path', () => {
    expect(pathOf(tool('vault_read', { path: 'a.md' }))).toBe('a.md');
    expect(pathOf(tool('propose_update', { path: 'a.md' }))).toBe('a.md');
    expect(pathOf(tool('vault_search', { path: 'a.md' }))).toBeNull();
    expect(pathOf(tool('vault_read', {}))).toBeNull();
  });
});

describe('isEmptyResult', () => {
  test('an answer of nothing, in every shape a tool returns it', () => {
    expect(isEmptyResult([])).toBe(true);
    expect(isEmptyResult({})).toBe(true);
    expect(isEmptyResult('')).toBe(true);
    expect(isEmptyResult('   ')).toBe(true);
    expect(isEmptyResult(null)).toBe(true);
    expect(isEmptyResult(undefined)).toBe(true);
  });

  test('an answer of something is not empty — including a falsy one', () => {
    expect(isEmptyResult([{ path: 'a.md' }])).toBe(false);
    expect(isEmptyResult({ content: '' })).toBe(false);
    expect(isEmptyResult('found')).toBe(false);
    expect(isEmptyResult(0)).toBe(false);
    expect(isEmptyResult(false)).toBe(false);
  });
});

describe('stateOf', () => {
  test('running, error, empty, ok — in that order of precedence', () => {
    expect(stateOf({ ...tool('vault_search'), hasResult: false })).toBe('running');
    expect(stateOf({ ...tool('vault_search'), isError: true, output: [] })).toBe('error');
    expect(stateOf({ ...tool('vault_search'), output: [] })).toBe('empty');
    expect(stateOf({ ...tool('vault_read'), output: '# Acme' })).toBe('ok');
  });
});

describe('workLineOf', () => {
  test('folds a turn into one line of parts', () => {
    const parts = workLineOf([
      tool('vault_search', { query: 'residuals' }),
      tool('vault_read', { path: 'practice/standards/nda.md' }),
      tool('vault_read', { path: 'matters/acme-nda.md' }),
      tool('vault_read', { path: 'practice/standards/nda.md' }),
      tool('propose_update', { path: 'practice/standards/nda.md', content: '' }),
      tool('web_fetch', { url: 'https://x' }),
    ]);
    expect(parts).toEqual({ searched: true, listed: false, read: ['nda.md', 'acme-nda.md'], proposed: 1, other: 1 });
  });

  test('two read files sharing a basename keep their parent, so neither hides', () => {
    const parts = workLineOf([
      tool('vault_read', { path: 'practice/standards/nda.md' }),
      tool('vault_read', { path: 'matters/acme/nda.md' }),
      tool('vault_read', { path: 'memory/decisions.md' }),
    ]);
    expect(parts.read).toEqual(['standards/nda.md', 'acme/nda.md', 'decisions.md']);
  });

  test('nothing ran, nothing to say', () => {
    expect(workLineOf([])).toEqual({ searched: false, listed: false, read: [], proposed: 0, other: 0 });
  });
});

describe('apply_redlines on the step line', () => {
  test('reads as Redlined <original>, and the line opens that file', () => {
    const t = tool('apply_redlines', { original: 'matters/acme/nda.docx', items: [], track: true });
    expect(verbFor(t)).toEqual({ verb: 'Redlined', object: 'matters/acme/nda.docx' });
    expect(pathOf(t)).toBe('matters/acme/nda.docx');
  });
});
