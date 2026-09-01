import { beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSetup } from '../setup/run';
import { isShippedPath, type ContentSource } from './source';
import { applyUpdates, autoApplyLawUpdates, contentStatus, UpdateError } from './update';

/** An in-memory shipped tree, so a test can change "upstream" by mutating
 * one entry. */
function fakeSource(files: Record<string, string>): ContentSource & { files: Record<string, string> } {
  return {
    kind: 'repo',
    files,
    list: prefix => Object.keys(files).filter(p => isShippedPath(p) && (p === prefix || p.startsWith(`${prefix}/`))).sort(),
    has: path => path in files,
    readBytes: path => new TextEncoder().encode(files[path] ?? ''),
    read: path => {
      const text = files[path];
      if (text === undefined) throw new Error(`not shipped: ${path}`);
      return text;
    },
  };
}

const GDPR = '---\ncounsel-os-type: law-area\ncontent-version: "2026-06-11"\nlast-reviewed: "2026-06-11"\n---\n# GDPR\n\nArticle 33: 72 hours.\n';
const CCPA = '---\ncounsel-os-type: law-area\ncontent-version: "2026-06-11"\n---\n# CCPA\n\nBody.\n';
const CONF = '---\ncounsel-os-type: practice\ncontent-version: "2026-06-11"\n---\n# Confidentiality — Position\n\n## Our Position\n**Our standard:** 3 years.\n\n## Market Standard\nTwo to five years.\n';
const SHIPPED = {
  'knowledge/law/data-privacy/gdpr.md': GDPR,
  'knowledge/law/data-privacy/ccpa.md': CCPA,
  'knowledge/practice-seed/standards/confidentiality.md': CONF,
  'templates/memory/patterns.md': '# Patterns\n',
};

let vault: string;
let home: string;
let pluginRoot: string;
let source: ReturnType<typeof fakeSource>;

function plan() {
  return { vault, identity: { name: 'A', organization: 'B', role: 'solo' as const, jurisdiction: 'MA' }, practice: 'x', sampleMatter: false, git: false };
}

function deps(over: Partial<{ vaultRoot: string }> = {}) {
  return { vaultRoot: over.vaultRoot ?? vault, content: source, shippedVersion: '9.9.9', now: () => new Date('2026-09-01T12:00:00Z') };
}

function setConfig(extra: string): void {
  writeFileSync(join(vault, 'config.md'), `counsel-os-config: true\nlegal_root: ${vault}\n${extra}`, 'utf8');
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'update-vault-'));
  home = mkdtempSync(join(tmpdir(), 'update-home-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'update-plugin-'));
  source = fakeSource({ ...SHIPPED });
  runSetup(plan() as never, { content: source, home, pluginRoot, git: null });
});

describe('contentStatus — law', () => {
  test('a freshly seeded vault is current everywhere, with the version it received', () => {
    const status = contentStatus(deps());
    expect(status.vaultVersion).not.toBeNull();
    expect(status.shippedVersion).toBe('9.9.9');
    expect(status.counts['update-available']).toBe(0);
    expect(status.counts['user-modified']).toBe(0);
    expect(status.items.map(i => [i.path, i.status])).toEqual([
      ['law/data-privacy/ccpa.md', 'current'],
      ['law/data-privacy/gdpr.md', 'current'],
      ['practice/standards/confidentiality.md', 'current'],
    ]);
  });

  test('upstream changed, vault untouched → update-available, applicable', () => {
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR.replace('72 hours', '72 hours, without undue delay');
    const item = contentStatus(deps()).items.find(i => i.path === 'law/data-privacy/gdpr.md')!;
    expect(item.status).toBe('update-available');
    expect(item.applicable).toBe(true);
  });

  test('a content-version restamp with the same body is still current', () => {
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR.replace('2026-06-11"\nlast', '2026-09-01"\nlast');
    expect(contentStatus(deps()).items.find(i => i.path === 'law/data-privacy/gdpr.md')!.status).toBe('current');
  });

  test('the user edited the vault copy → user-modified (edited), never applicable, even when upstream also changed', () => {
    writeFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), GDPR + '\nMy note.\n', 'utf8');
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + '\nUpstream note.\n';
    const item = contentStatus(deps()).items.find(i => i.path === 'law/data-privacy/gdpr.md')!;
    expect(item.status).toBe('user-modified');
    expect(item.reason).toBe('edited');
    expect(item.applicable).toBe(false);
  });

  test('managed-by: user is user-owned whatever the hashes say', () => {
    writeFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), GDPR.replace('---\n# GDPR', 'managed-by: user\n---\n# GDPR'), 'utf8');
    const item = contentStatus(deps()).items.find(i => i.path === 'law/data-privacy/gdpr.md')!;
    expect(item.status).toBe('user-modified');
    expect(item.reason).toBe('managed-by');
  });

  test('law_management: user marks every law file user-owned and offers no adds', () => {
    setConfig('law_management: user\n');
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + 'x\n';
    source.files['knowledge/law/employment/flsa.md'] = '# FLSA\n';
    const status = contentStatus(deps());
    expect(status.lawManagement).toBe('user');
    for (const item of status.items.filter(i => i.group === 'law')) {
      expect(item.status).toBe('user-modified');
      expect(item.reason).toBe('law-management');
      expect(item.applicable).toBe(false);
    }
  });

  test('a shipped file the vault lacks is missing (an add); a vault-only file is vault-only', () => {
    source.files['knowledge/law/employment/flsa.md'] = '---\ncounsel-os-type: law-area\n---\n# FLSA\n';
    mkdirSync(join(vault, 'law', 'my-area'), { recursive: true });
    writeFileSync(join(vault, 'law', 'my-area', 'notes.md'), '# Mine\n', 'utf8');
    const status = contentStatus(deps());
    expect(status.items.find(i => i.path === 'law/employment/flsa.md')).toMatchObject({ status: 'missing', applicable: true, area: 'employment' });
    expect(status.items.find(i => i.path === 'law/my-area/notes.md')).toMatchObject({ status: 'vault-only', shipped: null, applicable: false });
  });

  test('no baseline (a vault set up before content-state) — a differing file is user-modified with no-baseline', () => {
    const bare = mkdtempSync(join(tmpdir(), 'update-bare-'));
    mkdirSync(join(bare, 'law', 'data-privacy'), { recursive: true });
    writeFileSync(join(bare, 'config.md'), `counsel-os-config: true\nlegal_root: ${bare}\n`, 'utf8');
    writeFileSync(join(bare, 'law', 'data-privacy', 'gdpr.md'), GDPR + 'edited\n', 'utf8');
    writeFileSync(join(bare, 'law', 'data-privacy', 'ccpa.md'), CCPA, 'utf8');
    const status = contentStatus(deps({ vaultRoot: bare }));
    expect(status.vaultVersion).toBeNull();
    expect(status.items.find(i => i.path === 'law/data-privacy/gdpr.md')).toMatchObject({ status: 'user-modified', reason: 'no-baseline' });
    expect(status.items.find(i => i.path === 'law/data-privacy/ccpa.md')!.status).toBe('current');
  });
});

describe('contentStatus — practice', () => {
  test('the user edited their standard and upstream did not move → current (never seed-vs-vault noise)', () => {
    writeFileSync(join(vault, 'practice', 'standards', 'confidentiality.md'), CONF.replace('3 years', '5 years'), 'utf8');
    expect(contentStatus(deps()).items.find(i => i.path === 'practice/standards/confidentiality.md')!.status).toBe('current');
  });

  test('upstream changed → upstream-changed, diffed against the RECEIVED snapshot, never applicable', () => {
    writeFileSync(join(vault, 'practice', 'standards', 'confidentiality.md'), CONF.replace('3 years', '5 years'), 'utf8');
    source.files['knowledge/practice-seed/standards/confidentiality.md'] = CONF.replace('Two to five years.', 'Two to five years; three is market.');
    const item = contentStatus(deps()).items.find(i => i.path === 'practice/standards/confidentiality.md')!;
    expect(item.status).toBe('upstream-changed');
    expect(item.applicable).toBe(false);
    expect(item.baseline).toBe('received');
    // The diff shows the upstream change only — the user's "5 years" edit is
    // not in it, because the baseline is what was received, not the vault.
    expect(item.diff).toContain('+Two to five years; three is market.');
    expect(item.diff).not.toContain('5 years');
  });

  test('a restamp (frontmatter only) is not an upstream change', () => {
    source.files['knowledge/practice-seed/standards/confidentiality.md'] = CONF.replace('2026-06-11', '2026-09-01');
    expect(contentStatus(deps()).items.find(i => i.path === 'practice/standards/confidentiality.md')!.status).toBe('current');
  });

  test('a missing practice file is offered as an add', () => {
    source.files['knowledge/practice-seed/standards/notices.md'] = '# Notices\n';
    expect(contentStatus(deps()).items.find(i => i.path === 'practice/standards/notices.md')).toMatchObject({ status: 'missing', applicable: true, group: 'practice' });
  });

  test('without a snapshot the diff falls back to the vault copy and says so', () => {
    const bare = mkdtempSync(join(tmpdir(), 'update-bare-'));
    mkdirSync(join(bare, 'practice', 'standards'), { recursive: true });
    writeFileSync(join(bare, 'config.md'), `counsel-os-config: true\nlegal_root: ${bare}\n`, 'utf8');
    writeFileSync(join(bare, 'practice', 'standards', 'confidentiality.md'), CONF.replace('3 years', '5 years'), 'utf8');
    const item = contentStatus(deps({ vaultRoot: bare })).items.find(i => i.path === 'practice/standards/confidentiality.md')!;
    expect(item.status).toBe('upstream-changed');
    expect(item.baseline).toBe('vault');
    expect(item.diff).toContain('(your copy)');
  });
});

describe('applyUpdates', () => {
  test('writes a law update and a missing file, records them as received, and is idempotent', () => {
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + 'Upstream.\n';
    source.files['knowledge/practice-seed/standards/notices.md'] = '# Notices\n';
    const first = applyUpdates(deps(), ['law/data-privacy/gdpr.md', 'practice/standards/notices.md']);
    expect(first.applied).toEqual(['law/data-privacy/gdpr.md', 'practice/standards/notices.md']);
    expect(readFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), 'utf8')).toBe(GDPR + 'Upstream.\n');
    expect(existsSync(join(vault, '.counsel', 'received', 'practice', 'standards', 'notices.md'))).toBe(true);
    const after = contentStatus(deps());
    expect(after.items.find(i => i.path === 'law/data-privacy/gdpr.md')!.status).toBe('current');
    expect(after.items.find(i => i.path === 'practice/standards/notices.md')!.status).toBe('current');
    expect(after.vaultVersion).toBe('9.9.9');
    expect(after.receivedAt).toBe('2026-09-01T12:00:00.000Z');
    expect(() => applyUpdates(deps(), ['law/data-privacy/gdpr.md'])).toThrow(UpdateError);
  });

  test('refuses a user-modified file, a practice upstream change, and an unknown path — writing nothing', () => {
    writeFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), GDPR + 'mine\n', 'utf8');
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + 'theirs\n';
    source.files['knowledge/law/data-privacy/ccpa.md'] = CCPA + 'new\n';
    source.files['knowledge/practice-seed/standards/confidentiality.md'] = CONF + 'more\n';
    for (const bad of ['law/data-privacy/gdpr.md', 'practice/standards/confidentiality.md', 'law/nope.md']) {
      expect(() => applyUpdates(deps(), ['law/data-privacy/ccpa.md', bad])).toThrow(UpdateError);
    }
    // The good path in the same call was not written either.
    expect(readFileSync(join(vault, 'law', 'data-privacy', 'ccpa.md'), 'utf8')).toBe(CCPA);
    expect(readFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), 'utf8')).toBe(GDPR + 'mine\n');
  });
});

describe('autoApplyLawUpdates', () => {
  test('off by default: nothing is written', () => {
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + 'Upstream.\n';
    expect(autoApplyLawUpdates(deps()).applied).toEqual([]);
    expect(readFileSync(join(vault, 'law', 'data-privacy', 'gdpr.md'), 'utf8')).toBe(GDPR);
  });

  test('on: applies law update-available only — never a user-modified file, never practice', () => {
    setConfig('auto_apply_law_updates: true\n');
    source.files['knowledge/law/data-privacy/gdpr.md'] = GDPR + 'Upstream.\n';
    source.files['knowledge/law/data-privacy/ccpa.md'] = CCPA + 'Upstream.\n';
    writeFileSync(join(vault, 'law', 'data-privacy', 'ccpa.md'), CCPA + 'mine\n', 'utf8');
    source.files['knowledge/practice-seed/standards/confidentiality.md'] = CONF + 'more\n';
    const result = autoApplyLawUpdates(deps());
    expect(result.applied).toEqual(['law/data-privacy/gdpr.md']);
    expect(readFileSync(join(vault, 'law', 'data-privacy', 'ccpa.md'), 'utf8')).toBe(CCPA + 'mine\n');
    expect(readFileSync(join(vault, 'practice', 'standards', 'confidentiality.md'), 'utf8')).toBe(CONF);
    // Idempotent: a second start applies nothing.
    expect(autoApplyLawUpdates(deps()).applied).toEqual([]);
  });
});
