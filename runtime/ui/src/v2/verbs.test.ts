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
    expect(verbFor(tool('vault_search', { query: 'cap' }))).toEqual({ verb: 'Searched', object: 'cap' });
    expect(verbFor(tool('read_primitive', { name: 'evaluate' }))).toEqual({ verb: 'Consulted primitive', object: 'evaluate' });
    expect(verbFor(tool('propose_update', { path: 'practice/x.md', content: '' }))).toEqual({ verb: 'Proposed', object: 'practice/x.md' });
    expect(verbFor(tool('vault_write', { path: 'a.md' }))).toEqual({ verb: 'Wrote', object: 'a.md' });
  });

  test('grep-like names are searches; anything else is Ran <name>', () => {
    expect(verbFor(tool('vault_grep', { pattern: 'x' })).verb).toBe('Searched');
    expect(verbFor(tool('web_fetch', { url: 'https://x' }))).toEqual({ verb: 'Ran web_fetch' });
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

  test('nothing ran, nothing to say', () => {
    expect(workLineOf([])).toEqual({ searched: false, listed: false, read: [], proposed: 0, other: 0 });
  });
});
