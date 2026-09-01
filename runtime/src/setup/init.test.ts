import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { repoContentSource } from '../content/repo';
import { defaultVault, expandHome, parseInitArgs, runInit } from './init';

const REPO = resolve(import.meta.dir, '../../..');

describe('parseInitArgs', () => {
  test('maps flags onto a plan, defaulting the vault to ~/Documents/Counsel OS', () => {
    const { plan, missing } = parseInitArgs({ name: 'Jack', role: 'solo' }, { home: '/Users/jack' });
    expect(missing).toEqual([]);
    expect(plan.vault).toBe('/Users/jack/Documents/Counsel OS');
    expect(plan.identity).toEqual({ name: 'Jack', organization: '', role: 'solo', jurisdiction: '' });
    expect(plan.sampleMatter).toBe(true);
    expect(plan.git).toBe(true);
    expect(plan.defaultProvider).toBeUndefined();
  });

  test('expands ~, honours --no-git, --default-provider, --sample-matter', () => {
    const { plan } = parseInitArgs({ vault: '~/legal', name: 'J', role: 'in-house', 'no-git': true, 'default-provider': 'ollama/gemma4:e4b', 'sample-matter': false }, { home: '/h' });
    expect(plan.vault).toBe('/h/legal');
    expect(plan.git).toBe(false);
    expect(plan.defaultProvider).toBe('ollama/gemma4:e4b');
    expect(plan.sampleMatter).toBe(false);
  });

  test('names what is missing for a non-interactive run', () => {
    expect(parseInitArgs({}, { home: '/h' }).missing).toEqual(['name', 'role']);
    expect(parseInitArgs({ name: 'J', role: 'partner' }, { home: '/h' }).missing).toEqual(['role (in-house, outside, or solo)']);
  });

  test('expandHome and defaultVault', () => {
    expect(expandHome('~', '/h')).toBe('/h');
    expect(expandHome('~/x/y', '/h')).toBe('/h/x/y');
    expect(expandHome('/abs', '/h')).toBe('/abs');
    expect(defaultVault('/h')).toBe('/h/Documents/Counsel OS');
  });
});

describe('runInit', () => {
  const content = repoContentSource(REPO);

  function sink(): { text: string; write(t: string): void } {
    const s = { text: '', write(t: string) { s.text += t; } };
    return s;
  }

  test('--yes with the required flags seeds and prints the closing line', async () => {
    const base = mkdtempSync(join(tmpdir(), 'init-'));
    const out = sink();
    const code = await runInit(
      { yes: true, vault: join(base, 'vault'), name: 'Jack Wang', role: 'solo', 'no-git': true },
      { content, home: join(base, 'home'), pluginRoot: REPO, stdout: out, stderr: sink(), interactive: false },
    );
    expect(code).toBe(0);
    expect(out.text).toContain(`Created a Counsel OS vault at ${join(base, 'vault')}`);
    expect(out.text).toContain('196 law areas');
    expect(existsSync(join(base, 'vault', 'config.md'))).toBe(true);
    expect(readFileSync(join(base, 'home', 'legal-root'), 'utf8')).toBe(join(base, 'vault'));
  });

  test('--yes without a name is exit 2 and writes nothing', async () => {
    const base = mkdtempSync(join(tmpdir(), 'init-'));
    const err = sink();
    const code = await runInit({ yes: true, vault: join(base, 'vault') }, { content, home: join(base, 'home'), pluginRoot: REPO, stdout: sink(), stderr: err, interactive: false });
    expect(code).toBe(2);
    expect(err.text).toContain('missing name, role');
    expect(existsSync(join(base, 'vault'))).toBe(false);
  });

  test('a refused vault is exit 1 with the reason', async () => {
    const base = mkdtempSync(join(tmpdir(), 'init-'));
    const err = sink();
    const code = await runInit({ yes: true, vault: join(REPO, 'nope'), name: 'J', role: 'solo' }, { content, home: join(base, 'home'), pluginRoot: REPO, stdout: sink(), stderr: err, interactive: false });
    expect(code).toBe(1);
    expect(err.text).toContain('must not live inside the plugin tree');
  });

  test('interactive: asks only what the flags left out, and accepts role words loosely', async () => {
    const base = mkdtempSync(join(tmpdir(), 'init-'));
    const asked: string[] = [];
    const answers: Record<string, string> = {
      'Your name: ': 'Jane',
      'Your organization or firm (optional): ': '',
      'Your role (in-house / outside / solo): ': 'In House',
      'Primary jurisdiction (optional): ': 'NY',
    };
    const out = sink();
    const code = await runInit(
      { vault: join(base, 'vault'), practice: 'GC at a SaaS company', 'no-git': true },
      {
        content,
        home: join(base, 'home'),
        pluginRoot: REPO,
        stdout: out,
        stderr: sink(),
        interactive: true,
        ask: async prompt => {
          asked.push(prompt);
          return answers[prompt] ?? '';
        },
      },
    );
    expect(code).toBe(0);
    expect(asked).toEqual(Object.keys(answers));
    expect(readFileSync(join(base, 'vault', 'practice', 'profile.md'), 'utf8')).toContain('Jane, in-house counsel. In-house counsel for a SaaS / software company.');
  });

  test('the CLI: `init --yes` as a subprocess, with COUNSEL_OS_HOME isolated', async () => {
    const base = mkdtempSync(join(tmpdir(), 'init-cli-'));
    const proc = Bun.spawnSync(
      ['bun', join(REPO, 'runtime', 'src', 'cli.ts'), 'init', '--yes', '--vault', join(base, 'vault'), '--name', 'Jack', '--role', 'solo', '--no-git'],
      { env: { ...process.env, COUNSEL_OS_HOME: join(base, 'home') }, stdout: 'pipe', stderr: 'pipe' },
    );
    expect(new TextDecoder().decode(proc.stderr)).toBe('');
    expect(proc.exitCode).toBe(0);
    expect(new TextDecoder().decode(proc.stdout)).toContain('Created a Counsel OS vault');
    expect(existsSync(join(base, 'vault', 'law', 'corporate', 'governance.md'))).toBe(true);
    expect(existsSync(join(base, 'home', 'legal-root'))).toBe(true);
  });
});
