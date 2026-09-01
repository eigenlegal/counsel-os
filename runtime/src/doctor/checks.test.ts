import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GitRunner } from '../setup/run';
import type { VaultConfig } from '../vault/resolve-root';
import {
  acceptBand,
  addMonths,
  checkConsistency,
  checkGit,
  checkLawCurrency,
  checkLawImpact,
  checkRootConfig,
  checkStructure,
  divergences,
  libraryBlocks,
  unitNumbers,
  type DoctorContext,
} from './checks';
import { renderReport, runDoctor, verdictOf } from './index';
import { parseLawPolicy } from './policy';

const POLICY = parseLawPolicy(JSON.stringify({ review_cadence_months: { default: 12, 'data-privacy': 6, employment: 6, corporate: 18 } }));
const NOW = new Date('2026-09-01T12:00:00Z');
const CFG: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' };

let vault: string;

function writeTo(root: string, rel: string, text: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, text, 'utf8');
}

function write(rel: string, text: string): void {
  writeTo(vault, rel, text);
}

function law(area: string, name: string, lastReviewed: string | null, extra = ''): void {
  write(`law/${area}/${name}.md`, `---\ncounsel-os-type: law-area\n${lastReviewed === null ? '' : `last-reviewed: "${lastReviewed}"\n`}${extra}---\n# ${name}\n`);
}

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
  return { vaultRoot: vault, cfg: CFG, policy: POLICY, now: NOW, git: null, ...over };
}

/** A complete, healthy vault. */
function seedHealthy(): void {
  write('config.md', `counsel-os-config: true\nlegal_root: ${vault}\n`);
  law('data-privacy', 'gdpr', '2026-06-11');
  law('employment', 'flsa', '2026-06-11');
  write('practice/standards/index.md', '# index\n');
  write('practice/standards/confidentiality.md', '---\ncounsel-os-type: practice\n---\n# Confidentiality — Position\n\n## Our Position\n**Our standard:** 3 years.\n**We\'ll accept:** 2 years to 5 years.\n\n## Market Standard\nx\n');
  write('practice/library/ip-and-confidentiality.md', '---\ncounsel-os-type: practice\n---\n# Library\n\n## Term\n\n### Standard\n> three (3) years\n\n### Minimum Acceptable\n> two (2) years\n');
  write('practice/methods/m.md', '# m\n');
  write('practice/reference/_index.md', '# r\n');
  write('practice/profile.md', '# profile\n');
  write('memory/patterns.md', '# p\n');
  mkdirSync(join(vault, 'matters'), { recursive: true });
  mkdirSync(join(vault, 'entities'), { recursive: true });
}

beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), 'doctor-'));
});

describe('root-config', () => {
  test('marked config pointing at itself is ok', () => {
    seedHealthy();
    expect(checkRootConfig(ctx()).severity).toBe('ok');
  });
  test('no config is an error; a copied config is a warning', () => {
    expect(checkRootConfig(ctx()).severity).toBe('error');
    write('config.md', 'counsel-os-config: true\nlegal_root: /somewhere/else\n');
    const f = checkRootConfig(ctx());
    expect(f.severity).toBe('warn');
    expect(f.message).toContain('/somewhere/else');
  });
});

describe('structure', () => {
  test('a complete vault is ok with counts, index.md excluded, empty matters/entities said plainly', () => {
    seedHealthy();
    const f = checkStructure(ctx());
    expect(f.severity).toBe('ok');
    expect(f.message).toContain('standards 1');
    expect(f.message).toContain('matters empty');
    expect(f.message).toContain('law 2');
  });
  test('missing law is an error; missing memory is a warning; overrides are honoured', () => {
    seedHealthy();
    const noLaw = ctx({ cfg: { ...CFG, mattersPath: 'deals' } });
    write('deals/x.md', '# x\n');
    const f1 = checkStructure(noLaw);
    expect(f1.severity).toBe('ok');
    expect(f1.message).toContain('matters@deals 1');
    const bare = mkdtempSync(join(tmpdir(), 'doctor-bare-'));
    writeTo(bare, 'practice/standards/a.md', '# a\n');
    const f2 = checkStructure({ ...ctx(), vaultRoot: bare });
    expect(f2.severity).toBe('error');
    expect(f2.message).toContain('law');
  });
});

describe('law-currency', () => {
  test('addMonths clamps to the month length like the Python', () => {
    expect(addMonths(new Date(Date.UTC(2026, 0, 31)), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(addMonths(new Date(Date.UTC(2026, 5, 11)), 6).toISOString().slice(0, 10)).toBe('2026-12-11');
    expect(addMonths(new Date(Date.UTC(2026, 10, 30)), 3).toISOString().slice(0, 10)).toBe('2027-02-28');
  });
  test('current when within the area cadence; stale and never-attested split by ownership', () => {
    seedHealthy();
    expect(checkLawCurrency(ctx()).severity).toBe('ok');
    law('data-privacy', 'ccpa', '2026-02-01'); // 6-month cadence → stale by Sep 1
    law('corporate', 'delaware', '2025-01-01', 'managed-by: user\n'); // user-owned, 18 months → stale
    law('my-area', 'notes', null); // custom area → user-owned, never attested
    const f = checkLawCurrency(ctx());
    expect(f.severity).toBe('warn');
    expect(f.message).toContain('2 stale');
    expect(f.message).toContain('1 never attested');
    expect(f.detail).toContain('2 user-owned');
    expect(f.detail).toContain('1 plugin-managed');
    expect(f.paths).toContain('law/data-privacy/ccpa.md');
    expect(f.fix).toContain('update-content');
  });
  test('law_management: user makes every file user-owned', () => {
    seedHealthy();
    law('data-privacy', 'ccpa', '2026-02-01');
    const f = checkLawCurrency(ctx({ cfg: { ...CFG, lawManagement: 'user' } }));
    expect(f.detail).toContain('1 user-owned');
    expect(f.fix).toBe('/counsel-os:law-refresh');
  });
});

describe('git', () => {
  function fakeGit(answers: Record<string, { ok: boolean; out: string }>): GitRunner {
    return args => answers[args.join(' ')] ?? { ok: false, out: '' };
  }
  test('no git binary, not a repo, no remote, too many uncommitted, healthy', () => {
    seedHealthy();
    expect(checkGit(ctx({ git: null })).message).toContain('not installed');
    expect(checkGit(ctx({ git: fakeGit({}) })).message).toContain('not a git repository');
    const base = { 'rev-parse --is-inside-work-tree': { ok: true, out: 'true\n' }, 'log -1 --format=%ci %h': { ok: true, out: '2026-08-30 abc123\n' } };
    const noRemote = checkGit(ctx({ git: fakeGit({ ...base, 'status --porcelain': { ok: true, out: '' }, remote: { ok: true, out: '' } }) }));
    expect(noRemote.severity).toBe('warn');
    expect(noRemote.detail).toContain('PRIVATE');
    const dirty = checkGit(ctx({ git: fakeGit({ ...base, 'status --porcelain': { ok: true, out: Array(25).fill(' M x').join('\n') }, remote: { ok: true, out: 'origin\n' } }) }));
    expect(dirty.severity).toBe('warn');
    expect(dirty.message).toContain('25 uncommitted');
    const fine = checkGit(ctx({ git: fakeGit({ ...base, 'status --porcelain': { ok: true, out: ' M a\n' }, remote: { ok: true, out: 'origin\n' } }) }));
    expect(fine.severity).toBe('ok');
    expect(fine.message).toBe('repo · remote origin · 1 uncommitted · last commit 2026-08-30 abc123');
  });
});

describe('consistency', () => {
  test('numbers with units are read from the accept band and the Minimum Acceptable blocks', () => {
    const standard = '## Our Position\n**Our standard:** Breach notification within 72 hours.\n**We\'ll accept:** 72-96 hours, 14 days notice.\n**We won\'t accept:** 200 hours.\n\n## Market\n1 hour.\n';
    expect(acceptBand(standard)).not.toContain('200 hours');
    expect([...unitNumbers(acceptBand(standard)).entries()]).toEqual([
      ['hours', [72, 96]],
      ['days', [14]],
    ]);
    const library = '## Breach\n\n### Standard\n> seventy-two (72) hours\n\n### Minimum Acceptable\n> one hundred twenty (120) hours\n\n## Notice\n\n### Minimum Acceptable\n> ten (10) days\n';
    expect(unitNumbers(libraryBlocks(library, 'Minimum Acceptable')).get('hours')).toEqual([120]);
    const found = divergences('data-protection', standard, library, 's', 'l');
    expect(found.map(d => [d.unit, d.library])).toEqual([
      ['hours', 120],
      ['days', 10],
    ]);
  });
  test('a matching pair is ok; a divergent minimum is a warning with both numbers', () => {
    seedHealthy();
    const ok = checkConsistency(ctx());
    expect(ok.severity).toBe('ok');
    expect(ok.message).toContain('1 standard/library pairs');
    write('practice/library/ip-and-confidentiality.md', '# Library\n\n## Term\n\n### Standard\n> three (3) years\n\n### Minimum Acceptable\n> one (1) year\n');
    const warn = checkConsistency(ctx());
    expect(warn.severity).toBe('warn');
    expect(warn.detail).toContain('confidentiality: standard accepts 2–5 years, library Minimum Acceptable says 1 years');
    expect(warn.detail).toContain('law floors are not compared mechanically');
  });
});

describe('law-impact', () => {
  test('an open matter updated before its law area was reviewed is behind; closed and current matters are not', () => {
    seedHealthy();
    law('data-privacy', 'gdpr', '2026-08-15');
    write('matters/2026-06-acme.md', '---\ncounsel-os-type: matter\nstage: working\nupdated: 2026-07-01\nlaw_areas: [data-privacy]\n---\n# Acme — DPA\n');
    write('matters/2026-05-beta.md', '---\nstage: working\nupdated: 2026-08-20\n---\n# Beta\n\n- **Law areas:** data-privacy, employment\n');
    write('matters/2026-04-closed.md', '---\nstage: closed\nupdated: 2026-01-01\nlaw_areas: [data-privacy]\n---\n# Old\n');
    write('matters/folder/matter.md', '---\nstage: intake\nupdated: 2026-07-01\n---\n# Folder\n\n- **Law areas:** law/data-privacy\n');
    const f = checkLawImpact(ctx());
    expect(f.severity).toBe('warn');
    expect(f.paths).toEqual(['matters/2026-06-acme.md', 'matters/folder/matter.md']);
    expect(f.detail).toContain('Acme — DPA (updated 2026-07-01) — law/data-privacy refreshed 2026-08-15');
  });
  test('no open matters, or none behind, is ok', () => {
    seedHealthy();
    expect(checkLawImpact(ctx()).message).toBe('no open matters');
    write('matters/x.md', '---\nstage: working\nupdated: 2026-08-30\nlaw_areas: [data-privacy]\n---\n# X\n');
    expect(checkLawImpact(ctx()).severity).toBe('ok');
  });
});

describe('runDoctor + verdict', () => {
  test('a healthy vault is healthy; one warning names the check; an error is broken', () => {
    seedHealthy();
    const report = runDoctor({ vaultRoot: vault, pluginRoot: '/nowhere', policy: POLICY, git: null, now: () => NOW });
    expect(report.findings.map(f => f.check)).toEqual(['root-config', 'structure', 'law-currency', 'git', 'consistency', 'law-impact']);
    // git: null is the one warning on this seeded vault.
    expect(report.verdict).toBe('warnings');
    expect(report.summary).toContain('git');
    expect(renderReport(report)).toContain('Verdict:');
    expect(verdictOf([{ check: 'x', severity: 'error', message: 'no config.md', fix: 'init' }]).summary).toBe('broken: no config.md — init');
    expect(verdictOf([{ check: 'x', severity: 'ok', message: 'fine' }]).verdict).toBe('healthy');
  });
});
