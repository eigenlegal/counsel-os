import { describe, expect, test } from 'bun:test';
import { isKnowledgePath, normalizeVaultPath } from './knowledge-paths';
import type { VaultConfig } from './resolve-root';

const defaults: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters' };

describe('normalizeVaultPath', () => {
  test('strips a leading ./', () => {
    expect(normalizeVaultPath('./practice/x.md')).toBe('practice/x.md');
  });

  test('collapses a doubled leading slash', () => {
    expect(normalizeVaultPath('.//practice/x.md')).toBe('practice/x.md');
  });

  test('resolves internal .. segments that stay inside the vault', () => {
    expect(normalizeVaultPath('matters/../practice/x.md')).toBe('practice/x.md');
    expect(normalizeVaultPath('matters/../matters/a.md')).toBe('matters/a.md');
  });

  test('rejects an absolute path', () => {
    expect(() => normalizeVaultPath('/etc/passwd')).toThrow(/outside vault/);
  });

  test('rejects a path that escapes the vault root', () => {
    expect(() => normalizeVaultPath('../etc/passwd')).toThrow(/outside vault/);
    expect(() => normalizeVaultPath('..')).toThrow(/outside vault/);
  });

  test('leaves an already-normal path alone', () => {
    expect(normalizeVaultPath('practice/standards/x.md')).toBe('practice/standards/x.md');
  });

  test('rejects a backslash-separated path outright, rather than treating it as one opaque segment', () => {
    // On a Windows host, `FsVaultStore.abs()` uses `path.win32` and would
    // resolve `practice\x.md` *inside* `practice/` — but `posix.normalize`
    // here would see it as a single filename, invisible to the `practice/`
    // prefix check. Rejecting backslashes outright keeps the two in
    // agreement on every host OS.
    expect(() => normalizeVaultPath('practice\\x.md')).toThrow(/backslash/);
    expect(() => normalizeVaultPath('practice\\standards\\x.md')).toThrow(/backslash/);
    expect(() => normalizeVaultPath('a\\b.md')).toThrow(/backslash/);
  });
});

describe('isKnowledgePath', () => {
  test('practice/ is a knowledge path', () => {
    expect(isKnowledgePath('practice/standards/x.md', defaults)).toBe(true);
  });

  test('memory/ is a knowledge path', () => {
    expect(isKnowledgePath('memory/decisions.md', defaults)).toBe(true);
  });

  test('law/ is a knowledge path', () => {
    expect(isKnowledgePath('law/gdpr/breach-notification.md', defaults)).toBe(true);
  });

  test('matters/ is not a knowledge path', () => {
    expect(isKnowledgePath('matters/acme/notes.md', defaults)).toBe(false);
  });

  test('the default entities/ path is a knowledge path', () => {
    expect(isKnowledgePath('entities/acme.md', defaults)).toBe(true);
  });

  test('an overridden entities_path is honored as a knowledge path', () => {
    expect(isKnowledgePath('clients/acme.md', { entitiesPath: 'clients', mattersPath: 'matters' })).toBe(true);
  });

  test('the default entities/ path is not a knowledge path once overridden away', () => {
    expect(isKnowledgePath('entities/acme.md', { entitiesPath: 'clients', mattersPath: 'matters' })).toBe(false);
  });

  test('an unrelated top-level path is not a knowledge path', () => {
    expect(isKnowledgePath('README.md', defaults)).toBe(false);
  });

  test('a name that merely starts with a knowledge prefix is not matched', () => {
    // "lawsuit-tracker.md" begins with "law" but is not under "law/".
    expect(isKnowledgePath('lawsuit-tracker.md', defaults)).toBe(false);
  });

  test('a spelled-around path is normalized before the prefix check', () => {
    expect(isKnowledgePath('./practice/standards/x.md', defaults)).toBe(true);
    expect(isKnowledgePath('matters/../practice/x.md', defaults)).toBe(true);
    expect(isKnowledgePath('matters/../matters/a.md', defaults)).toBe(false);
  });

  test('a backslash-separated path throws instead of silently reading as "not a knowledge path"', () => {
    expect(() => isKnowledgePath('practice\\standards\\x.md', defaults)).toThrow(/backslash/);
  });
});

describe('isKnowledgePath — case', () => {
  test('a knowledge path spelled with capitals is still a knowledge path', () => {
    // On APFS `Practice/standards/x.md` IS `practice/standards/x.md`, so a
    // case-sensitive prefix test would be a way around the `remember` gate.
    const cfg = { entitiesPath: 'entities', mattersPath: 'matters' };
    expect(isKnowledgePath('Practice/standards/x.md', cfg)).toBe(true);
    expect(isKnowledgePath('MEMORY/notes.md', cfg)).toBe(true);
    expect(isKnowledgePath('Entities/acme.md', cfg)).toBe(true);
    expect(isKnowledgePath('Matters/acme/draft.md', cfg)).toBe(false);
  });
});
