import { describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { repoContentSource } from '../content/repo';
import { SetupPlan } from './plan';
import { CONTENT_STATE, runSetup, SetupError, systemGit, type ContentState, type GitRunner } from './run';

const REPO = resolve(import.meta.dir, '../../..');
const content = repoContentSource(REPO);

function fixture(): { home: string; vault: string } {
  const base = mkdtempSync(join(tmpdir(), 'setup-'));
  return { home: join(base, 'home'), vault: join(base, 'Counsel OS') };
}

function plan(vault: string, extra: Record<string, unknown> = {}) {
  return SetupPlan.parse({
    vault,
    identity: { name: 'Jack Wang', organization: 'Eigen Legal', role: 'solo', jurisdiction: 'MA' },
    practice: 'commercial contracts',
    git: false,
    ...extra,
  });
}

/** A git that records calls and succeeds. */
function fakeGit(): { calls: string[][]; git: GitRunner } {
  const calls: string[][] = [];
  return {
    calls,
    git: args => {
      calls.push(args);
      return { ok: true, out: args[0] === 'config' ? '' : '' };
    },
  };
}

function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else n += 1;
  }
  return n;
}

describe('runSetup on a fresh vault', () => {
  test('writes what the setup skill writes, and records what it received', () => {
    const { home, vault } = fixture();
    const result = runSetup(plan(vault), { content, home, pluginRoot: REPO });

    expect(result.adopted).toBe(false);
    expect(result.groups.law).toEqual({ written: 196, skipped: 0 });
    expect(result.groups.standards).toEqual({ written: 25, skipped: 0 });
    expect(result.groups.methods).toEqual({ written: 36, skipped: 0 });
    expect(result.groups.library).toEqual({ written: 22, skipped: 0 });
    expect(result.groups.reference).toEqual({ written: 1, skipped: 0 });
    expect(result.groups.profile).toEqual({ written: 1, skipped: 0 });
    expect(result.groups.memory).toEqual({ written: 1, skipped: 0 });
    expect(result.groups.config).toEqual({ written: 1, skipped: 0 });
    expect(result.groups.gitignore).toEqual({ written: 1, skipped: 0 });
    expect(result.written).toBe(196 + 25 + 36 + 22 + 1 + 1 + 1 + 1 + 1);
    expect(result.git).toBe('skipped');
    expect(result.warnings).toEqual([]);

    // The marker the resolver looks for, verbatim.
    const config = readFileSync(join(vault, 'config.md'), 'utf8').split('\n');
    expect(config).toContain('counsel-os-config: true');
    expect(config).toContain(`legal_root: ${vault}`);
    // The per-machine pointer.
    expect(readFileSync(join(home, 'legal-root'), 'utf8')).toBe(vault);
    expect(statSync(join(home, 'legal-root')).mode & 0o777).toBe(0o600);
    // Structure.
    expect(readdirSync(join(vault, 'law')).sort()).toHaveLength(26);
    expect(existsSync(join(vault, 'law', 'corporate', 'governance.md'))).toBe(true);
    expect(existsSync(join(vault, 'law', 'FRONTMATTER.md'))).toBe(false);
    expect(countFiles(join(vault, 'practice', 'standards'))).toBe(25);
    expect(existsSync(join(vault, 'practice', 'reference', '_index.md'))).toBe(true);
    expect(readFileSync(join(vault, 'practice', 'profile.md'), 'utf8')).toContain('Jack Wang, solo practitioner at Eigen Legal');
    expect(readFileSync(join(vault, 'memory', 'patterns.md'), 'utf8').startsWith('---\ncounsel-os-type: memory-patterns\n---\n')).toBe(true);
    expect(statSync(join(vault, 'matters')).isDirectory()).toBe(true);
    expect(statSync(join(vault, 'entities')).isDirectory()).toBe(true);
    expect(readFileSync(join(vault, '.gitignore'), 'utf8')).toBe('.DS_Store\n*.tmp\n*~\n');

    const state = JSON.parse(readFileSync(join(vault, CONTENT_STATE), 'utf8')) as ContentState;
    expect(state.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.keys(state.files)).toHaveLength(196 + 25 + 36 + 22 + 1 + 1);
    expect(state.files['law/corporate/governance.md']).toEqual({ hash: expect.stringMatching(/^[0-9a-f]{64}$/), from: 'knowledge/law/corporate/governance.md' });
    expect(state.files['practice/profile.md']).toBeUndefined();
  });

  test('a second run is a no-op that skips everything it wrote', () => {
    const { home, vault } = fixture();
    runSetup(plan(vault), { content, home, pluginRoot: REPO });
    const profileBefore = statSync(join(vault, 'practice', 'profile.md')).mtimeMs;
    const again = runSetup(plan(vault, { identity: { name: 'Someone Else', role: 'outside' } }), { content, home, pluginRoot: REPO });
    expect(again.adopted).toBe(true);
    expect(again.written).toBe(0);
    expect(again.skipped).toBe(196 + 25 + 36 + 22 + 1 + 1 + 1 + 1 + 1);
    expect(statSync(join(vault, 'practice', 'profile.md')).mtimeMs).toBe(profileBefore);
    expect(readFileSync(join(vault, 'practice', 'profile.md'), 'utf8')).toContain('Jack Wang');
  });

  test('a run that died half way is finished by running again', () => {
    const { home, vault } = fixture();
    // Pretend: the config and three law areas landed, then the process died.
    mkdirSync(join(vault, 'law', 'corporate'), { recursive: true });
    writeFileSync(join(vault, 'config.md'), `# Counsel OS Configuration\n\ncounsel-os-config: true\nlegal_root: ${vault}\n`);
    writeFileSync(join(vault, 'law', 'corporate', 'governance.md'), 'USER EDITED\n');
    const result = runSetup(plan(vault), { content, home, pluginRoot: REPO });
    expect(result.adopted).toBe(true);
    expect(result.groups.config).toEqual({ written: 0, skipped: 1 });
    expect(result.groups.law).toEqual({ written: 195, skipped: 1 });
    expect(readFileSync(join(vault, 'law', 'corporate', 'governance.md'), 'utf8')).toBe('USER EDITED\n');
    // The skipped file was not "received" from this run.
    const state = JSON.parse(readFileSync(join(vault, CONTENT_STATE), 'utf8')) as ContentState;
    expect(state.files['law/corporate/governance.md']).toBeUndefined();
    expect(state.files['law/corporate/fiduciary-duties.md']).toBeDefined();
  });

  test('adopts a vault the plugin\'s setup skill created, keeping every user file', () => {
    const { home, vault } = fixture();
    mkdirSync(join(vault, 'practice', 'standards'), { recursive: true });
    writeFileSync(join(vault, 'config.md'), `counsel-os-config: true\nlegal_root: ${vault}\nmatters_path: work\n`);
    writeFileSync(join(vault, 'practice', 'profile.md'), '# Mine\n');
    writeFileSync(join(vault, 'practice', 'standards', 'confidentiality.md'), '# My position\n');
    const result = runSetup(plan(vault), { content, home, pluginRoot: REPO });
    expect(result.adopted).toBe(true);
    expect(readFileSync(join(vault, 'config.md'), 'utf8')).toContain('matters_path: work');
    expect(readFileSync(join(vault, 'practice', 'profile.md'), 'utf8')).toBe('# Mine\n');
    expect(readFileSync(join(vault, 'practice', 'standards', 'confidentiality.md'), 'utf8')).toBe('# My position\n');
    expect(result.groups.standards).toEqual({ written: 24, skipped: 1 });
  });
});

describe('runSetup refuses', () => {
  test('a vault inside the plugin tree', () => {
    const { home } = fixture();
    expect(() => runSetup(plan(join(REPO, 'knowledge', 'vault')), { content, home, pluginRoot: REPO })).toThrow(SetupError);
    try {
      runSetup(plan(join(REPO, 'x')), { content, home, pluginRoot: REPO });
    } catch (err) {
      expect((err as SetupError).reason).toBe('inside-plugin');
    }
    expect(existsSync(join(REPO, 'x'))).toBe(false);
  });

  test('a path that exists and is not a directory', () => {
    const { home, vault } = fixture();
    mkdirSync(join(vault, '..'), { recursive: true });
    writeFileSync(vault, 'a file');
    expect(() => runSetup(plan(vault), { content, home, pluginRoot: REPO })).toThrow('not a directory');
  });

  test('a directory whose config.md is not a Counsel OS config', () => {
    const { home, vault } = fixture();
    mkdirSync(vault, { recursive: true });
    writeFileSync(join(vault, 'config.md'), '# Something else\n');
    try {
      runSetup(plan(vault), { content, home, pluginRoot: REPO });
      throw new Error('did not throw');
    } catch (err) {
      expect((err as SetupError).reason).toBe('unmarked-config');
    }
    // Nothing was written next to the user's file.
    expect(readdirSync(vault)).toEqual(['config.md']);
  });

  test('a directory it cannot write', () => {
    if (process.getuid?.() === 0) return; // root writes anywhere
    const { home, vault } = fixture();
    mkdirSync(vault, { recursive: true });
    chmodSync(vault, 0o500);
    try {
      runSetup(plan(vault), { content, home, pluginRoot: REPO });
      throw new Error('did not throw');
    } catch (err) {
      expect((err as SetupError).reason).toBe('not-writable');
    } finally {
      chmodSync(vault, 0o700);
    }
  });
});

describe('runSetup extras', () => {
  test('records the default provider in providers.yaml without touching anything else in it', () => {
    const { home, vault } = fixture();
    mkdirSync(home, { recursive: true, mode: 0o700 });
    writeFileSync(join(home, 'providers.yaml'), 'stepTimeoutMs: 1000\n');
    runSetup(plan(vault, { defaultProvider: 'ollama/gemma4:e4b' }), { content, home, pluginRoot: REPO });
    const text = readFileSync(join(home, 'providers.yaml'), 'utf8');
    expect(text).toContain('default: ollama/gemma4:e4b');
    expect(text).toContain('stepTimeoutMs: 1000');
  });

  test('git: initialized through the runner, with a fallback identity when none is configured', () => {
    const { home, vault } = fixture();
    const { calls, git } = fakeGit();
    const result = runSetup(plan(vault, { git: true }), { content, home, pluginRoot: REPO, git });
    expect(result.git).toBe('initialized');
    expect(calls[0]).toEqual(['init', '-q']);
    expect(calls.some(c => c[0] === 'add')).toBe(true);
    const commit = calls.find(c => c.includes('commit'))!;
    expect(commit).toContain('user.name=Counsel OS');
    expect(commit).toContain('Initial Counsel OS knowledge base');
  });

  test('git: present is left alone, unavailable is reported, a failure is a warning not a crash', () => {
    const { home, vault } = fixture();
    expect(runSetup(plan(vault, { git: true }), { content, home, pluginRoot: REPO, git: null }).git).toBe('unavailable');
    mkdirSync(join(vault, '.git'), { recursive: true });
    const { calls, git } = fakeGit();
    expect(runSetup(plan(vault, { git: true }), { content, home, pluginRoot: REPO, git }).git).toBe('present');
    expect(calls).toEqual([]);

    const other = fixture();
    const failing: GitRunner = () => ({ ok: false, out: '' });
    const result = runSetup(plan(other.vault, { git: true }), { content, home: other.home, pluginRoot: REPO, git: failing });
    expect(result.git).toBe('failed');
    expect(result.warnings[0]).toContain('git init failed');
  });

  test('git: the real thing, when this machine has it', () => {
    const git = systemGit();
    if (git === null) return;
    const { home, vault } = fixture();
    const result = runSetup(plan(vault, { git: true }), { content, home, pluginRoot: REPO });
    expect(result.git).toBe('initialized');
    expect(existsSync(join(vault, '.git', 'HEAD'))).toBe(true);
    expect(git(['log', '--oneline'], vault).out).toContain('Initial Counsel OS knowledge base');
    // `.counsel/` rides along in the commit — a state file, but a vault's own.
    expect(git(['status', '--porcelain'], vault).out.trim()).toBe('');
  });
});
