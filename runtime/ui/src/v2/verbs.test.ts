import { describe, expect, test } from 'bun:test';
import type { ToolCallView } from '../chat/turns';
import { isEmptyResult, pathOf, stateOf, summarize, verbFor } from './verbs';

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

describe('summarize', () => {
  test('counts reads, primitives and the rest', () => {
    expect(summarize([])).toBe('no tools');
    expect(summarize([tool('vault_read'), tool('vault_read'), tool('propose_update')])).toBe('read 2 files, ran 1 tool');
    expect(summarize([tool('vault_read')])).toBe('read 1 file');
    expect(summarize([tool('read_primitive'), tool('read_primitive'), tool('vault_list'), tool('vault_search')])).toBe(
      'consulted 2 primitives, ran 2 tools',
    );
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
