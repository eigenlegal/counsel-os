import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectLocations, isWritablePath, probeProviders } from './detect';

function home(): string {
  return mkdtempSync(join(tmpdir(), 'detect-home-'));
}

function mark(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'config.md'), `counsel-os-config: true\nlegal_root: ${root}\n`);
}

describe('detectLocations', () => {
  test('an empty machine: the default new folder, suggested', () => {
    const h = home();
    const rows = detectLocations({ home: h, env: {} });
    expect(rows).toEqual([{ path: join(h, 'Documents', 'Counsel OS'), kind: 'new', exists: false, writable: true, suggested: true }]);
  });

  test('a planted Obsidian vault and a marked root, plus the default; the one root is suggested', () => {
    const h = home();
    mkdirSync(join(h, 'Documents', 'Notes', '.obsidian'), { recursive: true });
    mark(join(h, 'legal'));
    const rows = detectLocations({ home: h, env: {} });
    expect(rows.map(r => [r.kind, r.path, r.suggested])).toEqual([
      ['existing-root', join(h, 'legal'), true],
      ['obsidian-vault', join(h, 'Documents', 'Notes', 'Counsel OS'), false],
      ['new', join(h, 'Documents', 'Counsel OS'), false],
    ]);
    expect(rows[1]!.within).toBe(join(h, 'Documents', 'Notes'));
    expect(rows[1]!.exists).toBe(false);
  });

  test('an Obsidian vault that already holds a marked Counsel OS folder is listed once, as the root', () => {
    const h = home();
    mkdirSync(join(h, 'Documents', 'Notes', '.obsidian'), { recursive: true });
    mark(join(h, 'Documents', 'Notes', 'Counsel OS'));
    const rows = detectLocations({ home: h, env: {} });
    expect(rows.filter(r => r.path === join(h, 'Documents', 'Notes', 'Counsel OS'))).toHaveLength(1);
    expect(rows[0]!.kind).toBe('existing-root');
  });

  test('two marked roots: neither is suggested; the new folder is', () => {
    const h = home();
    mark(join(h, 'legal'));
    mark(join(h, 'counsel-os'));
    const rows = detectLocations({ home: h, env: {} });
    expect(rows.filter(r => r.kind === 'existing-root')).toHaveLength(2);
    expect(rows.find(r => r.suggested)?.kind).toBe('new');
  });

  test('the pointer and COUNSEL_OS_LEGAL_ROOT count, in that home', () => {
    const h = home();
    const elsewhere = mkdtempSync(join(tmpdir(), 'detect-elsewhere-'));
    mark(join(elsewhere, 'vault'));
    mkdirSync(join(h, '.counsel-os'), { recursive: true });
    writeFileSync(join(h, '.counsel-os', 'legal-root'), join(elsewhere, 'vault'));
    expect(detectLocations({ home: h, env: {} })[0]).toMatchObject({ kind: 'existing-root', path: join(elsewhere, 'vault'), suggested: true });
    const viaEnv = mkdtempSync(join(tmpdir(), 'detect-env-'));
    mark(viaEnv);
    expect(detectLocations({ home: home(), env: { COUNSEL_OS_LEGAL_ROOT: viaEnv } })[0]!.path).toBe(viaEnv);
  });

  test('isWritablePath looks at the nearest existing ancestor', () => {
    const h = home();
    expect(isWritablePath(join(h, 'a', 'b', 'c'))).toBe(true);
    expect(isWritablePath('/nonexistent-root-dir-xyz/a')).toBe(false);
  });
});

describe('probeProviders', () => {
  const okTags = (models: string[]) => async () => new Response(JSON.stringify({ models: models.map(name => ({ name })) }), { status: 200 });

  test('claude installed + signed in, codex absent, ollama running with three models', async () => {
    const rows = await probeProviders({
      which: name => (name === 'claude' ? '/usr/local/bin/claude' : null),
      exists: path => path.endsWith('.credentials.json'),
      readText: () => null,
      fetch: okTags(['gemma4:e4b', 'llama3.3', 'qwen']) as unknown as typeof fetch,
      home: '/h',
      env: {},
    });
    expect(rows.map(r => [r.vendor, r.state, r.usable])).toEqual([
      ['Claude', 'signed in', true],
      ['ChatGPT', 'not installed', false],
      ['Ollama', 'running · 3 models', true],
    ]);
    expect(rows[2]!.models).toEqual(['gemma4:e4b', 'llama3.3', 'qwen']);
    expect(rows[0]!.id).toBe('claude-sub/claude-opus-5');
  });

  test('claude installed with a .claude.json that names no account is "not signed in"; without any file the state is just "installed"', async () => {
    const noAccount = await probeProviders({ which: n => (n === 'claude' ? '/x' : null), exists: () => false, readText: p => (p.endsWith('.claude.json') ? '{"theme":"dark"}' : null), fetch: (async () => { throw new Error('refused'); }) as unknown as typeof fetch, home: '/h', env: {} });
    expect(noAccount[0]).toMatchObject({ state: 'installed · not signed in', signedIn: false, usable: false });
    const unknown = await probeProviders({ which: n => (n === 'claude' ? '/x' : null), exists: () => false, readText: () => null, fetch: (async () => { throw new Error('refused'); }) as unknown as typeof fetch, home: '/h', env: {} });
    expect(unknown[0]).toMatchObject({ state: 'installed', signedIn: null, usable: true });
    const account = await probeProviders({ which: n => (n === 'claude' ? '/x' : null), exists: () => false, readText: p => (p.endsWith('.claude.json') ? '{"oauthAccount":{"emailAddress":"x"}}' : null), fetch: (async () => { throw new Error('refused'); }) as unknown as typeof fetch, home: '/h', env: {} });
    expect(account[0]!.state).toBe('signed in');
  });

  test('codex signed in through its auth.json (CODEX_HOME honoured); ollama installed but not running', async () => {
    const rows = await probeProviders({
      which: name => (name === 'codex' || name === 'ollama' ? '/x' : null),
      exists: path => path === '/codex-home/auth.json',
      readText: () => null,
      fetch: (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch,
      home: '/h',
      env: { CODEX_HOME: '/codex-home' },
    });
    expect(rows[1]).toMatchObject({ vendor: 'ChatGPT', state: 'signed in', usable: true });
    expect(rows[2]).toMatchObject({ vendor: 'Ollama', state: 'not running', usable: false, models: [] });
  });

  test('a slow Ollama is "not running", not a hang', async () => {
    const started = Date.now();
    const rows = await probeProviders({
      which: () => null,
      exists: () => false,
      readText: () => null,
      fetch: ((_: string, init?: RequestInit) => new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch,
      home: '/h',
      env: {},
      timeoutMs: 50,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(rows[2]!.state).toBe('not installed');
  });
});
